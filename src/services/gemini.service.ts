
import { Injectable } from '@angular/core';
import { GoogleGenAI, Type } from '@google/genai';

// Declare process for TypeScript
declare const process: any;

export interface XTrend {
  topic: string;
  hashtag: string;
  category: string;
  postsCount: string;
  summary: string;
}

export const DEFAULT_X_TRENDS: XTrend[] = [
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

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private ai: GoogleGenAI | null = null;
  private isSearchSupported = true;

  // ==================================================================================
  // 👇👇👇 PEGA TU API KEY AQUÍ ABAJO (DENTRO DE LAS COMILLAS) PARA ARREGLARLO 👇👇👇
  // ==================================================================================
  private readonly MANUAL_API_KEY = ''; 
  // ==================================================================================

  constructor() {}

  private getAiClient(): GoogleGenAI {
    if (this.ai) {
      return this.ai;
    }

    let apiKey = '';

    // Preferred way for Angular apps in this environment
    try {
      apiKey = (window as any).GEMINI_API_KEY || (process as any).env?.GEMINI_API_KEY || '';
    } catch (e) {}

    if (!apiKey) {
      apiKey = this.MANUAL_API_KEY;
    }

    if (!apiKey) {
      console.error('❌ ERROR CRÍTICO: No hay API KEY.');
      throw new Error(
        'Falta la API KEY. Por favor, asegúrate de que la variable GEMINI_API_KEY esté configurada en el entorno.'
      );
    }
    
    this.ai = new GoogleGenAI({ apiKey });
    return this.ai;
  }

  // Helper function to wait
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async generateNewsContent(topics: string[], customQuery?: string, activeXTrends: string[] = []): Promise<any[]> {
    this.isSearchSupported = true;
    const modelId = 'gemini-2.5-flash';
    
    // Expand Tech Regions into their constituents for better search context
    const expandedTopics = topics.map(t => {
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
    
    // Check if customQuery is a URL
    const isUrl = customQuery ? /^(http|https):\/\/[^ "]+$/.test(customQuery.trim()) : false;
    
    let focusInstruction = '';
    let searchContext = '';

    if (isUrl) {
      // MODE: URL ANALYSIS
      focusInstruction = `
        🔴 MODO ANÁLISIS DE URL ACTIVO.
        El usuario ha proporcionado este ENLACE: "${customQuery}".
        TU TAREA ÚNICA: Accede al contenido de ese enlace (o busca información sobre esa URL específica usando Google Search si no puedes leerlo directamente) y REESCRIBE esa noticia siguiendo el formato editorial.
        IGNORA los temas seleccionados si no tienen relación con el enlace.
      `;
      searchContext = `Analiza a profundidad el contenido del enlace: ${customQuery}`;
    } else {
      // MODE: TOPIC SEARCH
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
         - Fuente: Una sola línea al final: medios + fecha (ej: Fuente: Reuters y El Economista, 6 de octubre de 2026).
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
        1. LÍNEA 1 (EL GANCHO / HOOK): Comienza con una primera línea corta y demoledora (≤10 palabras) que detenga el scroll al instante. Puede ser una revelación inesperada, una paradoja, un dato que contradice el sentido común o una escena intrigante. NUNCA comiences con fórmulas aburridas como "Hoy se anunció..." o "A continuación...".
        2. ESPACIO EN BLANCO Y RITMO (DWELL TIME): Divide el post en micro-párrafos de 1 a 2 oraciones máximo, separados por un renglón en blanco. La lectura debe sentirse ágil, limpia y visualmente placentera.
        3. LA TRADUCCIÓN A LA VIDA REAL: Explica qué está pasando sin tecnicismos engorrosos. Traduce los conceptos complejos a analogías del día a día, como un experto lúcido explicándole a un amigo inteligente.
        4. EL «POR QUÉ TE AFECTA A TI»: Conecta el tema directamente con el bolsillo, el futuro del trabajo o la vida cotidiana del lector.
        5. REMATE CON PREGUNTA ABIERTA (DETONADOR DE CONVERSACIÓN): El algoritmo de X prioriza brutalmente los posts que generan respuestas (replies valen >50x más que un like). Cierra SIEMPRE con una pregunta reflexiva, picante o dilema abierto que invite a opinar (ej: "¿Tú pagarías por algo así?", "¿Crees que esto nos beneficia o nos va a salir más caro?", "¿Cómo lo ves tú?").
      - TONO: Cercano, conversacional, con personalidad propia pero riguroso en los hechos.
      - EMOJIS: Máximo 1 o 2 emojis cálidos e integrados orgánicamente en el texto (no saturar).
      
      REGLAS PARA HASHTAGS EN X (TWITTER) - MÁS COMPLETOS, VINCULADOS A PAÍSES Y TENDENCIAS:
      - El campo 'hashtags' debe incluir una selección rica de 5 a 8 hashtags altamente relevantes y específicos a la noticia.
      - OBLIGATORIO (PAÍSES): Cuando en la noticia se mencionen o involucren países, naciones o regiones (ej. México, Estados Unidos / EEUU, China, Rusia, Taiwán, Japón, Corea, Ucrania, Alemania, etc.), AGREGA SIEMPRE los hashtags de todos los países de los que se habla (ej: #Mexico #China #EEUU #Taiwan #Rusia).
      ${activeXTrends && activeXTrends.length > 0 ? `
      - VINCULACIÓN CON TENDENCIAS ACTIVAS EN X HOY:
        Las tendencias más calientes y comentadas hoy en X son:
        ${activeXTrends.join(', ')}
        REGLA DE CONEXIÓN OBLIGATORIA: Si 1 o 2 de estas tendencias del día guardan relación temática, gancho o punto de contacto con la noticia (o con los países/sectores involucrados), INCLÚYELAS en el campo 'hashtags' para aprovechar la ola de tráfico y el algoritmo de X en tiempo real.
      ` : ''}
      - Agrega también hashtags clave del tema específico y de la industria o tecnología (ej: #InteligenciaArtificial #Semiconductores #Economia #Aranceles).
      - Incluye al final el hashtag oficial de la comunidad: #EntendiendoCosas.
      - Todo en una sola línea de texto con formato de hashtags estándar separados por espacios (ej: #Mexico #EEUU #Aranceles #Economia #Comercio #EntendiendoCosas).

      REGLAS PARA EL PROMPT DE IMAGEN (ESTILO EDITORIAL "ENTENDIENDO COSAS" 4:5):
      - El campo 'imagePrompt' DEBE estar estrictamente en INGLÉS pero siguiendo con fidelidad la identidad visual editorial de "ENTENDIENDO COSAS":
        * FORMATO Y COMPOSICIÓN: Vertical 4:5 aspect ratio, high resolution, legible on smartphone screens.
        * ZONA SUPERIOR: The exact headline in large bold, elegant, impactful serif typography with generous margins. Natural line breaks, with a key phrase or word highlighted in vermilion red (#E34234) and the rest in sumi ink black.
        * ILUSTRACIÓN DOMINANTE: The illustration dominates the rest of the image. A clear conceptual visual metaphor of the core story using 2 to 4 key protagonist elements integrated into a single cohesive scene.
        * ESTÉTICA EDITORIAL JAPONESA VINTAGE:
          - Warm ivory background with subtle aged handcrafted paper texture.
          - Sumi ink black and vermilion red as dominant colors.
          - Conceptual collage combining vintage woodblock engravings, paper cutouts, and halftone vintage print photo-montage.
          - Fine linework, soft shadows, marked contrast, ample breathing room and negative space (no clutter).
          - Avoid corporate templates, 3D renders, or infographical charts.
          - Subtle aesthetic Japanese influence: NO random temples, cherry blossoms, or flags unless pertinent to the topic.
        * ÚNICOS TEXTOS PERMITIDOS:
          1. The exact headline at the top (rendered only once).
          2. EXACTLY ONE SINGLE WATERMARK in the lower right corner directly on the ivory paper background: the website address "entendiendocosas.lat" MUST appear together on a SINGLE horizontal line (continuous website URL on one line, never broken into two lines, never stacked). It features two distinct colors: the word "entendiendo" in vibrant vermilion red (#E34234) immediately followed on the exact same line by "cosas.lat" in solid sumi ink black (#111111) ("entendiendo" strictly red, "cosas.lat" strictly black, unified as "entendiendocosas.lat"). Elegant, small, subtle serif typography printed directly on the background paper, NO dark container, NO black box behind the watermark.
          - CRITICAL ANTI-DUPLICATION RULE: Render this watermark EXACTLY ONCE. NEVER duplicate, clone, or stack the watermark. Do NOT print the website address twice.
          - STRICTLY NO OTHER TEXT: No brand header, no subtitles, no summary, no date, no category, no CTA buttons, no QR codes, no readable newspaper text.

      REGLAS PARA EL PROMPT DE VIDEO (NUEVO - DINÁMICO):
      - El campo 'videoPrompt' DEBE estar estrictamente en INGLÉS.
      - Diseñado para IAs de video (Runway, Pika, Sora).
      - Estilo: Cinematic, Motion-focused.
      - INCLUYE MOVIMIENTOS DE CÁMARA: "Slow motion drone shot establishing...", "Close up pan...", "Time-lapse of...".
      - Describe la acción y la atmósfera (ej: "chaotic atmosphere", "futuristic glow", "serious news setting").
      
      REGLAS TÉCNICAS JSON (MUY IMPORTANTE):
      - Tu respuesta DEBE ser un JSON válido parseable.
      - CUIDADO con las comillas dobles (") dentro del texto. SIEMPRE escápalas con contra-barra (\"). 
      - Usa comillas simples ('') dentro del texto preferiblemente.
      
      FORMATO DE SALIDA (JSON ARRAY ÚNICAMENTE):
      [
        {
          "category": "Categoría (Detectada automáticamente)",
          "title": "Título con 1 emoji inicial (≤7 palabras, beneficio o dolor)",
          "whatsappBody": "Nota de WhatsApp de 250 a 350 palabras en TEXTO PLANO PURO SIN MARKDOWN (sin *, **, #, tablas). Estructura estricta: Renglón 1 con Título de ≤7 palabras y UN SOLO emoji inicial -> Golpe de 1-2 líneas con el remate -> 3 a 4 párrafos de 2-3 líneas (si es sobre leyes/reformas, aclarar de entrada si ya es ley o no) -> Dato duro solo en su renglón independiente (con consecuencia y equivalencia) -> Cierre de bolsillo de 2 líneas con «¿y esto cómo nos toca?» -> Fuente al final en 1 sola línea (medios + fecha). Voz siempre plural ('nosotros', 'fíjense', 'nos toca'). Método 'hablarle al oído' para trabajador de fábrica, obra o mostrador.",
          "twitterBody": "Artículo de divulgación, amigable y explicativo en cristiano para X Premium",
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
      
      RECORDATORIO OBLIGATORIO PARA 'whatsappBody' (REGLAS DURAS «ENTENDIENDO COSAS»):
      1. EXTENSIÓN: Obligatoriamente entre 250 y 350 palabras.
      2. PIRÁMIDE INVERTIDA: El remate va en el PRIMER renglón (golpe de 1-2 líneas).
      3. ESTRUCTURA:
         - Renglón 1: Título con UN SOLO emoji (≤7 palabras + emoji). Promete beneficio o dolor.
         - Renglón 2: Golpe (1-2 líneas directas con el remate).
         - 3 a 4 párrafos de 2-3 líneas cada uno (primero la escena, después el concepto; aterriza antes de nombrar; una sola metáfora corta que sirve a la idea).
         - Si es reforma o ley: primer bloque aclara si ya es ley o no y qué falta (un dictamen no es ley).
         - Dato duro solo en su renglón independiente (qué es → a qué equivale → qué significa → a quién le pega). Si no está verificado, márcalo como versión con esa palabra.
         - Cierre de bolsillo: exactamente 2 líneas conectando con el dinero/familia («¿y esto cómo nos toca?»).
         - Fuente: una sola línea al final (medios + fecha).
      4. CERO MARKDOWN: Cero asteriscos (* o **), cero almohadillas (#), cero viñetas (-), cero tablas. Texto plano puro.
      5. UN SOLO EMOJI en toda la nota (solo en el título). Cero emojis en el cuerpo.
      6. VOZ PLURAL SIEMPRE («nosotros», «fíjense», «piénsenlo», «nos toca»). Habla al oído, no al pizarrón. Escribe para gente de fábrica, obra o mostrador. Cero groserías, cero spanglish, cero tecnicismos sin explicar.
      - Prohibido: 'Aquí está el pedo', 'para la raza' (usar 'para nosotros'), 'Tu Lente' (usar 'nuestro análisis').

      RECORDATORIO PARA 'hashtags' (PARA X / TWITTER):
      - 5 a 8 hashtags muy relacionados al contenido de la nota.
      - Si se habla de algún país o región, incluye OBLIGATORIAMENTE el hashtag de esos países (ej: #Mexico, #China, #EEUU, #Rusia, etc.).
      ${activeXTrends && activeXTrends.length > 0 ? `- VINCULACIÓN CON TENDENCIAS ACTIVAS EN X: Conecta la nota con 1 o 2 de las tendencias del día (${activeXTrends.slice(0, 8).join(', ')}) si guardan relación con el contenido para elevar su alcance.` : ''}
      - Agrega siempre al final #EntendiendoCosas.

      RECORDATORIO PARA 'imagePrompt' (IDENTIDAD EDITORIAL 'ENTENDIENDO COSAS' 4:5):
      - Redacta el prompt de imagen en INGLÉS detallando el estilo editorial de "ENTENDIENDO COSAS":
        * Vertical 4:5 aspect ratio editorial image for WhatsApp.
        * Japanese vintage editorial aesthetic: warm ivory aged handcrafted paper texture, sumi ink black and vermilion red accents.
        * Top area: The exact headline in large, elegant, bold serif typography, with one key word or phrase highlighted in vermilion red.
        * Dominant central illustration: Conceptual collage combining vintage woodblock engravings, paper cutouts, and halftone print photo-montage. Clear visual metaphor of 2 to 4 key elements integrated into one scene.
        * Clean composition, ample breathing room, no corporate templates or 3D rendering.
        * ONLY allowed texts: the exact headline at the top (only once), and EXACTLY ONE discreet watermark directly on the ivory paper background at the bottom right: the website domain "entendiendocosas.lat" written together on a SINGLE horizontal line (single line of text, never split into two lines, never stacked) with two distinct colors — the word "entendiendo" in vibrant vermilion red (#E34234) immediately followed on the same line by "cosas.lat" in solid sumi ink black (#111111) ("entendiendo" in red, "cosas.lat" in black). Small, elegant serif letters directly on the ivory background, NO dark container, NO black box behind it. CRITICAL: Render this watermark EXACTLY ONCE. Never generate multiple or stacked watermarks. No other headers, no subtitles, no QR codes.
    `;

    // Configuración robusta de reintentos con fallbacks de modelos reales soportados y herramientas
    const configsToTry: { model: string; disableSearch: boolean }[] = [];
    
    if (this.isSearchSupported) {
      configsToTry.push({ model: 'gemini-3.7-flash', disableSearch: false });
    }
    configsToTry.push({ model: 'gemini-3.7-flash', disableSearch: true });

    if (this.isSearchSupported) {
      configsToTry.push({ model: 'gemini-2.5-flash', disableSearch: false });
    }
    configsToTry.push({ model: 'gemini-2.5-flash', disableSearch: true });
    configsToTry.push({ model: 'gemini-flash-latest', disableSearch: true });
    configsToTry.push({ model: 'gemini-3.1-flash-lite', disableSearch: true });

    let configIndex = 0;
    let lastError: any = null;

    while (configIndex < configsToTry.length) {
      const currentConfig = configsToTry[configIndex];
      // Si la búsqueda ya fue detectada como no soportada durante este bucle, saltar intentos con búsqueda
      if (!this.isSearchSupported && !currentConfig.disableSearch) {
        configIndex++;
        continue;
      }

      const currentModelId = currentConfig.model;
      const disableSearch = currentConfig.disableSearch;

      try {
        const client = this.getAiClient();
        
        const config: any = {
          systemInstruction: systemPrompt,
          temperature: 0.85
        };

        // Only attach googleSearch tool if supported and search is not disabled
        if (!disableSearch) {
          config.tools = [{ googleSearch: {} }];
        } else {
          // When search is disabled, we can enforce JSON response format
          config.responseMimeType = 'application/json';
        }
        
        console.log(`Intentando generación (Intento ${configIndex + 1}/${configsToTry.length}) con modelo: ${currentModelId} (Herramientas activas: ${!disableSearch})`);
        
        const response = await client.models.generateContent({
          model: currentModelId,
          contents: userPrompt,
          config: config
        });

        // Robust text extraction from response
        let text = response.text || '';
        
        // If response.text is empty or undefined, look into candidates and parts
        if (!text && response.candidates && response.candidates.length > 0) {
          const parts = response.candidates[0].content?.parts || [];
          // Filter out thought parts if any
          const textParts = parts.filter((p: any) => p.text && !p.thought);
          if (textParts.length > 0) {
            text = textParts.map((p: any) => p.text).join('\n');
          } else {
            text = parts.map((p: any) => p.text || '').join('\n');
          }
        }

        if (!text || !text.trim()) {
          const finishReason = response.candidates?.[0]?.finishReason;
          if (finishReason === 'SAFETY' || finishReason === 'BLOCKLIST' || finishReason === 'PROHIBITED_CONTENT') {
            throw new Error(`La respuesta fue bloqueada por políticas de seguridad (${finishReason}).`);
          }
          throw new Error('La IA no generó texto en este intento.');
        }

        console.log('Respuesta RAW Gemini exitosa:', text); 

        // Limpieza y extracción del JSON
        let jsonString = text.trim();
        const jsonMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          jsonString = jsonMatch[1].trim();
        }

        let parsedData: any = null;

        try {
          parsedData = JSON.parse(jsonString);
        } catch (e) {
          console.warn('Error parseando JSON inicial, intentando método de recuperación:', e);
          
          // Try extracting array [...]
          const arrayStart = jsonString.indexOf('[');
          const arrayEnd = jsonString.lastIndexOf(']');
          if (arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart) {
            const cleanJson = jsonString.substring(arrayStart, arrayEnd + 1);
            parsedData = JSON.parse(cleanJson);
          } else {
            // Try extracting single object {...}
            const objStart = jsonString.indexOf('{');
            const objEnd = jsonString.lastIndexOf('}');
            if (objStart !== -1 && objEnd !== -1 && objEnd > objStart) {
              const cleanJson = jsonString.substring(objStart, objEnd + 1);
              parsedData = JSON.parse(cleanJson);
            }
          }
        }

        if (!parsedData) {
          throw new Error('No se pudo extraer JSON válido de la respuesta.');
        }

        // If the model returned a single object instead of an array, wrap it
        if (!Array.isArray(parsedData)) {
          if (typeof parsedData === 'object' && parsedData !== null) {
            parsedData = [parsedData];
          } else {
            throw new Error('El formato devuelto por la IA no es una lista de noticias válida.');
          }
        }

        // Apply cleaning and formatting rules to whatsappBody across all items
        return parsedData.map((item: any) => ({
          ...item,
          whatsappBody: this.cleanWhatsAppText(item.whatsappBody || '')
        }));

      } catch (error: any) {
        lastError = error;
        const errorStr = error.message || JSON.stringify(error) || '';
        
        // Si el error es de permisos o 403 y estábamos usando Google Search, desactivamos la búsqueda para siempre
        if (!disableSearch && (errorStr.includes('PERMISSION_DENIED') || errorStr.includes('403') || errorStr.includes('does not have permission'))) {
          console.warn('⚠️ Google Search Grounding no está disponible con esta API Key (403). Desactivando buscador para esta sesión...');
          this.isSearchSupported = false;
        }

        console.warn(`[Intento ${configIndex + 1}/${configsToTry.length}] Error con modelo ${currentModelId} (Search: ${!disableSearch}):`, errorStr);

        // Si hay cuota excedida (429) o error del servidor (503), esperamos un momento antes de continuar al siguiente fallback
        if (errorStr.includes('429') || errorStr.includes('503') || errorStr.includes('RESOURCE_EXHAUSTED')) {
           const waitTime = 2000;
           console.log(`Esperando ${waitTime}ms por límite de cuota o error temporal de servidor...`);
           await this.delay(waitTime);
        }

        configIndex++;
      }
    }

    console.error('Final error generating news después de todos los fallbacks:', lastError);
    throw lastError || new Error('No se pudo generar contenido con ningún modelo disponible.');
  }

  async generateAlternativeWhatsAppText(
    currentText: string,
    action: 'version_b' | 'shorter' | 'new_metaphor' | 'deep_dive_data',
    contextTopic?: string
  ): Promise<string> {
    const ai = this.getAiClient();

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

REGLAS DURAS OBLIGATORIAS (CUMPLE TODAS AL 100%):
1. Extensión: 250 a 350 palabras obligatorias.
2. Pirámide invertida: el remate va en el PRIMER renglón tras el título.
3. Estructura exacta:
   - Renglón 1: Título con UN SOLO emoji al inicio (≤7 palabras + emoji). Promete beneficio o dolor.
   - Renglón 2: Golpe (1-2 líneas con el remate).
   - 3 a 4 párrafos de 2-3 líneas cada uno (primero la escena, después el concepto; aterriza antes de nombrar). Si es ley: aclarar si ya es ley o qué falta (un dictamen no es ley).
   - Dato duro solo en su renglón (qué es → a qué equivale → qué significa → a quién le pega). Si no verificado: márcalo como versión.
   - Cierre de bolsillo: 2 líneas conectando con el bolsillo: «¿y esto cómo nos toca?». Sin sermón.
   - Fuente: Una sola línea al final (medios + fecha).
4. CERO MARKDOWN: Sin **, sin *, sin #, sin viñetas con guiones (-), sin tablas. TEXTO PLANO PURO.
5. UN SOLO EMOJI en toda la nota (solo en el título). Cero emojis en el cuerpo.
6. VOZ: Siempre plural («nosotros», «fíjense», «piénsenlo», «nos toca»). Habla al oído, no al pizarrón. Cero groserías, cero spanglish, cero tecnicismos sin explicar.
• Prohibido: 'Aquí está el pedo', 'para la raza' (usar 'para nosotros'), 'Tu Lente' (usar 'nuestro análisis').

Devuelve ÚNICAMENTE el texto final listo para enviar por WhatsApp en texto plano, sin explicaciones ni saludos previos.
`;

    const modelsToTry = ['gemini-2.5-flash', 'gemini-3.7-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: {
            temperature: 0.8
          }
        });

        const text = response.text?.trim() || '';
        if (text) {
          return this.cleanWhatsAppText(text);
        }
      } catch (err) {
        lastError = err;
        console.warn(`Error ajustando texto con modelo ${model}:`, err);
      }
    }

    throw lastError || new Error('No se pudo ajustar el texto de WhatsApp.');
  }

  async generateAlternativeTwitterText(
    currentText: string,
    action: 'hook_viral' | 'thread' | 'debate' | 'key_takeaways',
    contextTopic?: string
  ): Promise<string> {
    const ai = this.getAiClient();

    let actionInstructions = '';
    switch (action) {
      case 'hook_viral':
        actionInstructions = `Convierte este post en una versión con GANCHO VIRAL de alto impacto:
- Línea 1 (≤8 palabras): Un gancho contundente, paradójico o revelador que detenga el scroll en seco (sin fórmulas tipo "Hoy se anunció...").
- Micro-párrafos con espacio en blanco para maximizar el dwell time.
- Explicación cinematográfica y cotidiana del hecho.
- Cierra con una pregunta abierta e intrigante que obligue al lector a querer opinar.`;
        break;
      case 'thread':
        actionInstructions = `Reestructura esta publicación en formato MINI-HILO de 3 partes para X (numerado 1/3, 2/3, 3/3):
1/3 [El Gancho y el hecho principal en 2 líneas]: Presenta la escena y la sorpresa que detiene al lector.
2/3 [El trasfondo o dato clave]: Explica qué hay detrás con analogías cotidianas y cifras aterrizadas.
3/3 [El desenlace y la pregunta]: Explica cómo nos impacta a todos y cierra con una pregunta abierta para generar respuestas.
Separa cada parte con doble salto de línea claro.`;
        break;
      case 'debate':
        actionInstructions = `Reescribe el post enfocado al 100% como DETONADOR DE DEBATE Y CONVERSACIÓN (para explotar las respuestas en el algoritmo de X):
- Plantea las dos caras de la moneda o la tensión principal del tema.
- Explica brevemente la controversia sin tomar partido aburrido, mostrando por qué la gente está dividida.
- Cierra con una pregunta directa, provocadora y reflexiva (ej: "¿Tú de qué lado estás?", "¿Crees que esto nos beneficia o nos va a costar caro?").`;
        break;
      case 'key_takeaways':
        actionInstructions = `Reestructura el post en formato "3 CLAVES EN 30 SEGUNDOS" (lectura ultrarrápida):
- Línea 1: Hook directo al grano.
- 3 puntos clave claros y concisos (usando • o viñetas limpias), traduciendo el hecho a lenguaje ciudadano.
- Línea final: La conclusión práctica de bolsillo + pregunta de cierre.`;
        break;
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
- Entrega ÚNICAMENTE el texto final listo para publicar en X, sin explicaciones ni notas previas.
`;

    const modelsToTry = ['gemini-2.5-flash', 'gemini-3.7-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: {
            temperature: 0.75
          }
        });

        const text = response.text?.trim() || '';
        if (text) {
          return text;
        }
      } catch (err) {
        lastError = err;
        console.warn(`Error reformateando post de X con modelo ${model}:`, err);
      }
    }

    throw lastError || new Error('No se pudo generar el formato alternativo para X.');
  }

  async fetchXTrends(region: string = 'México'): Promise<XTrend[]> {
    const ai = this.getAiClient();
    const today = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });

    const prompt = `Hoy es ${today}. Eres un analista de redes sociales especializado en X (antes Twitter).
Utiliza Google Search para identificar las 10 a 14 tendencias, temas de conversación más calientes y hashtags del día de hoy en X (Twitter) en ${region} y en español.
Investiga qué temas y hashtags están marcando la conversación actual en noticias, política, economía, empresas, sociedad y entretenimiento.

Para cada tendencia entrega:
- topic: El nombre exacto de la tendencia (ej: "Reforma Judicial", "Claudia Sheinbaum", "Tipo de Cambio", "Aranceles", "Tesla")
- hashtag: El hashtag estándar para X que comience con # y sin espacios (ej: "#ReformaJudicial", "#Sheinbaum", "#Dolar", "#Aranceles", "#Mexico")
- category: Categoría (ej: "Política · Tendencia", "Economía", "Nacional", "Tecnología", "Internacional")
- postsCount: Volumen estimado o menciones si se conoce (ej: "45K posts", "28K posts" o "Tendencia")
- summary: Una frase corta (máximo 15 palabras) explicando por qué es tendencia hoy.

DEVUELVE ÚNICAMENTE UN ARRAY JSON con esta estructura exacta (sin markdown fuera del array, o dentro de un bloque json):
[
  {
    "topic": "Nombre del tema",
    "hashtag": "#Hashtag",
    "category": "Categoría",
    "postsCount": "XXK posts",
    "summary": "Breve explicación de 1 frase"
  }
]`;

    const modelsToTry = ['gemini-3.7-flash', 'gemini-2.5-flash', 'gemini-flash-latest'];
    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        console.log(`Buscando tendencias actuales en X con modelo ${model}...`);
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
            return parsed.map((item: any) => ({
              topic: String(item.topic || '').trim(),
              hashtag: item.hashtag?.startsWith('#') ? item.hashtag.trim() : `#${String(item.hashtag || item.topic || '').replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_]/g, '')}`,
              category: String(item.category || 'Tendencia').trim(),
              postsCount: String(item.postsCount || 'Tendencia').trim(),
              summary: String(item.summary || '').trim()
            }));
          }
        }
      } catch (err) {
        lastError = err;
        console.warn(`Error buscando tendencias con ${model}:`, err);
      }
    }

    console.warn('Usando tendencias predeterminadas de X por fallback:', lastError);
    return DEFAULT_X_TRENDS;
  }

  async generateCoverImage(imagePrompt: string): Promise<string> {
    const ai = this.getAiClient();
    let lastError: any = null;

    // 1. Sanitize the incoming prompt:
    // Strip out ANY previous watermark instructions or URL mentions from imagePrompt
    // to guarantee there is NEVER a duplicate watermark instruction sent to the image model.
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

    // 2. Add style reinforcement only if not already present in the prompt
    let styleSupplement = '';
    const lowerClean = cleanPrompt.toLowerCase();
    if (!lowerClean.includes('japanese vintage editorial') && !lowerClean.includes('warm ivory')) {
      styleSupplement = ' Vertical 4:5 aspect ratio editorial image for Entendiendo Cosas on WhatsApp. Japanese vintage editorial aesthetic, warm ivory subtle aged handcrafted paper texture, sumi ink black and vermilion red accents, conceptual collage of woodblock engravings, paper cutouts and halftone photo-montage with vintage print finish, high resolution, ample breathing room and negative space, clean composition.';
    }

    // 3. Define the watermark instruction EXACTLY ONCE with strict anti-duplication constraints
    const singleWatermarkRule = ' Watermark: Render EXACTLY ONE single instance of the website address "entendiendocosas.lat" in the lower right corner on a single horizontal line directly on the ivory paper background, with "entendiendo" in vibrant vermilion red (#E34234) immediately followed on the exact same line by "cosas.lat" in solid sumi ink black (#111111). STRICT ANTI-DUPLICATION RULE: Render this watermark ONLY ONCE. NEVER duplicate, repeat, clone, or stack two watermarks. There must be exactly ONE occurrence of "entendiendocosas.lat" on the entire image. NO black banner or dark box behind the watermark.';

    const fullPrompt = `${cleanPrompt}${styleSupplement}${singleWatermarkRule}`.trim();

    // 1. MODELO PRINCIPAL: Nano Banana 2.1 (gemini-3.1-flash-image)
    // Modelo de alta calidad de la familia Gemini 3.1 Flash Image con soporte de resolución 1K y tipografía editorial nítida.
    try {
      console.log('Iniciando generación con Nano Banana 2.1 (gemini-3.1-flash-image)...');
      let response: any;
      try {
        response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-image',
          contents: {
            parts: [{ text: fullPrompt }]
          },
          config: {
            imageConfig: {
              aspectRatio: '4:5',
              imageSize: '1K'
            }
          }
        });
      } catch (ratioErr: any) {
        const ratioMsg = ratioErr?.message || '';
        // Si el validador de enum rechaza estrictamente '4:5', usar '3:4' (ratio vertical estándar más próximo)
        if (ratioMsg.includes('aspectRatio') || ratioMsg.includes('INVALID_ARGUMENT')) {
          console.warn('Reintentando gemini-3.1-flash-image con aspectRatio 3:4...');
          response = await ai.models.generateContent({
            model: 'gemini-3.1-flash-image',
            contents: {
              parts: [{ text: fullPrompt }]
            },
            config: {
              imageConfig: {
                aspectRatio: '3:4',
                imageSize: '1K'
              }
            }
          });
        } else {
          throw ratioErr;
        }
      }

      for (const candidate of response.candidates || []) {
        for (const part of candidate.content?.parts || []) {
          if (part.inlineData?.data) {
            console.log('✓ Imagen generada con éxito usando Nano Banana 2.1 (gemini-3.1-flash-image)');
            return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
          }
        }
      }
    } catch (err: any) {
      lastError = err;
      console.warn('Nano Banana 2.1 (gemini-3.1-flash-image) falló:', err?.message || err);
    }

    // 2. FALLBACK 1: Nano Banana Lite (gemini-3.1-flash-lite-image)
    try {
      console.log('Intentando fallback con Nano Banana Lite (gemini-3.1-flash-lite-image)...');
      let response: any;
      try {
        response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite-image',
          contents: {
            parts: [{ text: fullPrompt }]
          },
          config: {
            imageConfig: {
              aspectRatio: '4:5'
            }
          }
        });
      } catch (ratioErr: any) {
        response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite-image',
          contents: {
            parts: [{ text: fullPrompt }]
          },
          config: {
            imageConfig: {
              aspectRatio: '3:4'
            }
          }
        });
      }

      for (const candidate of response.candidates || []) {
        for (const part of candidate.content?.parts || []) {
          if (part.inlineData?.data) {
            console.log('✓ Imagen generada con éxito usando gemini-3.1-flash-lite-image');
            return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
          }
        }
      }
    } catch (err: any) {
      lastError = err;
      console.warn('gemini-3.1-flash-lite-image falló:', err?.message || err);
    }

    // 3. FALLBACK 2: imagen-3.0-generate-002
    try {
      console.log('Intentando fallback con imagen-3.0-generate-002...');
      const response = await (ai.models as any).generateImages({
        model: 'imagen-3.0-generate-002',
        prompt: fullPrompt,
        config: {
          numberOfImages: 1,
          aspectRatio: '4:5',
          outputMimeType: 'image/jpeg'
        }
      });

      if (response.generatedImages?.[0]?.image?.imageBytes) {
        console.log('✓ Imagen generada con éxito usando imagen-3.0-generate-002');
        return `data:image/jpeg;base64,${response.generatedImages[0].image.imageBytes}`;
      }
    } catch (err: any) {
      lastError = err;
      console.warn('imagen-3.0-generate-002 falló:', err?.message || err);
    }

    // Check if error is PERMISSION_DENIED / 403
    const errMsg = lastError?.message || JSON.stringify(lastError || '');
    if (errMsg.includes('403') || errMsg.includes('PERMISSION_DENIED') || errMsg.includes('does not have permission')) {
      throw new Error(
        'PERMISSION_DENIED: Tu API Key actual de Gemini no tiene habilitado el acceso a la API de generación de imágenes (Nano Banana 2.1 / Imagen). Por favor verifica los permisos o utiliza una API Key con facturación/permisos de Imagen en Google AI Studio.'
      );
    }

    throw lastError || new Error('No se pudo generar la imagen con los modelos disponibles.');
  }

  private cleanWhatsAppText(text: string): string {
    if (!text) return '';
    let cleaned = text;

    // Eliminar encabezados markdown (# Título, ## Título)
    cleaned = cleaned.replace(/^#{1,6}\s+/gm, '');

    // Eliminar completamente negritas y cursivas de markdown (**palabra**, *palabra*, _palabra_)
    cleaned = cleaned.replace(/\*\*([^*\n]+)\*\*/g, '$1');
    cleaned = cleaned.replace(/\*([^*\n]+)\*/g, '$1');
    cleaned = cleaned.replace(/\*/g, '');
    cleaned = cleaned.replace(/_([^_\n]+)_/g, '$1');

    // Eliminar viñetas con guiones (- texto) o puntos (• texto)
    cleaned = cleaned.replace(/^[ \t]*[-•][ \t]+/gm, '');

    // Reemplazo de frases vetadas si se llegaran a colar
    cleaned = cleaned.replace(/Aquí está el pedo/gi, '');
    cleaned = cleaned.replace(/para la raza/gi, 'para nosotros');
    cleaned = cleaned.replace(/Tu Lente/gi, 'nuestro análisis');

    // Limpieza de saltos de línea excesivos
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

    return cleaned.trim();
  }
}
