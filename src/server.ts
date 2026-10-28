import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse
} from '@angular/ssr/node';
import express, { Request, Response } from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { GoogleGenAI } from '@google/genai';

const app = express();
app.use(express.json({ limit: '10mb' }));

function isValidApiKey(key: unknown): key is string {
  if (typeof key !== 'string') return false;
  const trimmed = key.trim();
  if (!trimmed) return false;
  if (
    trimmed === 'undefined' ||
    trimmed === 'null' ||
    trimmed === 'NaN' ||
    trimmed === '[object Object]' ||
    trimmed === 'YOUR_API_KEY'
  ) {
    return false;
  }
  return trimmed.length >= 15;
}

// Helper to get GoogleGenAI client with key from request headers or process.env
function getAiClient(req?: Request): GoogleGenAI {
  if (typeof process.loadEnvFile === 'function') {
    try {
      process.loadEnvFile();
    } catch {}
  }

  const envGemini = process.env.GEMINI_API_KEY;
  const headerKey = req?.headers['x-gemini-api-key'] as string;
  const authKey = req?.headers['authorization']?.replace(/^Bearer\s+/i, '');
  const bodyKey = req?.body?.apiKey as string;
  const envApi = process.env.API_KEY;

  let apiKey = '';
  if (isValidApiKey(envGemini)) {
    apiKey = envGemini.trim();
  } else if (isValidApiKey(headerKey)) {
    apiKey = headerKey.trim();
  } else if (isValidApiKey(authKey)) {
    apiKey = authKey.trim();
  } else if (isValidApiKey(bodyKey)) {
    apiKey = bodyKey.trim();
  } else if (isValidApiKey(envApi)) {
    apiKey = envApi.trim();
  }

  if (!apiKey) {
    throw new Error('Falta la API KEY de Gemini. Por favor proporciona una clave válida en Google AI Studio o en las variables de entorno.');
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
}

function delay(ms: number): Promise<void> {
  return new Promise(res => setTimeout(res, ms));
}

function cleanWhatsAppText(text: string): string {
  if (!text) return '';
  let cleaned = text;
  // Eliminar encabezados markdown (# Título, ## Título)
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, '');
  // Eliminar negritas y cursivas de markdown (**palabra**, *palabra*, _palabra_)
  cleaned = cleaned.replace(/\*\*([^*\n]+)\*\*/g, '$1');
  cleaned = cleaned.replace(/\*([^*\n]+)\*/g, '$1');
  cleaned = cleaned.replace(/\*/g, '');
  cleaned = cleaned.replace(/_([^_\n]+)_/g, '$1');
  // Eliminar viñetas con guiones (- texto) o puntos (• texto)
  cleaned = cleaned.replace(/^[ \t]*[-•][ \t]+/gm, '');
  // Normalizar saltos de línea excesivos
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  return cleaned.trim();
}

// Default fallback trends
const DEFAULT_X_TRENDS = [
  { topic: 'México', hashtag: '#Mexico', category: 'Nacional', postsCount: '65.2K posts', summary: 'Conversación nacional sobre coyuntura política y económica' },
  { topic: 'Claudia Sheinbaum', hashtag: '#Sheinbaum', category: 'Política', postsCount: '58.4K posts', summary: 'Conferencia matutina y proyectos prioritarios del gobierno' },
  { topic: 'Reforma Judicial', hashtag: '#ReformaJudicial', category: 'Política · Leyes', postsCount: '36.1K posts', summary: 'Proceso de elección popular en el Poder Judicial' },
  { topic: 'Economía y Finanzas', hashtag: '#Economia', category: 'Finanzas', postsCount: '29.3K posts', summary: 'Inflación, tasa de interés de Banxico y poder adquisitivo' },
  { topic: 'Aranceles y Comercio', hashtag: '#Aranceles', category: 'Comercio Exterior', postsCount: '25.8K posts', summary: 'Comercio internacional, acuerdos del T-MEC y política aduanera' },
  { topic: 'Inteligencia Artificial', hashtag: '#InteligenciaArtificial', category: 'Tecnología', postsCount: '44.9K posts', summary: 'Nuevos modelos generativos, chips y regulación digital' },
  { topic: 'Estados Unidos', hashtag: '#EEUU', category: 'Internacional', postsCount: '38.2K posts', summary: 'Decisiones de la Casa Blanca y relaciones bilaterales con México' },
  { topic: 'China', hashtag: '#China', category: 'Geopolítica', postsCount: '31.5K posts', summary: 'Manufactura, autos eléctricos, tecnología y comercio global' },
  { topic: 'Tipo de Cambio Dólar', hashtag: '#Dolar', category: 'Mercados', postsCount: '21.0K posts', summary: 'Fluctuación del peso mexicano en mercados de divisas' },
  { topic: 'Entendiendo Cosas', hashtag: '#EntendiendoCosas', category: 'Canal Oficial', postsCount: 'Comunidad', summary: 'Comunidad de periodismo y divulgación ciudadana de bolsillo' }
];

