/* Exportação local: JPEG com fundo branco e ZIP sem dependências ou envio de dados. */
(function () {
  const INK = '#0a0a0a';
  const cor = t => /^#[0-9a-f]{6}$/i.test(t.cor) ? t.cor : INK;

  // Usa o layout real dos nós para manter tamanhos, quebras de linha e alinhamento.
  function medir(n, container) {
    const e = document.createElement('div');
    e.className = `qn ${n.tipo}`;
    e.style.left = e.style.top = '0';
    if (n.w) Object.assign(e.style, { width: n.w + 'px', minWidth: '0', maxWidth: 'none' });
    if (n.h) Object.assign(e.style, { height: n.h + 'px', minHeight: '0' });
    const t = document.createElement('div'); t.className = 'qt'; t.textContent = n.texto;
    e.append(t); container.append(e);
    const box = e.getBoundingClientRect(), css = getComputedStyle(t), linhas = [];
    const text = t.firstChild, range = document.createRange();
    if (text) for (let i = 0; i < text.length; i++) {
      range.setStart(text, i); range.setEnd(text, i + 1);
      const r = range.getBoundingClientRect();
      if (!r.width || text.textContent[i] === '\n') continue;
      const x = n.x + r.left - box.left, y = n.y + r.top - box.top;
      const ultima = linhas[linhas.length - 1];
      if (ultima && Math.abs(ultima.y - y) < 1) { ultima.texto += text.textContent[i]; ultima.direita = x + r.width; }
      else linhas.push({ texto: text.textContent[i], x, y, direita: x + r.width, h: r.height });
    }
    const m = { ...n, w: box.width, h: box.height, linhas, font: `${css.fontStyle} ${css.fontWeight} ${css.fontSize} ${css.fontFamily}`, tamanho: parseFloat(css.fontSize), espacamento: css.letterSpacing };
    e.remove(); return m;
  }

  function caminhoNo(c, n) {
    const { x, y, w, h } = n;
    c.beginPath();
    if (n.tipo === 'circulo') c.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    else if (n.tipo === 'losango') { c.moveTo(x + w / 2, y); c.lineTo(x + w, y + h / 2); c.lineTo(x + w / 2, y + h); c.lineTo(x, y + h / 2); c.closePath(); }
    else if (n.tipo === 'triangulo') { c.moveTo(x + w / 2, y); c.lineTo(x + w, y + h); c.lineTo(x, y + h); c.closePath(); }
    else c.roundRect(x, y, w, h, n.tipo === 'nota' ? 4 : 14);
  }

  async function jpeg(pagina, borda) {
    const container = document.createElement('div'); container.className = 'q-export-medida'; document.body.append(container);
    let nos;
    try { nos = pagina.nos.map(n => medir(n, container)); } finally { container.remove(); }
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const inclui = (x, y, margem = 0) => { x0 = Math.min(x0, x - margem); y0 = Math.min(y0, y - margem); x1 = Math.max(x1, x + margem); y1 = Math.max(y1, y + margem); };
    nos.forEach(n => {
      inclui(n.x, n.y, 3); inclui(n.x + n.w, n.y + n.h, 3);
      n.linhas.forEach(l => { inclui(l.x, l.y); inclui(l.direita, l.y + l.h); });
    });
    (pagina.tracos || []).forEach(t => { for (let i = 0; i < t.p.length; i += 2) inclui(t.p[i], t.p[i + 1], (t.w || 3) / 2); });
    if (!isFinite(x0)) { x0 = y0 = 0; x1 = 800; y1 = 450; }
    const w = Math.max(800, x1 - x0 + 96), h = Math.max(450, y1 - y0 + 96);
    const escala = Math.min(2, 4096 / Math.max(w, h));
    const canvas = document.createElement('canvas'); canvas.width = Math.ceil(w * escala); canvas.height = Math.ceil(h * escala);
    const c = canvas.getContext('2d');
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, canvas.width, canvas.height);
    c.scale(escala, escala); c.translate((w - (x1 - x0)) / 2 - x0, (h - (y1 - y0)) / 2 - y0);
    c.strokeStyle = c.fillStyle = INK; c.lineWidth = 2; c.lineJoin = 'round';
    const porId = new Map(nos.map(n => [n.id, n]));
    pagina.setas.forEach(s => {
      const a = porId.get(s.a), b = porId.get(s.b); if (!a || !b) return;
      const p = borda(a, b), q = borda(b, a), angulo = Math.atan2(q.y - p.y, q.x - p.x);
      c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(q.x, q.y); c.stroke();
      c.beginPath(); c.moveTo(q.x, q.y);
      c.lineTo(q.x - 14 * Math.cos(angulo - .45), q.y - 14 * Math.sin(angulo - .45));
      c.lineTo(q.x - 14 * Math.cos(angulo + .45), q.y - 14 * Math.sin(angulo + .45)); c.closePath(); c.fill();
    });
    nos.forEach(n => {
      if (n.tipo !== 'texto') {
        caminhoNo(c, n);
        c.fillStyle = ['circulo', 'losango', 'triangulo'].includes(n.tipo) ? 'rgba(10,10,10,.08)' : (n.tipo === 'nota' ? '#f3f3f3' : '#ffffff');
        c.fill(); c.strokeStyle = INK; c.lineWidth = 2;
        c.setLineDash(n.tipo === 'nota' ? [6, 4] : []); c.stroke(); c.setLineDash([]);
      }
      c.font = n.font; c.fillStyle = INK; c.textBaseline = 'alphabetic';
      if ('letterSpacing' in c) c.letterSpacing = n.espacamento === 'normal' ? '0px' : n.espacamento;
      n.linhas.forEach(l => { const metrica = c.measureText(l.texto); c.fillText(l.texto, l.x, l.y + (metrica.fontBoundingBoxAscent || n.tamanho * .8)); });
    });
    c.lineCap = c.lineJoin = 'round';
    (pagina.tracos || []).forEach(t => {
      if (t.p.length < 2) return;
      c.strokeStyle = cor(t); c.lineWidth = t.w || 3; c.beginPath(); c.moveTo(t.p[0], t.p[1]);
      if (t.p.length === 2) c.lineTo(t.p[0] + .01, t.p[1]);
      for (let i = 2; i < t.p.length; i += 2) c.lineTo(t.p[i], t.p[i + 1]);
      c.stroke();
    });
    return new Promise((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('Falha ao gerar JPEG')), 'image/jpeg', .95));
  }

  // ZIP "store": JPEG já é comprimido. Um único download evita bloqueios de downloads múltiplos.
  function crc32(bytes) {
    let crc = 0xffffffff;
    for (const b of bytes) { crc ^= b; for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
    return (crc ^ 0xffffffff) >>> 0;
  }
  async function zip(arquivos) {
    const partes = [], central = []; let offset = 0, tamanhoCentral = 0;
    for (const arquivo of arquivos) {
      const nome = new TextEncoder().encode(arquivo.nome), bytes = new Uint8Array(await arquivo.blob.arrayBuffer()), crc = crc32(bytes);
      const local = new Uint8Array(30 + nome.length), l = new DataView(local.buffer);
      l.setUint32(0, 0x04034b50, true); l.setUint16(4, 20, true); l.setUint16(12, 33, true);
      l.setUint32(14, crc, true); l.setUint32(18, bytes.length, true); l.setUint32(22, bytes.length, true); l.setUint16(26, nome.length, true); local.set(nome, 30);
      const dir = new Uint8Array(46 + nome.length), d = new DataView(dir.buffer);
      d.setUint32(0, 0x02014b50, true); d.setUint16(4, 20, true); d.setUint16(6, 20, true); d.setUint16(14, 33, true);
      d.setUint32(16, crc, true); d.setUint32(20, bytes.length, true); d.setUint32(24, bytes.length, true); d.setUint16(28, nome.length, true); d.setUint32(42, offset, true); dir.set(nome, 46);
      partes.push(local, bytes); central.push(dir); offset += local.length + bytes.length; tamanhoCentral += dir.length;
    }
    const fim = new Uint8Array(22), f = new DataView(fim.buffer);
    f.setUint32(0, 0x06054b50, true); f.setUint16(8, arquivos.length, true); f.setUint16(10, arquivos.length, true);
    f.setUint32(12, tamanhoCentral, true); f.setUint32(16, offset, true);
    return new Blob([...partes, ...central, fim], { type: 'application/zip' });
  }
  function download(blob, nome) {
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = nome; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  window.QuadroExportar = {
    async baixar(paginas, { todas, inicio, borda, progresso }) {
      await document.fonts.ready;
      const arquivos = [];
      for (let i = 0; i < paginas.length; i++) {
        progresso(`Preparando página ${i + 1} de ${paginas.length}…`);
        await new Promise(resolve => setTimeout(resolve, 0));
        arquivos.push({ nome: `quadro-pagina-${String(inicio + i).padStart(2, '0')}.jpg`, blob: await jpeg(paginas[i], borda) });
      }
      if (todas) download(await zip(arquivos), 'quadro-paginas.zip');
      else download(arquivos[0].blob, arquivos[0].nome);
    },
  };
})();
