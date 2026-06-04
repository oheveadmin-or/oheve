import type { Overlay } from '@/src/types/weddingLayout';

type EraseBox = { x: number; y: number; w: number; h: number };

export function buildGoogleFontImports(): string {
  return [
    '<link rel="preconnect" href="https://fonts.googleapis.com">',
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Great+Vibes&family=Pinyon+Script&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Noto+Serif+Hebrew:wght@300;400;600&display=swap">',
  ].join('');
}

export function getFontFamily(overlay: Overlay): string {
  if (overlay.category === 'religious') return '"Noto Serif Hebrew", serif';
  if (overlay.font_family === 'cursive') {
    return overlay.id.includes('bride') || overlay.id.includes('groom')
      ? '"Great Vibes", "Pinyon Script", cursive'
      : '"Pinyon Script", "Great Vibes", cursive';
  }
  return '"Cormorant Garamond", serif';
}

export function buildEraseBoxFromMeasuredText(
  ov: Overlay,
  lines: string[],
  lineWidths: number[],
  tx: number,
  startY: number,
  lineHeight: number,
  canvasWidth: number,
  canvasHeight: number,
): EraseBox {
  const realTextWidth = Math.max(...lineWidths, 1);
  const realTextHeight = lines.length * lineHeight;

  let eraseX = tx - realTextWidth / 2 - 8;
  let eraseY = startY - lineHeight / 2 - 6;
  let eraseW = realTextWidth + 16;
  let eraseH = realTextHeight + 12;

  if (ov.id === 'bride_name') {
    eraseX = Math.min(eraseX, canvasWidth * 0.42);
    eraseW = Math.min(eraseW, canvasWidth * 0.34);
  }
  if (ov.id === 'groom_name') {
    eraseX = Math.max(eraseX, canvasWidth * 0.55);
    eraseW = Math.min(eraseW, canvasWidth * 0.34);
  }

  const x = Math.max(0, eraseX);
  const y = Math.max(0, eraseY);
  const w = Math.max(1, Math.min(canvasWidth - x, eraseW));
  const h = Math.max(1, Math.min(canvasHeight - y, eraseH));
  return { x, y, w, h };
}

export function shouldSkipEraseZone(ov: Overlay, eraseBox: EraseBox, canvasWidth: number): boolean {
  if (eraseBox.w <= 1 || eraseBox.h <= 1) return true;

  // Protect center decorative area between names.
  const centerLeft = canvasWidth * 0.44;
  const centerRight = canvasWidth * 0.56;
  const boxLeft = eraseBox.x;
  const boxRight = eraseBox.x + eraseBox.w;
  const intersectsCenter = boxRight > centerLeft && boxLeft < centerRight;

  if ((ov.preserve_center ?? true) && ov.category === 'names' && intersectsCenter) return true;
  if (eraseBox.w > canvasWidth * 0.42) return true;
  if (ov.render_mode === 'skip_erase') return true;
  return false;
}