// 1. API: GENERAR NOTICIAS (WHATSAPP + X + PROMPTS)
app.post('/api/gemini/generate-news', async (req: Request, res: Response): Promise<void> => {
  try {
    const ai = getAiClient(req);
    const { topics = [], customQuery = '', activeXTrends = [] } = req.body;

    const expandedTopics = (topics as string[]).map(t => {
      if (t === 'China Tech') {
        return 'Empresas Tecnológicas Chinas: Tencent, Alibaba Group, ByteDance, Huawei, Xiaomi, Baidu, JD.com, Meituan, PDD Holdings (Pinduoduo), BYD, Lenovo, NetEase, DJI, CATL, NIO, ZTE, SMIC, Hikvision, Kuaishou, XPeng';
      }
      if (t === 'Estados Unidos Tech') {
        return 'Empresas Tecnológicas de EE.UU.: Apple, Microsoft, NVIDIA, Alphabet (Google), Amazon, Meta (Facebook), Tesla, Broadcom, Oracle, AMD, Adobe, Salesforce, Cisco, Intel, Qualcomm, IBM, Netflix, PayPal, Intuit, Uber, Airbnb, Micron Technology, Palantir';
      }
      if (t === 'Europa Tech') {
        return 'Empresas Tecnológicas de Europa: ASML, SAP, Spotify, Accenture, Capgemini, Adyen, Dassault Systèmes, Infineon Technologies, STMicroelectronics, Amadeus, Nokia, Ericsson, Logitech, Hexagon, Siemens, Sage Group, Just Eat Takeaway, Wise, Revolut, Klarna, Booking.com (Booking Holdings)';
      }
      if (t === 'Latinoamérica Tech') {
        return 'Empresas Tecnológicas de Latinoamérica: Mercado Libre, Nubank, Globant, TOTVS, Rappi, dLocal, PagSeguro, StoneCo, Vtex, Softtek, KAVAK, Stefanini, Despegar, Inter, Ualá, Creditas, Clip, Bitso, Neoris';
      }
      if (t === 'Corea del Sur Tech') {
        return 'Empresas Tecnológicas de Corea del Sur: Samsung Electronics, SK Hynix, LG Electronics, Naver, Kakao, Coupang, NCSoft, Krafton, Samsung SDI, LG Display, Netmarble, Pearl Abyss, KT Corporation, SK Telecom';
      }
      if (t === 'Japón Tech') {
        return 'Empresas Tecnológicas de Japón: Sony Group, Nintendo, SoftBank Group, Keyence, Tokyo Electron, Canon, Panasonic, Fujitsu, Rakuten Group, Renesas Electronics, NEC, Hitachi, Murata Manufacturing, Capcom, Square Enix, TDK, Kyocera, Nikon';
      }
      if (t === 'Rusia Tech') {
        return 'Empresas Tecnológicas de Rusia: Yandex, VK (VKontakte), Kaspersky Lab, Ozon, Wildberries, Rostelecom, MTS, Positive Technologies, 1C Company, Avito, Softline, Astra Linux';
      }
      if (t === 'Taiwán Tech') {
        return 'Empresas Tecnológicas de Taiwán: TSMC, Foxconn (Hon Hai Precision), MediaTek, ASUS, Acer, Delta Electronics, UMC, ASE Technology, Realtek, Quanta Computer, Pegatron, Wistron, Novatek, Nanya Technology, HTC, MSI, Gigabyte';
      }
      if (t === 'Singapur Tech') {
        return 'Empresas Tecnológicas de Singapur: Sea Limited (Shopee/Garena), Grab, Razer, Flex, Singtel, Carousell, PropertyGuru, Trax, Nanofilm Technologies, Venture Corporation, Dyson (Sede Global), Coda Payments, Acronis';
      }
      if (t === 'África Tech') {
        return 'Empresas Tecnológicas de África: Naspers, Prosus, MTN Group, Vodacom, Safaricom, Jumia, Fawry, Flutterwave, Interswitch, OPay, Chipper Cash, Andela, Liquid Intelligent Technologies, Takealot';
      }
      return t;
    });

    const topicsString = expandedTopics.length > 0 ? expandedTopics.join(', ') : 'Temas Generales';
    const isUrl = customQuery ? /^(http|https):\/\/[^ "]+$/.test(customQuery.trim()) : false;

    let focusInstruction = '';
    let searchContext = '';

    if (isUrl) {
      focusInstruction = `
        🔴 MODO ANÁLISIS DE URL ACTIVO.
        El usuario ha proporcionado este ENLACE: "${customQuery}".
        TU TAREA ÚNICA: Accede al contenido de ese enlace (o busca información sobre esa URL específica usando Google Search si no puedes leerlo directamente) y REESCRIBE esa noticia siguiendo el formato editorial.
        IGNORA los temas seleccionados si no tienen relación con el enlace.
      `;
      searchContext = `Analiza a profundidad el contenido del enlace: ${customQuery}`;
    } else {
      focusInstruction = customQuery ? `FOCUS ESPECÍFICO OBLIGATORIO EN: "${customQuery}"` : '';
      searchContext = `Busca en Google las noticias más recientes e impactantes de HOY. Temas: ${topicsString}. ${focusInstruction}`;
    }

    const whatsappEditorialRules = `
      ERES EL GUIONISTA DE «ENTENDIENDO COSAS».
      Conviertes una investigación en una nota corta para el canal de WhatsApp. Escribes para gente que trabaja en fábrica, obra o mostrador. No eres un medio: eres un vecino listo que explica lo que pasa y por qué le importa al bolsillo.

      MATERIAL DE ENTRADA: Hechos, fuentes y cifras verificadas. Si algo no está verificado, no lo inventes: márcalo como versión, con esas palabras explícitas ("versión").

      FORMATO (REGLAS DURAS INNEGOCIABLES):
      1. Extensión: 250 a 350 palabras obligatorias.
      2. Pirámide invertida: el remate va en el PRIMER renglón tras el título.
      3. Estructura exacta en este orden:
         - Renglón 1: Título con UN SOLO emoji al inicio (máximo 7 palabras + emoji). Promete beneficio o dolor. Clickbait permitido si el cuerpo cumple.
         - Renglón 2: Salto de línea y luego el Golpe (1-2 líneas con el remate directo de la noticia).
         - Párrafos intermedios: 3-4 párrafos de 2-3 líneas cada uno. (En temas de leyes o reformas, el primer bloque aclara de inmediato: ¿ya es ley o no? ¿qué falta? Un dictamen no es ley).
         - Renglón de Dato Duro: Dato duro solo en su renglón independiente (ninguna cifra sola: qué es → a qué equivale → qué significa → a quién le pega).
         - Cierre de bolsillo: Exactamente 2 líneas conectando directamente con el bolsillo con la frase «¿y esto cómo nos toca?». Sin sermón.
         - Fuente: Una sola línea al final: medios + fecha (ej: Fuente: Reuters y El Economista, 27 de octubre de 2026).
      4. CERO MARKDOWN (TEXTO PLANO PURO):
         - ESTRICTAMENTE CERO MARKDOWN: NADA de asteriscos (** ni *), NADA de almohadillas (#), NADA de guiones (-) ni viñetas, NADA de tablas.
         - Todo en texto plano natural para WhatsApp.
      5. UN SOLO EMOJI EN TODA LA NOTA:
         - Exactamente UN SOLO emoji en toda la pieza, colocado únicamente al inicio del título. Cero emojis en el resto del cuerpo.
      6. Título:
         - Máximo 7 palabras + el emoji. Promete beneficio o dolor claro.

      VOZ:
      • Siempre plural («nosotros», «fíjense», «piénsenlo», «nos toca»). NUNCA singular («yo», «digo», «creo»).
      • Tono de plática con un vecino listo. Frases cortas. Cero groserías, cero spanglish, cero tecnicismos sin explicar.
      • Habla al oído, no al pizarrón.

      EL MÉTODO «HABLARLE AL OÍDO» (NUESTRA FIRMA):
      1. Primero la escena, después el concepto.
      2. Aterriza antes de nombrar (avisa que vas a explicar).
      3. La metáfora sirve a la idea: una sola imagen, corta y cotidiana.
      4. Cada cifra con su consecuencia.

      COMPRENSIÓN:
      Ninguna cifra entra sola: qué es → a qué equivale → qué significa → a quién le pega.

      VERIFICACIÓN:
      • Mínimo 2 fuentes independientes. Lee cuerpos, no titulares.
      • La versión no es un hecho. Meta ≠ realidad. Si no está confirmado, escribe la palabra "versión".
      • Si dudas, no se publica. Nunca inventes.

      LEYES (SI APLICA):
      Primer bloque: ¿ya es ley o no? ¿qué falta? Un dictamen no es ley.

      CIERRE:
      2 líneas conectando con el bolsillo: «¿y esto cómo nos toca?». Sin sermón.

      FUENTES:
      Una línea al final: medios + fecha.
    `;

    const systemPrompt = `
      Actúa como un editor experto de un canal de noticias de WhatsApp y de X (Twitter).
      
      OBJETIVO PRINCIPAL:
      Investigar, validar y generar contenido de alto impacto basado en la solicitud del usuario.
      
      CONTEXTO DE OPERACIÓN:
      ${focusInstruction}
      
      LÓGICA DE INVESTIGACIÓN:
      - Si es un ENLACE (URL): Extrae la información clave, verifica los hechos y transfórmalo al estilo del canal.
      - Si es BÚSQUEDA: Si hay un tema específico, esa es la prioridad. Si hay múltiples, busca intersecciones. Prioriza 'Última Hora'.
      
      HERRAMIENTA OBLIGATORIA:
      Usa Google Search para encontrar o validar la información cuando esté disponible.
      Si el usuario dio una URL, úsala como referencia principal y ponla en 'sourceUrl'.

      REGLAS DE ESTILO PARA WHATSAPP (CRÍTICO E INNEGOCIABLE):
      ${whatsappEditorialRules}
      
      REGLAS PARA RED SOCIAL X (TWITTER) - FORMATO Y ALGORITMO 2025/2026 (MÁXIMO ENGAGEMENT Y DWELL TIME):
      - El campo 'twitterBody' debe ser una pieza de divulgación inteligente, fresca y adictiva para leer, optimizada para cómo consume la gente en X hoy.
      - ESTRUCTURA VISUAL ESCANEABLE OBLIGATORIA (Cero bloques masivos de texto):
        1. LÍNEA 1 (EL GANCHO / HOOK): Comienza con una primera línea corta y demoledora (≤10 palabras) que detenga el scroll al instante. NUNCA comiences con fórmulas aburridas como "Hoy se anunció..." o "A continuación...".
        2. ESPACIO EN BLANCO Y RITMO (DWELL TIME): Divide el post en micro-párrafos de 1 a 2 oraciones máximo, separados por un renglón en blanco. La lectura debe sentirse ágil, limpia y visualmente placentera.
        3. LA TRADUCCIÓN A LA VIDA REAL: Explica qué está pasando sin tecnicismos engorrosos. Traduce los conceptos complejos a analogías del día a día, como un experto lúcido explicándole a un amigo inteligente.
        4. EL «POR QUÉ TE AFECTA A TI»: Conecta el tema directamente con el bolsillo, el futuro del trabajo o la vida cotidiana del lector.
        5. REMATE CON PREGUNTA ABIERTA (DETONADOR DE CONVERSACIÓN): Cierra SIEMPRE con una pregunta reflexiva o dilema abierto que invite a opinar.
      - TONO: Cercano, conversacional, con personalidad propia pero riguroso en los hechos.
      - EMOJIS: Máximo 1 o 2 emojis cálidos e integrados orgánicamente en el texto.
      
      REGLAS PARA HASHTAGS EN X (TWITTER) - MÁS COMPLETOS, VINCULADOS A PAÍSES Y TENDENCIAS:
      - El campo 'hashtags' debe incluir 5 a 8 hashtags altamente relevantes y específicos.
      - OBLIGATORIO (PAÍSES): Cuando se mencionen países o regiones, AGREGA SIEMPRE sus hashtags (ej: #Mexico #China #EEUU #Taiwan #Rusia).
      ${activeXTrends && activeXTrends.length > 0 ? `
      - VINCULACIÓN CON TENDENCIAS ACTIVAS EN X HOY:
        Las tendencias más calientes y comentadas hoy en X son:
        ${activeXTrends.join(', ')}
        REGLA DE CONEXIÓN OBLIGATORIA: Si 1 o 2 de estas tendencias del día guardan relación temática con la noticia, INCLÚYELAS en 'hashtags'.
      ` : ''}
      - Agrega también hashtags clave del tema específico y de la industria o tecnología.
      - Incluye al final el hashtag oficial de la comunidad: #EntendiendoCosas.
      - Todo en una sola línea de texto separada por espacios.

      REGLAS PARA EL PROMPT DE IMAGEN (ESTILO EDITORIAL "ENTENDIENDO COSAS" 4:3):
      - El campo 'imagePrompt' DEBE estar estrictamente en INGLÉS siguiendo con fidelidad la identidad visual:
        * FORMATO Y COMPOSICIÓN: Aspect ratio 4:3, high resolution, clear focal composition, legible on smartphone and desktop feeds.
        * ZONA SUPERIOR: The exact headline in large bold, elegant, impactful serif typography with generous margins. Natural line breaks, with a key phrase or word highlighted in vermilion red (#E34234) and the rest in sumi ink black.
        * ILUSTRACIÓN DOMINANTE: The illustration dominates the rest of the image. A clear conceptual visual metaphor of the core story using 2 to 4 key protagonist elements integrated into a single cohesive scene.
        * ESTÉTICA EDITORIAL JAPONESA VINTAGE:
          - Warm ivory background with subtle aged handcrafted paper texture.
          - Sumi ink black and vermilion red as dominant colors.
          - Conceptual collage combining vintage woodblock engravings, paper cutouts, and halftone vintage print photo-montage.
          - Fine linework, soft shadows, marked contrast, ample breathing room and negative space (no clutter).
        * ÚNICOS TEXTOS PERMITIDOS:
          1. The exact headline at the top (rendered only once).
          2. EXACTLY ONE SINGLE WATERMARK in the lower right corner directly on the ivory paper background: the website address "entendiendocosas.lat" MUST appear together on a SINGLE horizontal line (continuous website URL on one line, never broken into two lines, never stacked). It features two distinct colors: the word "entendiendo" in vibrant vermilion red (#E34234) immediately followed on the exact same line by "cosas.lat" in solid sumi ink black (#111111). Small, subtle serif typography printed directly on the background paper, NO dark container, NO black box behind the watermark.
          - CRITICAL ANTI-DUPLICATION RULE: Render this watermark EXACTLY ONCE. NEVER duplicate, clone, or stack the watermark. Do NOT print the website address twice.
          - STRICTLY NO OTHER TEXT.

      REGLAS PARA EL PROMPT DE VIDEO:
      - El campo 'videoPrompt' DEBE estar estrictamente en INGLÉS, diseñado para IAs de video (Runway, Pika, Sora).
      - Estilo: Cinematic, Motion-focused, con movimientos de cámara (drone shot, close up pan, time-lapse).
      
      FORMATO DE SALIDA (JSON ARRAY ÚNICAMENTE):
      [
        {
          "category": "Categoría",
          "title": "Título con 1 emoji inicial (≤7 palabras, beneficio o dolor)",
          "whatsappBody": "Nota de WhatsApp de 250 a 350 palabras en TEXTO PLANO PURO SIN MARKDOWN",
          "twitterBody": "Artículo de divulgación amigable para X",
          "hashtags": "#Tema1 #Tema2 #Pais1 #Pais2 #Industria #EntendiendoCosas",
          "imagePrompt": "Prompt de imagen en INGLÉS",
          "videoPrompt": "Prompt de VIDEO en INGLÉS con movimientos de cámara",
          "sourceUrl": "URL proporcionada o encontrada"
        }
      ]
    `;

    const userPrompt = `
      EJECUTA LA OPERACIÓN:
      ${searchContext}
      Genera ${isUrl ? '1 propuesta optimizada basada en el enlace' : '3 a 5 propuestas detalladas'}.
    `;

    const configsToTry = [
      { model: 'gemini-3.8-flash', disableSearch: false },
      { model: 'gemini-3.8-flash', disableSearch: true },
      { model: 'gemini-2.5-flash', disableSearch: false },
      { model: 'gemini-2.5-flash', disableSearch: true },
      { model: 'gemini-flash-latest', disableSearch: true },
      { model: 'gemini-3.1-flash-lite', disableSearch: true }
    ];

    let lastError: any = null;

    for (const currentConfig of configsToTry) {
      try {
        const config: any = {
          systemInstruction: systemPrompt,
          temperature: 0.85
        };

        if (!currentConfig.disableSearch) {
          config.tools = [{ googleSearch: {} }];
        } else {
          config.responseMimeType = 'application/json';
        }

        const response = await ai.models.generateContent({
          model: currentConfig.model,
          contents: userPrompt,
          config
        });

        let text = response.text || '';
        if (!text && response.candidates && response.candidates.length > 0) {
          const parts = response.candidates[0].content?.parts || [];
          const textParts = parts.filter((p: any) => p.text && !p.thought);
          text = textParts.length > 0 ? textParts.map((p: any) => p.text).join('\n') : parts.map((p: any) => p.text || '').join('\n');
        }

        if (!text || !text.trim()) {
          continue;
        }

        let jsonString = text.trim();
        const jsonMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          jsonString = jsonMatch[1].trim();
        }

        let parsedData: any = null;
        try {
          parsedData = JSON.parse(jsonString);
        } catch {
          const arrayStart = jsonString.indexOf('[');
          const arrayEnd = jsonString.lastIndexOf(']');
          if (arrayStart !== -1 && arrayEnd > arrayStart) {
            parsedData = JSON.parse(jsonString.substring(arrayStart, arrayEnd + 1));
          } else {
            const objStart = jsonString.indexOf('{');
            const objEnd = jsonString.lastIndexOf('}');
            if (objStart !== -1 && objEnd > objStart) {
              parsedData = [JSON.parse(jsonString.substring(objStart, objEnd + 1))];
            }
          }
        }

        if (parsedData) {
          if (!Array.isArray(parsedData) && typeof parsedData === 'object') {
            parsedData = [parsedData];
          }
          if (Array.isArray(parsedData) && parsedData.length > 0) {
            const cleanedNews = parsedData.map((item: any) => ({
              ...item,
              whatsappBody: cleanWhatsAppText(item.whatsappBody || '')
            }));
            res.json({ news: cleanedNews });
            return;
          }
        }
      } catch (err: any) {
        lastError = err;
        const msg = String(err?.message || err);
        if (msg.includes('429') || msg.includes('503') || msg.includes('RESOURCE_EXHAUSTED')) {
          await delay(1500);
        }
      }
    }

    res.status(500).json({ error: lastError?.message || 'No se pudo generar noticias con los modelos disponibles.' });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Error interno del servidor.' });
  }
});

