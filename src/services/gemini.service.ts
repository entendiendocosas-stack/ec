import { Injectable } from '@angular/core';

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
  constructor() {}

  private getBaseUrl(): string {
    if (typeof window !== 'undefined' && window.location) {
      return '';
    }
    const port = (typeof process !== 'undefined' && (process as any).env?.PORT) || 3000;
    return `http://localhost:${port}`;
  }

  private isValidApiKey(key: unknown): key is string {
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

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    let apiKey = '';
    if (typeof window !== 'undefined') {
      const winKey = (window as any).GEMINI_API_KEY;
      const procKey = (window as any).process?.env?.GEMINI_API_KEY;
      let localKey = '';
      try {
        localKey = localStorage.getItem('GEMINI_API_KEY') || '';
      } catch {}

      if (this.isValidApiKey(winKey)) {
        apiKey = winKey;
      } else if (this.isValidApiKey(procKey)) {
        apiKey = procKey;
      } else if (this.isValidApiKey(localKey)) {
        apiKey = localKey;
      }
    } else if (typeof process !== 'undefined' && (process as any).env) {
      const envKey = (process as any).env.GEMINI_API_KEY;
      if (this.isValidApiKey(envKey)) {
        apiKey = envKey;
      }
    }

    if (this.isValidApiKey(apiKey)) {
      headers['x-gemini-api-key'] = apiKey.trim();
    }

    return headers;
  }

  async generateNewsContent(topics: string[], customQuery?: string, activeXTrends: string[] = []): Promise<any[]> {
    const res = await fetch(`${this.getBaseUrl()}/api/gemini/generate-news`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        topics,
        customQuery,
        activeXTrends
      })
    });

    if (!res.ok) {
      let errorMsg = 'Error al generar noticias en el servidor.';
      try {
        const errorData = await res.json();
        if (errorData?.error) errorMsg = errorData.error;
      } catch {}
      throw new Error(errorMsg);
    }

    const data = await res.json();
    return data.news || [];
  }

  async fetchXTrends(region: string = 'México'): Promise<XTrend[]> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/gemini/trends`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ region })
      });

      if (!res.ok) {
        return DEFAULT_X_TRENDS;
      }

      const data = await res.json();
      if (Array.isArray(data?.trends) && data.trends.length > 0) {
        return data.trends;
      }
      return DEFAULT_X_TRENDS;
    } catch (e) {
      console.warn('Error solicitando tendencias al servidor, usando fallback:', e);
      return DEFAULT_X_TRENDS;
    }
  }

  async generateAlternativeWhatsAppText(
    currentText: string,
    action: 'version_b' | 'shorter' | 'new_metaphor' | 'deep_dive_data',
    contextTopic?: string
  ): Promise<string> {
    const res = await fetch(`${this.getBaseUrl()}/api/gemini/adjust-whatsapp`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        currentText,
        action,
        contextTopic
      })
    });

    if (!res.ok) {
      let errorMsg = 'Error al ajustar texto de WhatsApp en el servidor.';
      try {
        const errorData = await res.json();
        if (errorData?.error) errorMsg = errorData.error;
      } catch {}
      throw new Error(errorMsg);
    }

    const data = await res.json();
    return data.text || '';
  }

  async generateAlternativeTwitterText(
    currentText: string,
    action: 'hook_viral' | 'thread' | 'debate' | 'key_takeaways',
    contextTopic?: string
  ): Promise<string> {
    const res = await fetch(`${this.getBaseUrl()}/api/gemini/adjust-twitter`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        currentText,
        action,
        contextTopic
      })
    });

    if (!res.ok) {
      let errorMsg = 'Error al ajustar post de X en el servidor.';
      try {
        const errorData = await res.json();
        if (errorData?.error) errorMsg = errorData.error;
      } catch {}
      throw new Error(errorMsg);
    }

    const data = await res.json();
    return data.text || '';
  }

  async generateCoverImage(imagePrompt: string, title?: string, category?: string): Promise<string> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/gemini/generate-cover`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          imagePrompt,
          title,
          category
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.imageUrl) {
          return data.imageUrl;
        }
      }
    } catch (e) {
      console.warn('Error en llamada al servidor de portada, procediendo a lienzo editorial 4:3:', e);
    }

    // Fallback estético garantizado 4:3 en canvas local
    const fallbackPosterUrl = this.generateEditorialCanvasPoster(
      title || (imagePrompt ? imagePrompt.substring(0, 80) : 'Noticia'),
      category || 'Editorial',
      imagePrompt
    );

    if (fallbackPosterUrl) {
      return fallbackPosterUrl;
    }

    throw new Error('No se pudo generar la portada editorial.');
  }

  generateEditorialCanvasPoster(title: string, category: string, imagePrompt: string): string {
    if (typeof document === 'undefined') {
      return '';
    }

    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 900; // Aspect ratio exacto 4:3 (1200 x 900)
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // 1. Fondo de papel marfil envejecido artesanal
    const bgGrad = ctx.createLinearGradient(0, 0, 1200, 900);
    bgGrad.addColorStop(0, '#FAF7EE');
    bgGrad.addColorStop(0.5, '#F5F0E1');
    bgGrad.addColorStop(1, '#EDE6D4');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1200, 900);

    // Grano sutil de papel artesanal / xilografía
    ctx.fillStyle = 'rgba(30, 25, 20, 0.025)';
    for (let i = 0; i < 2400; i++) {
      const rx = Math.random() * 1200;
      const ry = Math.random() * 900;
      const rw = Math.random() * 2 + 1;
      ctx.fillRect(rx, ry, rw, rw);
    }

    // Marco editorial japonés (doble recuadro)
    ctx.strokeStyle = '#1A1A1A';
    ctx.lineWidth = 3;
    ctx.strokeRect(36, 36, 1128, 828);
    ctx.strokeStyle = 'rgba(227, 66, 52, 0.45)'; // Línea interior roja bermellón
    ctx.lineWidth = 1;
    ctx.strokeRect(44, 44, 1112, 812);

    // 2. Barra Superior Editorial
    ctx.fillStyle = '#E34234'; // Rojo bermellón
    ctx.font = 'bold 18px "Courier New", monospace';
    ctx.fillText('ENTENDIENDO COSAS', 65, 82);

    ctx.fillStyle = '#555555';
    ctx.font = '14px sans-serif';
    const cleanCategory = (category || 'ANÁLISIS EDITORIAL').toUpperCase();
    ctx.fillText(`• ${cleanCategory} •`, 320, 82);

    // Sello superior derecho
    ctx.strokeStyle = '#E34234';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(1020, 62, 115, 28);
    ctx.fillStyle = '#E34234';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('4:3 • VINTAGE PRINT', 1026, 80);

    // Divisor horizontal
    ctx.strokeStyle = '#1A1A1A';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(65, 102);
    ctx.lineTo(1135, 102);
    ctx.stroke();

    // 3. Titular en tipografía Serif impactante con salto de línea natural
    const headline = (title || 'La clave detrás de la noticia').trim();
    const words = headline.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    ctx.font = 'bold 44px "Georgia", "Times New Roman", serif';
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (ctx.measureText(testLine).width > 980) {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);

    let yPos = 148;
    lines.slice(0, 3).forEach((line, idx) => {
      if (idx === 0) {
        const lineWords = line.split(' ');
        const firstWord = lineWords[0] || '';
        const restOfLine = lineWords.slice(1).join(' ');

        ctx.fillStyle = '#E34234'; // Primera palabra en rojo bermellón
        ctx.font = 'bold 46px "Georgia", serif';
        ctx.fillText(firstWord, 65, yPos);

        const firstWidth = ctx.measureText(firstWord + ' ').width;
        ctx.fillStyle = '#1A1A1A'; // Tinta sumi para el resto
        ctx.fillText(restOfLine, 65 + firstWidth, yPos);
      } else {
        ctx.fillStyle = '#1A1A1A';
        ctx.font = 'bold 44px "Georgia", serif';
        ctx.fillText(line, 65, yPos);
      }
      yPos += 54;
    });

    // 4. Ilustración Conceptual Central en 4:3 (Estética xilográfica vintage)
    const artBoxY = Math.max(yPos + 15, 235);
    const artBoxH = Math.max(800 - artBoxY, 260);
    const cx = 600;
    const cy = artBoxY + artBoxH / 2;
    const sunRadius = Math.min(130, artBoxH * 0.38);

    ctx.save();
    // Círculo solar bermellón (Sol naciente / metáfora de foco)
    ctx.beginPath();
    ctx.arc(cx, cy - 15, sunRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(227, 66, 52, 0.12)';
    ctx.fill();
    ctx.strokeStyle = '#E34234';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Anillo concéntrico punteado
    ctx.beginPath();
    ctx.arc(cx, cy - 15, sunRadius * 0.75, 0, Math.PI * 2);
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = 'rgba(26, 26, 26, 0.35)';
    ctx.stroke();
    ctx.setLineDash([]);

    // Líneas grabadas de xilografía
    ctx.strokeStyle = 'rgba(26, 26, 26, 0.18)';
    ctx.lineWidth = 1;
    for (let ly = artBoxY + 20; ly < artBoxY + artBoxH - 20; ly += 20) {
      ctx.beginPath();
      ctx.moveTo(380, ly);
      ctx.lineTo(820, ly);
      ctx.stroke();
    }

    // Motivo geométrico central (Diamante + Foco)
    ctx.beginPath();
    ctx.moveTo(cx, cy - sunRadius * 0.55);
    ctx.lineTo(cx + sunRadius * 0.45, cy - 15);
    ctx.lineTo(cx, cy + sunRadius * 0.45);
    ctx.lineTo(cx - sunRadius * 0.45, cy - 15);
    ctx.closePath();
    ctx.fillStyle = '#FAF7EE';
    ctx.fill();
    ctx.strokeStyle = '#1A1A1A';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Punto focal en bermellón
    ctx.fillStyle = '#E34234';
    ctx.beginPath();
    ctx.arc(cx, cy - 15, 18, 0, Math.PI * 2);
    ctx.fill();

    // Textos de apoyo en el recuadro artístico
    ctx.fillStyle = '#333333';
    ctx.font = 'italic 15px "Georgia", serif';
    ctx.textAlign = 'center';
    ctx.fillText('Divulgación y Crónica Ciudadana', cx, cy + sunRadius + 22);
    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.fillStyle = '#777777';
    ctx.fillText('FORMATO EDITORIAL 4:3 • MÉXICO', cx, cy + sunRadius + 44);
    ctx.restore();

    // 5. Divisor Inferior
    ctx.strokeStyle = '#1A1A1A';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(65, 815);
    ctx.lineTo(1135, 815);
    ctx.stroke();

    // 6. MARCA DE AGUA ÚNICA OBLIGATORIA:
    // En la esquina inferior derecha directamente sobre el papel marfil en una sola línea horizontal:
    // 'entendiendo' en rojo bermellón (#E34234) seguido de 'cosas.lat' en tinta sumi negra (#111111).
    // SIN caja negra, SIN banner oscuro, UNA SOLA VEZ.
    ctx.textAlign = 'left';
    ctx.font = 'bold 20px "Georgia", serif';

    const textEntendiendo = 'entendiendo';
    const textCosas = 'cosas.lat';
    const entendiendoWidth = ctx.measureText(textEntendiendo).width;
    const cosasWidth = ctx.measureText(textCosas).width;
    const totalWatermarkWidth = entendiendoWidth + cosasWidth;

    const watermarkX = 1135 - totalWatermarkWidth;
    const watermarkY = 848;

    // 'entendiendo' en rojo bermellón
    ctx.fillStyle = '#E34234';
    ctx.fillText(textEntendiendo, watermarkX, watermarkY);

    // 'cosas.lat' en tinta negra sumi
    ctx.fillStyle = '#111111';
    ctx.fillText(textCosas, watermarkX + entendiendoWidth, watermarkY);

    // Pie de página izquierdo
    ctx.fillStyle = '#777777';
    ctx.font = '13px sans-serif';
    ctx.fillText('Resumen editorial para WhatsApp y X', 65, 848);

    return canvas.toDataURL('image/png');
  }
}
