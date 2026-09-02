
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
      REGLAS DE REDACCIÓN (OBLIGATORIAS, ASÍ SE ESCRIBE EN ESTE CANAL):

      • Cero markdown. Nada de títulos con #, ni viñetas con guiones, ni negritas, ni tablas.
      • TÍTULO OBLIGATORIO AL INICIO (CLICKBAIT, ACTIVADOR DE SESGOS, MÁXIMO 6 PALABRAS):
        - La primera línea de 'whatsappBody' DEBE ser un título sumamente llamativo, estilo clickbait inteligente y activador de sesgos cognitivos (curiosidad irresistible, urgencia, FOMO, sorpresa, alerta o beneficio/amenaza directa al bolsillo).
        - Objetivo del título: Que incite y obligue de inmediato a abrir y leer la nota.
        - Lleva EXACTAMENTE 1 solo emoji al inicio.
        - LÍMITE ESTRICTO: NO MÁS DE 6 PALABRAS (contando después del emoji). Ejemplos: "🚨 Esto cambiará tu dinero hoy", "💥 Nadie esperaba este fuerte golpe", "⚠️ El error que costará caro", "🔥 Lo que nos ocultaron siempre".
        - El resto del cuerpo de la nota NO lleva emojis por línea ni banderitas.
      • Apertura: 1-2 frases de una escena cotidiana o metáfora de la vida diaria (un niño con un control que nunca ha visto, la fila del helado, la alarma de la casa). No se explica, se suelta.
      • Lenguaje simple, oraciones cortas, tono de plática con un compa en la cantina. Sin tecnicismos sin traducir: si usas un término raro (harness, AGI, benchmark, ratio), tradúcelo a algo de la vida diaria o no lo uses.
      • Voz PLURAL siempre: nosotros, les contamos, nos toca. Cero singular.
      • Datos duros presentados en lenguaje humano, siempre con el porqué importa.
      • Un bloque "✅ Datos duros:" al final con los números clave (sin guiones ni viñetas markdown), y si algo no está confirmado, un bloque "⚠️ En verificación aún:".
      • Cierre obligatorio con la pregunta "Y esto cómo nos toca:" conectando con la vida real de la gente: empleos, bolsillo, familia.
      • Frases vetadas (ESTRICTAMENTE PROHIBIDAS):
        - "Aquí está el pedo" (PROHIBIDO)
        - Groserías (PROHIBIDO)
        - Spanglish (PROHIBIDO)
        - "para la raza" (PROHIBIDO: decir siempre "para nosotros")
        - "Tu Lente" (PROHIBIDO: decir siempre "nuestro análisis")
      • No repitas contexto que la gente ya sabe de memoria del tema en curso.
      • Longitud: nota corta, no más de ~220 palabras.
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
          "title": "Título clickbait llamativo (máx 6 palabras)",
          "whatsappBody": "Texto para WhatsApp siguiendo ESTRICTAMENTE las REGLAS: Primera línea con 1 emoji y título clickbait, activador de sesgos de NO MÁS DE 6 PALABRAS que incite a leer; apertura de 1-2 frases con metáfora o escena cotidiana, voz plural siempre ('nosotros', 'les contamos', 'nos toca'), cero markdown (sin #, ni **, ni guiones), bloque '✅ Datos duros:', '⚠️ En verificación aún:' si aplica, cierre obligatorio con 'Y esto cómo nos toca:', cero frases vetadas, longitud máxima ~220 palabras",
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
      
      RECORDATORIO OBLIGATORIO PARA 'whatsappBody':
      - CERO MARKDOWN: sin asteriscos (** ni *), sin títulos con #, sin viñetas con guiones (-).
      - TÍTULO EN LA PRIMERA LÍNEA: 1 solo emoji al inicio + título ultra llamativo, estilo clickbait y activador de sesgos de NO MÁS DE 6 PALABRAS que obligue e incite a leer de inmediato. Cero emojis en el resto del cuerpo (salvo ✅ Datos duros: y ⚠️ En verificación aún:).
      - Apertura con 1-2 frases de una metáfora o escena cotidiana de la vida diaria (sin explicarla, suéltala directo).
      - Tono de plática con un compa en la cantina, oraciones cortas, sin tecnicismos sin traducir.
      - Voz PLURAL siempre: 'nosotros', 'les contamos', 'nos toca' (nunca en singular).
      - Bloque final '✅ Datos duros:' con números clave explicados humanamente, y si no está confirmado '⚠️ En verificación aún:'.
      - Cierre obligatorio: 'Y esto cómo nos toca:' conectando con el bolsillo, familia o empleo.
      - Prohibido: 'Aquí está el pedo', groserías, spanglish, 'para la raza' (usar 'para nosotros'), 'Tu Lente' (usar 'nuestro análisis').
      - Máximo ~220 palabras.
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
        actionInstructions = `Crea una VERSIÓN B completamente alternativa y fresca de esta misma noticia. Usa una metáfora o escena cotidiana de la vida diaria mexicana diferente y aborda el tema desde otro ángulo interesante.`;
        break;
      case 'shorter':
        actionInstructions = `Reescribe el texto haciéndolo mucho más CORTO, ágil y directo (~120-140 palabras). Conserva una apertura con metáfora veloz, los datos duros esenciales en '✅ Datos duros:' y el cierre 'Y esto cómo nos toca:'.`;
        break;
      case 'new_metaphor':
        actionInstructions = `Conserva toda la información y los datos clave, pero CAMBIA ÚNICAMENTE la escena cotidiana o metáfora de apertura por una completamente nueva de la vida diaria (ej. la fila de las tortillas, el camión que no pasa, el control de la tele sin pilas, etc.). Suéltala directo sin explicarla.`;
        break;
      case 'deep_dive_data':
        actionInstructions = `Reescribe el texto poniendo especial énfasis en explicar con lenguaje humano los números clave en el bloque '✅ Datos duros:' y profundizando en por qué le pegan directamente al bolsillo, familia o empleo en 'Y esto cómo nos toca:'.`;
        break;
    }

    const prompt = `
Actúa como un editor experto de un canal de noticias de WhatsApp en México.

TEXTO ACTUAL DE REFERENCIA:
"""
${currentText}
"""

${contextTopic ? `TEMA: ${contextTopic}` : ''}

INSTRUCCIÓN DE AJUSTE:
${actionInstructions}

REGLAS DE REDACCIÓN OBLIGATORIAS (CUMPLE TODAS AL 100%):
• Cero markdown. Nada de títulos con #, ni viñetas con guiones (-), ni negritas (**), ni tablas.
• TÍTULO OBLIGATORIO AL INICIO (CLICKBAIT, ACTIVADOR DE SESGOS, MÁXIMO 6 PALABRAS): Primera línea con exactamente 1 solo emoji y un título sumamente llamativo, estilo clickbait inteligente y activador de sesgos cognitivos (curiosidad, urgencia, FOMO, amenaza/beneficio) que incite de inmediato a leer. LÍMITE: NO MÁS DE 6 PALABRAS. El cuerpo NO lleva emojis por línea.
• Apertura: 1-2 frases de una escena cotidiana o metáfora de la vida diaria. No se explica, se suelta.
• Lenguaje simple, oraciones cortas, tono de plática con un compa en la cantina. Sin tecnicismos sin traducir.
• Voz PLURAL siempre: nosotros, les contamos, nos toca. Cero singular.
• Datos duros presentados en lenguaje humano, siempre con el porqué importa.
• Un bloque "✅ Datos duros:" al final con los números clave (sin guiones ni viñetas markdown), y si algo no está confirmado, un bloque "⚠️ En verificación aún:".
• Cierre obligatorio con la pregunta "Y esto cómo nos toca:" conectando con la vida real de la gente: empleos, bolsillo, familia.
• Frases vetadas: Aquí está el pedo, groserías, spanglish, para la raza (decir: para nosotros), y Tu Lente (decir: nuestro análisis).
• Longitud: nota corta, no más de ~220 palabras.

Devuelve ÚNICAMENTE el texto final listo para enviar por WhatsApp, sin explicaciones ni saludos previos.
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

  async generateCoverImage(imagePrompt: string): Promise<string> {
    const ai = this.getAiClient();
    let lastError: any = null;

    const fullPrompt = `${imagePrompt}. Square composition, striking editorial cover visual, clean high resolution, rich lighting, 1:1 aspect ratio, cinematic digital art.`;

    // 1. Try gemini-3.1-flash-lite-image
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-image',
        contents: {
          parts: [{ text: fullPrompt }]
        },
        config: {
          imageConfig: {
            aspectRatio: '1:1'
          }
        }
      });

      for (const candidate of response.candidates || []) {
        for (const part of candidate.content?.parts || []) {
          if (part.inlineData?.data) {
            return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
          }
        }
      }
    } catch (err: any) {
      lastError = err;
      console.warn('gemini-3.1-flash-lite-image failed:', err?.message || err);
    }

    // 2. Try imagen-3.0-generate-002
    try {
      const response = await (ai.models as any).generateImages({
        model: 'imagen-3.0-generate-002',
        prompt: fullPrompt,
        config: {
          numberOfImages: 1,
          aspectRatio: '1:1',
          outputMimeType: 'image/jpeg'
        }
      });

      if (response.generatedImages?.[0]?.image?.imageBytes) {
        return `data:image/jpeg;base64,${response.generatedImages[0].image.imageBytes}`;
      }
    } catch (err: any) {
      lastError = err;
      console.warn('imagen-3.0-generate-002 failed:', err?.message || err);
    }

    // 3. Try gemini-3.1-flash-image
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image',
        contents: {
          parts: [{ text: fullPrompt }]
        },
        config: {
          imageConfig: {
            aspectRatio: '1:1'
          }
        }
      });

      for (const candidate of response.candidates || []) {
        for (const part of candidate.content?.parts || []) {
          if (part.inlineData?.data) {
            return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
          }
        }
      }
    } catch (err: any) {
      lastError = err;
      console.warn('gemini-3.1-flash-image failed:', err?.message || err);
    }

    // Check if error is PERMISSION_DENIED / 403
    const errMsg = lastError?.message || JSON.stringify(lastError || '');
    if (errMsg.includes('403') || errMsg.includes('PERMISSION_DENIED') || errMsg.includes('does not have permission')) {
      throw new Error(
        'PERMISSION_DENIED: Tu API Key actual de Gemini no tiene habilitado el acceso a la API de generación de imágenes (Imagen / Gemini Image). Por favor verifica los permisos o utiliza una API Key con facturación/permisos de Imagen en Google AI Studio.'
      );
    }

    throw lastError || new Error('No se pudo generar la imagen con los modelos disponibles.');
  }

  private cleanWhatsAppText(text: string): string {
    if (!text) return '';
    let cleaned = text;

    // Eliminar negritas y cursivas markdown (**texto**, *texto*, __texto__, _texto_)
    cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '$1');
    cleaned = cleaned.replace(/__(.*?)__/g, '$1');
    cleaned = cleaned.replace(/(^|[^\*])\*([^\*\n]+)\*([^\*]|$)/g, '$1$2$3');

    // Eliminar encabezados markdown (# Título, ## Título)
    cleaned = cleaned.replace(/^#{1,6}\s+/gm, '');

    // Eliminar viñetas con guiones o asteriscos al inicio de línea (- texto, * texto)
    cleaned = cleaned.replace(/^[ \t]*[\-\*][ \t]+/gm, '');

    // Reemplazo de frases vetadas si se llegaran a colar
    cleaned = cleaned.replace(/Aquí está el pedo/gi, '');
    cleaned = cleaned.replace(/para la raza/gi, 'para nosotros');
    cleaned = cleaned.replace(/Tu Lente/gi, 'nuestro análisis');

    return cleaned.trim();
  }
}