// 2. API: OBTENER TENDENCIAS DE X
app.post('/api/gemini/trends', async (req: Request, res: Response): Promise<void> => {
  try {
    let ai: GoogleGenAI;
    try {
      ai = getAiClient(req);
    } catch {
      res.json({ trends: DEFAULT_X_TRENDS });
      return;
    }
    const { region = 'México' } = req.body;
    const today = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });

    const prompt = `Hoy es ${today}. Eres un analista de redes sociales especializado en X (antes Twitter).
Utiliza Google Search para identificar las 10 a 14 tendencias, temas de conversación más calientes y hashtags del día de hoy en X (Twitter) en ${region} y en español.
Investiga qué temas y hashtags están marcando la conversación actual en noticias, política, economía, empresas, sociedad y entretenimiento.

Para cada tendencia entrega:
- topic: El nombre exacto de la tendencia
- hashtag: El hashtag estándar para X que comience con # y sin espacios
- category: Categoría
- postsCount: Volumen estimado o menciones
- summary: Una frase corta (máximo 15 palabras) explicando por qué es tendencia hoy.

DEVUELVE ÚNICAMENTE UN ARRAY JSON con esta estructura exacta:
[
  {
    "topic": "Nombre del tema",
    "hashtag": "#Hashtag",
    "category": "Categoría",
    "postsCount": "XXK posts",
    "summary": "Breve explicación de 1 frase"
  }
]`;

    const modelsToTry = ['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-flash-latest'];
    for (const model of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: {
            tools: [{ googleSearch: {} }],
            temperature: 0.5
          }
        });

        let text = response.text || '';
        if (!text && response.candidates?.[0]?.content?.parts) {
          const parts = response.candidates[0].content.parts.filter((p: any) => p.text && !p.thought);
          text = parts.map((p: any) => p.text).join('\n');
        }

        if (text) {
          let cleanJson = text.trim();
          if (cleanJson.includes('```json')) {
            cleanJson = cleanJson.split('```json')[1].split('```')[0].trim();
          } else if (cleanJson.includes('```')) {
            cleanJson = cleanJson.split('```')[1].split('```')[0].trim();
          }

          const parsed = JSON.parse(cleanJson);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const mapped = parsed.map((item: any) => ({
              topic: String(item.topic || '').trim(),
              hashtag: item.hashtag?.startsWith('#') ? item.hashtag.trim() : `#${String(item.hashtag || item.topic || '').replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_]/g, '')}`,
              category: String(item.category || 'Tendencia').trim(),
              postsCount: String(item.postsCount || 'Tendencia').trim(),
              summary: String(item.summary || '').trim()
            }));
            res.json({ trends: mapped });
            return;
          }
        }
      } catch (err: any) {
        const errorMsg = String(err?.message || err || '');
        if (
          errorMsg.includes('API_KEY_INVALID') ||
          errorMsg.includes('API key not valid') ||
          errorMsg.includes('PERMISSION_DENIED') ||
          errorMsg.includes('INVALID_ARGUMENT')
        ) {
          res.json({ trends: DEFAULT_X_TRENDS });
          return;
        }
        console.warn(`Aviso buscando tendencias con ${model}:`, errorMsg);
      }
    }

    // Fallback a tendencias por defecto
    res.json({ trends: DEFAULT_X_TRENDS });
  } catch (err: any) {
    res.json({ trends: DEFAULT_X_TRENDS });
  }
});

