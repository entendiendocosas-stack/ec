
import { Injectable } from '@angular/core';
import { GoogleGenAI, Type } from '@google/genai';

// Declare process for TypeScript
declare const process: any;

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

  async generateNewsContent(topics: string[], customQuery?: string): Promise<any[]> {
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

    const styleInstructions = `
      1. **INICIO DIRECTO Y EXPLOSIVO:** PROHIBIDO usar frases de relleno como "Nos enteramos de...", "Les traemos...", "Atención gente...", "¿Sabían que...?". 
         - Empieza DIRECTAMENTE con el sujeto y la acción. 
         - Ejemplo MAL: "Amigos, nos enteramos de que Google lanzó..."
         - Ejemplo BIEN: "¡Google acaba de lanzar Gemini 3 y cambia todo el juego!"
      
      2. **Audiencia:** Mexicanos. Habla en plural ("nosotros") como medio, pero sé conciso.
      
      3. **DIETA DE EMOJIS:** Úsalos con moderación extrema. Máximo 2 o 3 por mensaje completo. Úsalos como "balas" o para resaltar algo muy grave, no para decorar.
      
      4. **Profundidad:** Desarrolla la noticia en 3 párrafos breves.
         - Párrafo 1: El hecho (Qué pasó).
         - Párrafo 2: El contexto (Por qué importa / Qué hay detrás).
         - Párrafo 3: La consecuencia (Qué va a pasar).
      
      5. **CIERRE LIMPIO (SIN REACCIONES):**
         - Termina la noticia con el punto final del tercer párrafo.
         - PROHIBIDO agregar preguntas ("¿Qué opinan?").
         - PROHIBIDO pedir reacciones ("Dale like si...").
         - El contenido debe hablar por sí mismo y ser informativo.
      
      6. **Tono:** Chisme Responsable pero SERIO en los datos. No uses jerga excesiva ("qué onda", "chale") a menos que la noticia sea muy ligera. Mantén la autoridad periodística pero con lenguaje sencillo.
    `;

    const systemPrompt = `
      Actúa como un editor experto de un canal de noticias de WhatsApp en México.
      
      OBJETIVO PRINCIPAL:
      Investigar, validar y generar contenido viral basado en la solicitud del usuario.
      
      CONTEXTO DE OPERACIÓN:
      ${focusInstruction}
      
      LÓGICA DE INVESTIGACIÓN:
      - Si es un ENLACE (URL): Extrae la información clave, verifica los hechos y transfórmalo al estilo del canal.
      - Si es BÚSQUEDA: Si hay un tema específico, esa es la prioridad. Si hay múltiples, busca intersecciones. Prioriza 'Última Hora'.
      
      HERRAMIENTA OBLIGATORIA:
      Usa Google Search para encontrar o validar la información.
      Si el usuario dio una URL, úsala como referencia principal y ponla en 'sourceUrl'.

      REGLAS DE ESTILO (CRÍTICO E INNEGOCIABLE):
      ${styleInstructions}
      
      REGLAS PARA RED SOCIAL X (ANTES TWITTER) - DIVULGACIÓN CERCANA Y NATURAL:
      - El campo 'twitterBody' debe ser una nota de divulgación escrita con un tono sumamente humano, cercano, fresco y fácil de entender.
      - Imagina que le estás explicando la noticia a un amigo con un café en la mano. Cero tecnicismos áridos, cero clicks artificiales o hooks robóticos.
      - OBJETIVO DE DIVULGACIÓN: Explica el titular de forma extremadamente comprensible. ¿Por qué es importante esto para el ciudadano de a pie? ¿Qué significa realmente esta tecnología o evento político/económico?
      - ESTRUCTURA NATURAL:
        1. Comienza de forma muy orgánica (ej: "Hoy se anunció algo que suena de ciencia ficción pero ya es real...", "¿Has oído hablar de...?").
        2. Desarrolla la noticia traduciendo los datos complejos a анаlogías de la vida cotidiana.
        3. Cierra explicando la verdadera importancia práctica del tema de manera amable y constructiva.
      - Emojis: Coloca solo 1 o 2 emojis cálidos e integrados de forma natural en el texto, no al inicio de cada línea.
      
      REGLAS PARA HASHTAGS (CONVERSACIONAL):
      - El campo 'hashtags' debe incluir solo 1 o 2 hashtags orgánicos que se usarían naturalmente en la conversación (ej: #Ciencia #Tecnologia #EntendiendoCosas). No satures de etiquetas.

      REGLAS PARA EL PROMPT DE IMAGEN (ESTÁTICO):
      - El campo 'imagePrompt' DEBE estar estrictamente en INGLÉS.
      - Estilo: Photorealistic, Cinematic Lighting, 8k resolution, Highly Detailed, Press Photography style.
      
      REGLAS PARA EL PROMPT DE VIDEO (NUEVO - DINÁMICO):
      - El campo 'videoPrompt' DEBE estar estrictamente en INGLÉS.
      - Diseñado para IAs de video (Runway, Pika, Sora).
      - Estilo: Cinematic, Motion-focused.
      - INCLUYE MOVIMIENTOS DE CÁMARA: "Slow motion drone shot establishing...", "Close up pan...", "Time-lapse of...".
      - Describe la acción y la atmósfera (ej: "chaotic atmosphere", "futuristic glow", "serious news setting").
      
      REGLAS TÉCNICAS JSON (MUY IMPORTANTE):
      - Tu respuesta DEBE ser un JSON válido parseable.
      - CUIDADO con las comillas dobles (") dentro del texto. SIEMPRE escápalas con contra-barra (\\"). 
      - Usa comillas simples ('') dentro del texto preferiblemente.
      
      FORMATO DE SALIDA (JSON ARRAY ÚNICAMENTE):
      [
        {
          "category": "Categoría (Detectada automáticamente)",
          "title": "Título Corto",
          "whatsappBody": "Texto del mensaje optimizado para canal de WhatsApp",
          "twitterBody": "Artículo de divulgación, amigable y explicativo en cristiano para X Premium",
          "hashtags": "#TemaImportante #ExplicaciónClara",
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
      Asegúrate de NO empezar con saludos ni frases de relleno.
      NO agregues ninguna llamada a la acción o pregunta al final.
    `;

    // Configuración robusta de reintentos con fallbacks de modelos y herramientas
    const configsToTry: { model: string; disableSearch: boolean }[] = [];
    
    if (this.isSearchSupported) {
      configsToTry.push({ model: 'gemini-2.5-flash', disableSearch: false });
    }
    configsToTry.push({ model: 'gemini-2.5-flash', disableSearch: true });
    
    if (this.isSearchSupported) {
      configsToTry.push({ model: 'gemini-3.5-flash', disableSearch: false });
    }
    configsToTry.push({ model: 'gemini-3.5-flash', disableSearch: true });
    configsToTry.push({ model: 'gemini-flash-latest', disableSearch: true });

    let configIndex = 0;
    let lastError: any = null;

    while (configIndex < configsToTry.length) {
      const currentConfig = configsToTry[configIndex];
      const currentModelId = currentConfig.model;
      const disableSearch = currentConfig.disableSearch;

      try {
        const client = this.getAiClient();
        
        const config: any = {
          systemInstruction: systemPrompt,
          temperature: 0.85
        };

        if (!disableSearch) {
          config.tools = isUrl ? [{ urlContext: {} }] : [{ googleSearch: {} }];
        }
        
        console.log(`Intentando generación (Intento ${configIndex + 1}/${configsToTry.length}) con modelo: ${currentModelId} (Herramientas activas: ${!disableSearch})`);
        
        const response = await client.models.generateContent({
          model: currentModelId,
          contents: userPrompt,
          config: config
        });

        const text = response.text;
        if (!text) throw new Error('La IA no generó texto.');

        console.log('Respuesta RAW Gemini exitosa:', text); 

        // Limpieza y extracción del JSON
        let jsonString = text;
        const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          jsonString = jsonMatch[1];
        }

        try {
          return JSON.parse(jsonString);
        } catch (e) {
          console.warn('Error parseando JSON inicial, intentando método de recuperación:', e);
          const arrayStart = jsonString.indexOf('[');
          const arrayEnd = jsonString.lastIndexOf(']');
          if (arrayStart !== -1 && arrayEnd !== -1) {
            const cleanJson = jsonString.substring(arrayStart, arrayEnd + 1);
            return JSON.parse(cleanJson);
          }
          throw new Error('No se pudo extraer JSON válido de la respuesta.');
        }

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
}
