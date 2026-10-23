'use strict';
// USAR 242 · Generador de PDF sencillo (sin librerías): páginas A4, texto Helvetica, líneas, recuadros e imágenes JPEG.
// Las medidas se dan en milímetros desde la esquina de arriba a la izquierda.

class MiniPDF {
  constructor() { this.pages = []; this.images = []; this.addPage(); }
  static PT = 72 / 25.4;                      // puntos por mm
  static W = 210; static H = 297;
  addPage() { this.cur = []; this.pages.push(this.cur); return this; }
  // Texto en WinAnsi (latín): lo que no cabe en esa codificación se sustituye
  static enc(s) {
    const map = { '€': 128, '‚': 130, '„': 132, '…': 133, '‘': 145, '’': 146, '“': 147, '”': 148, '•': 149, '–': 150, '—': 151, '™': 153 };
    let out = '';
    for (const ch of String(s ?? '').replace(/→/g, '->').replace(/✓/g, 'v').replace(/[  ]/g, ' ')) {
      const c = map[ch] ?? ch.charCodeAt(0);
      if (c > 255) { out += '?'; continue; }
      out += c === 40 || c === 41 || c === 92 ? '\\' + String.fromCharCode(c) : c < 32 ? ' ' : String.fromCharCode(c);
    }
    return out;
  }
  // Ancho aproximado de un texto en mm (Helvetica: ~0,5 em de media; negrita algo más)
  static width(s, size, bold) {
    let w = 0;
    for (const ch of String(s)) w += /[il.,:;'|!]/.test(ch) ? 0.25 : /[mwMW@]/.test(ch) ? 0.85 : /[A-ZÁÉÍÓÚÑ]/.test(ch) ? 0.66 : /\s/.test(ch) ? 0.28 : 0.52;
    return w * size * (bold ? 1.06 : 1) / MiniPDF.PT;
  }
  static wrap(s, size, maxW, bold) {
    const lines = [];
    for (const para of String(s ?? '').split('\n')) {
      let line = '';
      for (const word of para.split(/\s+/)) {
        const t = line ? line + ' ' + word : word;
        if (MiniPDF.width(t, size, bold) > maxW && line) { lines.push(line); line = word; } else line = t;
      }
      lines.push(line);
    }
    return lines;
  }
  text(x, y, s, { size = 10, bold = false, color = [0, 0, 0] } = {}) {
    const P = MiniPDF.PT;
    this.cur.push(`BT /${bold ? 'F2' : 'F1'} ${size} Tf ${color.join(' ')} rg ${(x * P).toFixed(2)} ${((MiniPDF.H - y) * P).toFixed(2)} Td (${MiniPDF.enc(s)}) Tj ET`);
    return this;
  }
  // Párrafo con saltos de línea automáticos; devuelve la y de debajo
  para(x, y, s, maxW, opts = {}) {
    const size = opts.size || 10, lh = (opts.lh || 1.35) * size / MiniPDF.PT;
    MiniPDF.wrap(s, size, maxW, opts.bold).forEach((l, i) => this.text(x, y + i * lh, l, opts));
    return y + MiniPDF.wrap(s, size, maxW, opts.bold).length * lh;
  }
  line(x1, y1, x2, y2, w = 0.3) { const P = MiniPDF.PT; this.cur.push(`${w * P} w 0 0 0 RG ${(x1 * P).toFixed(2)} ${((MiniPDF.H - y1) * P).toFixed(2)} m ${(x2 * P).toFixed(2)} ${((MiniPDF.H - y2) * P).toFixed(2)} l S`); return this; }
  rect(x, y, w, h, { fill = null, stroke = true, lw = 0.3 } = {}) {
    const P = MiniPDF.PT, r = `${(x * P).toFixed(2)} ${((MiniPDF.H - y - h) * P).toFixed(2)} ${(w * P).toFixed(2)} ${(h * P).toFixed(2)} re`;
    this.cur.push(fill ? `${fill.join(' ')} rg ${r} ${stroke ? `${lw * P} w 0 0 0 RG B` : 'f'}` : `${lw * P} w 0 0 0 RG ${r} S`);
    return this;
  }
  // Imagen JPEG (bytes, ancho y alto en píxeles) encajada en el recuadro x, y, w, h (mm) sin deformarla
  image(img, x, y, w, h) {
    const P = MiniPDF.PT, k = Math.min(w / img.w, h / img.h), dw = img.w * k, dh = img.h * k;
    const n = this.images.indexOf(img) >= 0 ? this.images.indexOf(img) : this.images.push(img) - 1;
    const ox = x + (w - dw) / 2, oy = y + (h - dh) / 2;
    this.cur.push(`q ${(dw * P).toFixed(2)} 0 0 ${(dh * P).toFixed(2)} ${(ox * P).toFixed(2)} ${((MiniPDF.H - oy - dh) * P).toFixed(2)} cm /Im${n} Do Q`);
    return this;
  }
  output() {
    const chunks = [], offs = [];
    let len = 0;
    const raw = s => { const b = typeof s === 'string' ? Uint8Array.from(s, c => c.charCodeAt(0) & 255) : s; chunks.push(b); len += b.length; };
    const obj = (n, body) => { offs[n] = len; raw(`${n} 0 obj\n`); body.forEach(raw); raw('\nendobj\n'); };
    raw('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
    const np = this.pages.length, first = 5 + this.images.length;   // 1 catálogo, 2 páginas, 3-4 fuentes, imágenes, luego página+contenido
    obj(1, ['<< /Type /Catalog /Pages 2 0 R >>']);
    obj(2, [`<< /Type /Pages /Count ${np} /Kids [${this.pages.map((_, i) => `${first + i * 2} 0 R`).join(' ')}] >>`]);
    obj(3, ['<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>']);
    obj(4, ['<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>']);
    this.images.forEach((im, i) => obj(5 + i, [`<< /Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${im.bytes.length} >>\nstream\n`, im.bytes, '\nendstream']));
    const xo = this.images.map((_, i) => `/Im${i} ${5 + i} 0 R`).join(' ');
    this.pages.forEach((ops, i) => {
      const content = ops.join('\n');   // solo caracteres de 1 byte (WinAnsi)
      obj(first + i * 2, [`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> ${xo ? `/XObject << ${xo} >>` : ''} >> /Contents ${first + i * 2 + 1} 0 R >>`]);
      obj(first + i * 2 + 1, [`<< /Length ${content.length} >>\nstream\n`, content, '\nendstream']);
    });
    const xref = len, total = first + np * 2;
    raw(`xref\n0 ${total}\n0000000000 65535 f \n` + Array.from({ length: total - 1 }, (_, i) => String(offs[i + 1]).padStart(10, '0') + ' 00000 n \n').join(''));
    raw(`trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
    const out = new Uint8Array(len); let p = 0; chunks.forEach(c => { out.set(c, p); p += c.length; });
    return out;
  }
}

// Convierte una imagen (data URL de foto o firma) en JPEG para el PDF, con fondo blanco y como mucho maxPx de lado
function pdfImage(dataUrl, maxPx = 1200) {
  return new Promise(res => {
    if (!dataUrl) return res(null);
    const im = new Image();
    im.onload = () => {
      const k = Math.min(1, maxPx / Math.max(im.width, im.height)), c = Object.assign(document.createElement('canvas'), { width: Math.round(im.width * k), height: Math.round(im.height * k) });
      const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height);
      const b64 = c.toDataURL('image/jpeg', 0.85).split(',')[1];
      res({ w: c.width, h: c.height, bytes: Uint8Array.from(atob(b64), ch => ch.charCodeAt(0)) });
    };
    im.onerror = () => res(null);
    im.src = dataUrl;
  });
}

// Descarga el PDF (y en el móvil ofrece compartirlo)
async function savePdf(bytes, name) {
  const blob = new Blob([bytes], { type: 'application/pdf' }), file = new File([blob], name, { type: 'application/pdf' });
  if (navigator.canShare?.({ files: [file] }) && matchMedia('(pointer: coarse)').matches) {
    try { await navigator.share({ files: [file], title: name }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: name });
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