// 3. API: AJUSTAR WHATSAPP
app.post('/api/gemini/adjust-whatsapp', async (req: Request, res: Response): Promise<void> => {
  try {
    const ai = getAiClient(req);
    const { currentText, action, contextTopic } = req.body;

    let actionInstructions = '';
    switch (action) {
      case 'version_b':
        actionInstructions = `Crea una VERSIÓN B completamente alternativa y fresca de esta misma investigación para «Entendiendo Cosas». Aborda el tema desde otro ángulo cotidiano con el método 'hablarle al oído'. Cambia la escena inicial y la metáfora, manteniendo rigurosamente 250-350 palabras, texto plano sin markdown, 1 solo emoji en el título, remate en el primer renglón y cierre de bolsillo.`;
        break;
      case 'shorter':
        actionInstructions = `Reescribe el texto ajustándolo hacia el límite inferior permitido (~250 palabras exactas), manteniendo el golpe inicial de 1-2 líneas, los 3-4 párrafos breves, el dato duro solo en su renglón y el cierre de bolsillo de 2 líneas con «¿y esto cómo nos toca?». Texto plano, cero markdown.`;
        break;
      case 'new_metaphor':
        actionInstructions = `Conserva todos los hechos y cifras verificadas, pero CAMBIA la metáfora o escena cotidiana que sirve a la idea por una imagen diferente del día a día (fábrica, camión, mostrador, casa) para aterrizar antes de nombrar. Texto plano, cero markdown, 250-350 palabras.`;
        break;
      case 'deep_dive_data':
        actionInstructions = `Reescribe la nota asegurando que ninguna cifra entre sola: qué es → a qué equivale → qué significa → a quién le pega. Pon el dato duro solo en su renglón y conecta con fuerza en el cierre de bolsillo de 2 líneas «¿y esto cómo nos toca?». Texto plano, cero markdown, 250-350 palabras.`;
        break;
      default:
        actionInstructions = `Optimiza el texto manteniendo el estilo riguroso de «Entendiendo Cosas».`;
    }

    const prompt = `
Eres el guionista de «Entendiendo Cosas». Conviertes una investigación en una nota corta para el canal de WhatsApp. Escribes para gente que trabaja en fábrica, obra o mostrador. No eres un medio: eres un vecino listo que explica lo que pasa y por qué le importa al bolsillo.

TEXTO ACTUAL DE REFERENCIA:
"""
${currentText}
"""

${contextTopic ? `TEMA: ${contextTopic}` : ''}

INSTRUCCIÓN DE AJUSTE:
${actionInstructions}

REGLAS DURAS OBLIGATORIAS:
1. Extensión: 250 a 350 palabras obligatorias.
2. Pirámide invertida: el remate va en el PRIMER renglón tras el título.
3. Estructura exacta: Título (≤7 palabras + 1 emoji) -> Golpe (1-2 líneas) -> 3-4 párrafos breves -> Dato duro independiente -> Cierre de bolsillo (2 líneas con «¿y esto cómo nos toca?») -> Fuente (1 línea).
4. CERO MARKDOWN: Sin **, sin *, sin #, sin viñetas con guiones (-), sin tablas. TEXTO PLANO PURO.
5. UN SOLO EMOJI en toda la nota (solo en el título).
6. VOZ: Siempre plural («nosotros», «fíjense», «nos toca»). Habla al oído, no al pizarrón.

Devuelve ÚNICAMENTE el texto final en texto plano.
`;

    const modelsToTry = ['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
    for (const model of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: { temperature: 0.8 }
        });
        const text = response.text?.trim() || '';
        if (text) {
          res.json({ text: cleanWhatsAppText(text) });
          return;
        }
      } catch (err: any) {
        console.warn(`Error ajustando WhatsApp con ${model}:`, err?.message || err);
      }
    }

    res.status(500).json({ error: 'No se pudo ajustar el texto de WhatsApp.' });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Error ajustando WhatsApp.' });
  }
});