export function generateCanvasHTML(imageBase64: string, mimeType: string, overlays: Overlay[]): string {
  const overlaysJSON = JSON.stringify(overlays);
  const safeBase64 = imageBase64.replace(/`/g, '').replace(/\$/g, '');
  const fontImports = buildGoogleFontImports();

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
${fontImports}
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: #000; overflow: hidden; }
</style>
</head>
<body>
<canvas id="c"></canvas>
<script>
document.fonts.ready.then(function() {
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const overlays = ${overlaysJSON};

  function getFontFamily(ov) {
    if (ov.category === 'religious') return '"Noto Serif Hebrew", serif';
    if (ov.font_family === 'cursive') {
      return (ov.id || '').includes('bride') || (ov.id || '').includes('groom')
        ? '"Great Vibes", "Pinyon Script", cursive'
        : '"Pinyon Script", "Great Vibes", cursive';
    }
    return '"Cormorant Garamond", serif';
  }

  function buildEraseBoxFromMeasuredText(ctx, ov, lines, tx, startY, lineHeight, canvas) {
    const widths = lines.map(function(line) { return ctx.measureText(line).width; });
    const realTextWidth = Math.max.apply(null, widths.concat([1]));
    const realTextHeight = Math.max(1, lines.length) * lineHeight;

    let eraseX = tx - realTextWidth / 2 - 8;
    let eraseY = startY - lineHeight / 2 - 6;
    let eraseW = realTextWidth + 16;
    let eraseH = realTextHeight + 12;

    if (ov.id === 'bride_name') {
      eraseX = Math.min(eraseX, canvas.width * 0.42);
      eraseW = Math.min(eraseW, canvas.width * 0.34);
    }
    if (ov.id === 'groom_name') {
      eraseX = Math.max(eraseX, canvas.width * 0.55);
      eraseW = Math.min(eraseW, canvas.width * 0.34);
    }

    const x = Math.max(0, eraseX);
    const y = Math.max(0, eraseY);
    const w = Math.max(1, Math.min(canvas.width - x, eraseW));
    const h = Math.max(1, Math.min(canvas.height - y, eraseH));
    return { x: x, y: y, w: w, h: h };
  }

  function shouldSkipEraseZone(ov, box, canvas) {
    if (!box || box.w <= 1 || box.h <= 1) return true;
    const centerLeft = canvas.width * 0.44;
    const centerRight = canvas.width * 0.56;
    const intersectsCenter = (box.x + box.w) > centerLeft && box.x < centerRight;
    if ((ov.preserve_center !== false) && ov.category === 'names' && intersectsCenter) return true;
    if (box.w > canvas.width * 0.42) return true;
    if (ov.render_mode === 'skip_erase') return true;
    return false;
  }

  function isNearWhiteColor(color) {
    if (!color || color[0] !== '#' || color.length !== 7) return false;
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return r >= 232 && g >= 232 && b >= 232;
  }

  function sampleBackgroundColor(ov, box) {
    if (isNearWhiteColor(ov.bg_color || '')) return '#ffffff';

    const samples = [];
    function sample(x, y) {
      const sx = Math.max(0, Math.min(canvas.width - 1, Math.floor(x)));
      const sy = Math.max(0, Math.min(canvas.height - 1, Math.floor(y)));
      const d = ctx.getImageData(sx, sy, 1, 1).data;
      if (d[3] < 10) return;
      // ignore nearly-black text pixels
      if (d[0] < 55 && d[1] < 55 && d[2] < 55) return;
      samples.push([d[0], d[1], d[2]]);
    }

    const stepX = Math.max(1, Math.floor(box.w / 6));
    const stepY = Math.max(1, Math.floor(box.h / 5));
    for (let x = box.x; x <= box.x + box.w; x += stepX) {
      sample(x, box.y - 2);
      sample(x, box.y + box.h + 2);
    }
    for (let y = box.y; y <= box.y + box.h; y += stepY) {
      sample(box.x - 2, y);
      sample(box.x + box.w + 2, y);
    }

    if (!samples.length) return (ov.bg_color && ov.bg_color[0] === '#') ? ov.bg_color : '#ffffff';
    const rs = samples.map(function(s) { return s[0]; }).sort(function(a, b) { return a - b; });
    const gs = samples.map(function(s) { return s[1]; }).sort(function(a, b) { return a - b; });
    const bs = samples.map(function(s) { return s[2]; }).sort(function(a, b) { return a - b; });
    const mid = Math.floor(samples.length / 2);
    return 'rgb(' + rs[mid] + ',' + gs[mid] + ',' + bs[mid] + ')';
  }

  function splitLines(ov, maxWidth) {
    const raw = (ov.text || '').trim();
    if (!raw) return [''];

    const words = raw.split(/\\s+/);
    const lines = [];
    let current = '';
    words.forEach(function(word) {
      const candidate = current ? current + ' ' + word : word;
      if (ctx.measureText(candidate).width > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    });
    if (current) lines.push(current);
    return lines.length ? lines : [''];
  }

  const img = new Image();
  img.onload = function() {
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    overlays.forEach(function(ov) {
      const x = Math.floor((ov.x_pct / 100) * canvas.width);
      const y = Math.floor((ov.y_pct / 100) * canvas.height);
      const w = Math.max(1, Math.ceil((ov.width_pct / 100) * canvas.width));
      const h = Math.max(1, Math.ceil((ov.height_pct / 100) * canvas.height));
      const fontSize = Math.max(12, (ov.font_size_pct / 100) * canvas.height);
      const fontStyle = ov.italic ? 'italic ' : '';
      const fontWeight = ov.font_weight || '400';
      const fontFamily = getFontFamily(ov);

      ctx.font = fontStyle + fontWeight + ' ' + fontSize + 'px ' + fontFamily;
      ctx.fillStyle = ov.color || '#6b7280';
      ctx.textAlign = ov.text_align || 'center';
      ctx.textBaseline = 'middle';
      ctx.direction = ov.category === 'religious' ? 'rtl' : 'ltr';

      let tx = x + w / 2;
      if (ov.text_align === 'left') tx = x + 5;
      if (ov.text_align === 'right') tx = x + w - 5;

      const lines = splitLines(ov, w * 0.92);
      const lineHeight = fontSize * (ov.font_family === 'cursive' ? 1.48 : 1.3);
      const totalH = lines.length * lineHeight;
      const startY = y + h / 2 - totalH / 2 + lineHeight / 2;
      const eraseBox = buildEraseBoxFromMeasuredText(ctx, ov, lines, tx, startY, lineHeight, canvas);

      if (!shouldSkipEraseZone(ov, eraseBox, canvas)) {
        ctx.fillStyle = sampleBackgroundColor(ov, eraseBox);
        ctx.fillRect(eraseBox.x, eraseBox.y, eraseBox.w, eraseBox.h);
      }

      ctx.fillStyle = ov.color || '#6b7280';
      lines.forEach(function(line, i) {
        ctx.fillText(line, tx, startY + i * lineHeight);
      });
    });

    try {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'EXPORT_READY',
        data: canvas.toDataURL('image/png'),
      }));
    } catch (e) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'EXPORT_ERROR',
        message: String(e),
      }));
    }
  };

  img.onerror = function() {
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'EXPORT_ERROR',
      message: 'Image non chargeable',
    }));
  };

  img.src = 'data:${mimeType};base64,${safeBase64}';
});
</script>
</body>
</html>`;
}