// 4. API: AJUSTAR POST DE X (TWITTER)
app.post('/api/gemini/adjust-twitter', async (req: Request, res: Response): Promise<void> => {
  try {
    const ai = getAiClient(req);
    const { currentText, action, contextTopic } = req.body;

    let actionInstructions = '';
    switch (action) {
      case 'hook_viral':
        actionInstructions = `Convierte este post en una versión con GANCHO VIRAL de alto impacto:
- Línea 1 (≤8 palabras): Un gancho contundente, paradójico o revelador que detenga el scroll en seco.
- Micro-párrafos con espacio en blanco para maximizar el dwell time.
- Explicación cinematográfica y cotidiana del hecho.
- Cierra con una pregunta abierta e intrigante que invite al debate.`;
        break;
      case 'thread':
        actionInstructions = `Reestructura esta publicación en formato MINI-HILO de 3 partes para X (numerado 1/3, 2/3, 3/3):
1/3 [El Gancho y el hecho principal en 2 líneas]
2/3 [El trasfondo o dato clave con analogías cotidianas]
3/3 [El impacto y la pregunta de cierre para generar respuestas]
Separa cada parte con doble salto de línea claro.`;
        break;
      case 'debate':
        actionInstructions = `Reescribe el post enfocado al 100% como DETONADOR DE DEBATE Y CONVERSACIÓN:
- Plantea las dos caras de la moneda o la tensión principal del tema.
- Muestra por qué la gente está dividida sin tomar partido aburrido.
- Cierra con una pregunta directa y provocadora.`;
        break;
      case 'key_takeaways':
        actionInstructions = `Reestructura el post en formato "3 CLAVES EN 30 SEGUNDOS":
- Línea 1: Hook directo al grano.
- 3 puntos clave claros y concisos (usando • o viñetas limpias), traduciendo a lenguaje ciudadano.
- Línea final: Conclusión práctica + pregunta de cierre.`;
        break;
      default:
        actionInstructions = `Optimiza el post para máximo engagement en X.`;
    }

    const prompt = `
Eres un estratega editorial y creador de contenido de alto impacto en X (antes Twitter).
Conviertes noticias y análisis en publicaciones con altísima retención (dwell time) y alto volumen de respuestas (replies).

POST ACTUAL DE X DE REFERENCIA:
"""
${currentText}
"""

${contextTopic ? `TEMA O TITULAR: ${contextTopic}` : ''}

INSTRUCCIÓN DE REFORMATEO:
${actionInstructions}

REGLAS OBLIGATORIAS:
- Cero tecnicismos incomprensibles.
- Micro-párrafos con saltos de línea para que el texto respire y sea fácil de escanear.
- Máximo 1 o 2 emojis cálidos y orgánicos.
- NO agregues hashtags al cuerpo (los hashtags van en un bloque independiente).
- Entrega ÚNICAMENTE el texto final listo para publicar en X.
`;

    const modelsToTry = ['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
    for (const model of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: { temperature: 0.75 }
        });
        const text = response.text?.trim() || '';
        if (text) {
          res.json({ text });
          return;
        }
      } catch (err: any) {
        console.warn(`Error reformateando post de X con ${model}:`, err?.message || err);
      }
    }

    res.status(500).json({ error: 'No se pudo generar el formato alternativo para X.' });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Error ajustando post de X.' });
  }
});

// 5. API: GENERAR PORTADA EDITORIAL (4:3)
app.post('/api/gemini/generate-cover', async (req: Request, res: Response): Promise<void> => {
  try {
    const ai = getAiClient(req);
    const { imagePrompt, title = '', category = '' } = req.body;

    let cleanPrompt = (imagePrompt || '').trim();
    cleanPrompt = cleanPrompt
      .replace(/Watermark[:\s][^.]*\./gi, '')
      .replace(/Watermark in (the )?(bottom|lower) right corner[^.]*\./gi, '')
      .replace(/(The )?discreet watermark[^.]*\./gi, '')
      .replace(/the website (address|domain) ["']?entendiendocosas\.lat["']?[^.]*\./gi, '')
      .replace(/["']?entendiendocosas\.lat["']?[^.]*\./gi, '')
      .replace(/CRITICAL ANTI-DUPLICATION RULE:[^.]*\./gi, '')
      .replace(/STRICT ANTI-DUPLICATION RULE:[^.]*\./gi, '')
      .replace(/STRICT ANTI-DUPLICATION:[^.]*\./gi, '')
      .replace(/Only allowed texts:[^.]*\./gi, '')
      .trim();

    if (cleanPrompt && !cleanPrompt.endsWith('.')) {
      cleanPrompt += '.';
    }

    let styleSupplement = '';
    const lowerClean = cleanPrompt.toLowerCase();
    if (!lowerClean.includes('japanese vintage editorial') && !lowerClean.includes('warm ivory')) {
      styleSupplement = ' 4:3 aspect ratio editorial image for Entendiendo Cosas on WhatsApp and X. Japanese vintage editorial aesthetic, warm ivory subtle aged handcrafted paper texture, sumi ink black and vermilion red accents, conceptual collage of woodblock engravings, paper cutouts and halftone photo-montage with vintage print finish, high resolution, ample breathing room and negative space, clean composition.';
    }

    const singleWatermarkRule = ' Watermark: Render EXACTLY ONE single instance of the website address "entendiendocosas.lat" in the lower right corner on a single horizontal line directly on the ivory paper background, with "entendiendo" in vibrant vermilion red (#E34234) immediately followed on the exact same line by "cosas.lat" in solid sumi ink black (#111111). STRICT ANTI-DUPLICATION RULE: Render this watermark ONLY ONCE. NEVER duplicate, repeat, clone, or stack two watermarks. There must be exactly ONE occurrence of "entendiendocosas.lat" on the entire image. NO black banner or dark box behind the watermark.';

    const fullPrompt = `${cleanPrompt}${styleSupplement}${singleWatermarkRule}`.trim();

    // 1. Modelo Principal: Nano Banana 2.1 (4:3)
    try {
      console.log('Iniciando generación en servidor con Nano Banana 2.1...');
      const response = await ai.models.generateContent({
        model: 'gemini-nano-banana-2.1',
        contents: {
          parts: [{ text: fullPrompt }]
        },
        config: {
          imageConfig: {
            aspectRatio: '4:3',
            imageSize: '1K'
          }
        }
      });

      for (const candidate of response.candidates || []) {
        for (const part of candidate.content?.parts || []) {
          if (part.inlineData?.data) {
            res.json({
              imageUrl: `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`
            });
            return;
          }
        }
      }
    } catch (err: any) {
      console.warn('Nano Banana 2.1 no disponible en servidor:', err?.message || err);
    }

    // 2. Fallback: Nano Banana Lite (4:3)
    try {
      console.log('Intentando fallback en servidor con Nano Banana Lite (gemini-3.1-flash-lite-image)...');
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-image',
        contents: {
          parts: [{ text: fullPrompt }]
        },
        config: {
          imageConfig: {
            aspectRatio: '4:3'
          }
        }
      });

      for (const candidate of response.candidates || []) {
        for (const part of candidate.content?.parts || []) {
          if (part.inlineData?.data) {
            res.json({
              imageUrl: `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`
            });
            return;
          }
        }
      }
    } catch (err: any) {
      console.warn('gemini-3.1-flash-lite-image no disponible en servidor:', err?.message || err);
    }

    // Si los modelos de pago de imagen no están disponibles en la key, indicamos que se use el lienzo fallback local
    res.json({
      fallbackNeeded: true,
      error: 'Modelos de imagen no disponibles. Activando póster editorial de alta fidelidad.'
    });
  } catch (err: any) {
    res.json({
      fallbackNeeded: true,
      error: err?.message || 'Error en servidor generando imagen.'
    });
  }
});

// Servir archivos estáticos del navegador para producción
const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');
app.use(express.static(browserDistFolder, {
  maxAge: '1y',
  index: false,
  redirect: false
}));

// Angular SSR catch-all
import { AngularAppEngine } from '@angular/ssr';
AngularAppEngine.ɵdisableAllowedHostsCheck = true;
const angularNodeAppEngine = new AngularNodeAppEngine();
app.use((req, res, next) => {
  angularNodeAppEngine
    .handle(req)
    .then(response => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});

// Start listening if executed directly (e.g. npm start / node server.ts)
if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 3000;
  app.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

export default createNodeRequestHandler(app);
export const reqHandler = createNodeRequestHandler(app);
