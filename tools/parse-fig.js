// Decode a .fig canvas (fig-kiwi format) into JSON + readable outline
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const kiwi = require('kiwi-schema');

const DIR = __dirname;
const buf = fs.readFileSync(path.join(DIR, 'figfile', 'canvas.fig'));

if (buf.toString('utf8', 0, 8) !== 'fig-kiwi') throw new Error('bad magic');
let off = 8;
const version = buf.readUInt32LE(off); off += 4;
console.log('fig-kiwi version', version);

function readChunk() {
  const size = buf.readUInt32LE(off); off += 4;
  const raw = buf.subarray(off, off + size); off += size;
  // try raw deflate, then zlib, then zstd
  try { return zlib.inflateRawSync(raw); } catch (e) {}
  try { return zlib.inflateSync(raw); } catch (e) {}
  if (zlib.zstdDecompressSync) { try { return zlib.zstdDecompressSync(raw); } catch (e) {} }
  return raw; // maybe uncompressed
}

const schemaBuf = readChunk();
const dataBuf = readChunk();
console.log('schema bytes', schemaBuf.length, 'data bytes', dataBuf.length);

const schema = kiwi.compileSchema(kiwi.decodeBinarySchema(new Uint8Array(schemaBuf)));
const message = schema.decodeMessage(new Uint8Array(dataBuf));
console.log('nodeChanges:', message.nodeChanges ? message.nodeChanges.length : 0, 'blobs:', message.blobs ? message.blobs.length : 0);

// ---- helpers ----
const gid = g => g ? `${g.sessionID}:${g.localID}` : null;
const hex = c => {
  if (!c) return null;
  const h = v => Math.round((v ?? 0) * 255).toString(16).padStart(2, '0');
  const base = `#${h(c.r)}${h(c.g)}${h(c.b)}`;
  return (c.a !== undefined && c.a < 0.999) ? `${base}@${(+c.a).toFixed(2)}` : base;
};
const bytesToHex = b => Buffer.from(b).toString('hex');

function paintInfo(p) {
  if (!p) return null;
  const o = { type: p.type };
  if (p.visible === false) o.hidden = true;
  if (p.color) o.color = hex(p.color);
  if (p.opacity !== undefined && p.opacity < 0.999) o.opacity = +p.opacity.toFixed(3);
  if (p.image && p.image.hash) o.imageHash = bytesToHex(p.image.hash);
  if (p.imageThumbnail && p.imageThumbnail.hash) o.thumbHash = bytesToHex(p.imageThumbnail.hash);
  if (p.stops) o.stops = p.stops.map(s => ({ pos: +(+s.position).toFixed(3), color: hex(s.color) }));
  if (p.blendMode && p.blendMode !== 'NORMAL') o.blend = p.blendMode;
  return o;
}

// ---- build node map/tree ----
const nodes = new Map();
for (const nc of message.nodeChanges || []) {
  nodes.set(gid(nc.guid), nc);
}
const children = new Map();
for (const nc of message.nodeChanges || []) {
  const pid = nc.parentIndex ? gid(nc.parentIndex.guid) : null;
  if (pid) {
    if (!children.has(pid)) children.set(pid, []);
    children.get(pid).push(nc);
  }
}
// sort children by parentIndex.position (fractional-index string)
for (const arr of children.values()) {
  arr.sort((a, b) => {
    const pa = a.parentIndex.position || '', pb = b.parentIndex.position || '';
    return pa < pb ? -1 : pa > pb ? 1 : 0;
  });
}

function nodeLine(nc) {
  const parts = [];
  parts.push(`${nc.type || '?'} "${nc.name || ''}"`);
  if (nc.size) parts.push(`size=${+nc.size.x.toFixed(1)}x${+nc.size.y.toFixed(1)}`);
  if (nc.transform) parts.push(`pos=(${+nc.transform.m02.toFixed(1)},${+nc.transform.m12.toFixed(1)})`);
  if (nc.opacity !== undefined && nc.opacity < 0.999) parts.push(`opacity=${+nc.opacity.toFixed(2)}`);
  if (nc.visible === false) parts.push('HIDDEN');

  // auto layout
  if (nc.stackMode && nc.stackMode !== 'NONE') {
    let al = `layout=${nc.stackMode}`;
    if (nc.stackSpacing !== undefined) al += ` gap=${+nc.stackSpacing.toFixed(1)}`;
    const pads = [nc.stackVerticalPadding, nc.stackHorizontalPadding, nc.stackPaddingBottom, nc.stackPaddingRight]
      .map(v => v === undefined ? 0 : +v.toFixed(1));
    if (pads.some(v => v)) al += ` pad(tlbr)=${pads[0]}/${pads[1]}/${pads[2]}/${pads[3]}`;
    if (nc.stackPrimaryAlignItems) al += ` main=${nc.stackPrimaryAlignItems}`;
    if (nc.stackCounterAlignItems) al += ` cross=${nc.stackCounterAlignItems}`;
    if (nc.stackPrimarySizing) al += ` primarySizing=${nc.stackPrimarySizing}`;
    if (nc.stackCounterSizing) al += ` counterSizing=${nc.stackCounterSizing}`;
    if (nc.stackWrap && nc.stackWrap !== 'NO_WRAP') al += ` wrap=${nc.stackWrap}`;
    parts.push(al);
  }
  if (nc.stackChildPrimaryGrow) parts.push(`grow=${nc.stackChildPrimaryGrow}`);
  if (nc.stackChildAlignSelf && nc.stackChildAlignSelf !== 'AUTO') parts.push(`alignSelf=${nc.stackChildAlignSelf}`);
  if (nc.stackPositioning === 'ABSOLUTE') parts.push('absolute');
  if (nc.horizontalConstraint && nc.horizontalConstraint !== 'MIN') parts.push(`hC=${nc.horizontalConstraint}`);
  if (nc.verticalConstraint && nc.verticalConstraint !== 'MIN') parts.push(`vC=${nc.verticalConstraint}`);

  // corners
  if (nc.cornerRadius) parts.push(`radius=${+nc.cornerRadius.toFixed(1)}`);
  if (nc.rectangleTopLeftCornerRadius || nc.rectangleTopRightCornerRadius || nc.rectangleBottomLeftCornerRadius || nc.rectangleBottomRightCornerRadius) {
    parts.push(`radii=${[nc.rectangleTopLeftCornerRadius, nc.rectangleTopRightCornerRadius, nc.rectangleBottomRightCornerRadius, nc.rectangleBottomLeftCornerRadius].map(v => v ? +v.toFixed(1) : 0).join('/')}`);
  }

  // paints
  const fills = (nc.fillPaints || []).map(paintInfo).filter(Boolean);
  if (fills.length) parts.push(`fill=${JSON.stringify(fills)}`);
  const strokes = (nc.strokePaints || []).map(paintInfo).filter(Boolean);
  if (strokes.length) {
    parts.push(`stroke=${JSON.stringify(strokes)} w=${nc.strokeWeight !== undefined ? +nc.strokeWeight.toFixed(1) : 1}${nc.strokeAlign ? ' ' + nc.strokeAlign : ''}`);
  }
  // effects
  if (nc.effects && nc.effects.length) {
    parts.push(`effects=${JSON.stringify(nc.effects.map(e => ({
      type: e.type, color: hex(e.color), off: e.offset ? [+e.offset.x.toFixed(1), +e.offset.y.toFixed(1)] : null, radius: e.radius, spread: e.spread || 0, visible: e.visible !== false
    })))}`);
  }

  // text
  if (nc.type === 'TEXT') {
    const t = [];
    if (nc.fontName) t.push(`font="${nc.fontName.family} ${nc.fontName.style}"`);
    if (nc.fontSize !== undefined) t.push(`fs=${+nc.fontSize.toFixed(1)}`);
    if (nc.lineHeight) t.push(`lh=${JSON.stringify(nc.lineHeight)}`);
    if (nc.letterSpacing) t.push(`ls=${JSON.stringify(nc.letterSpacing)}`);
    if (nc.textAlignHorizontal && nc.textAlignHorizontal !== 'LEFT') t.push(`align=${nc.textAlignHorizontal}`);
    if (nc.textCase && nc.textCase !== 'ORIGINAL') t.push(`case=${nc.textCase}`);
    if (nc.textDecoration && nc.textDecoration !== 'NONE') t.push(`deco=${nc.textDecoration}`);
    if (nc.paragraphSpacing) t.push(`paraSpace=${nc.paragraphSpacing}`);
    if (nc.textAutoResize) t.push(`autoresize=${nc.textAutoResize}`);
    let chars = null;
    if (nc.textData && nc.textData.characters !== undefined) chars = nc.textData.characters;
    parts.push(t.join(' '));
    if (chars !== null) parts.push(`text=${JSON.stringify(chars)}`);
    if (nc.textData && nc.textData.styleOverrideTable && nc.textData.styleOverrideTable.length) parts.push(`(+${nc.textData.styleOverrideTable.length} style overrides)`);
  }
  return parts.join(' | ');
}

// roots: nodes whose parent is DOCUMENT or missing / type CANVAS
let out = [];
function walk(id, depth) {
  const nc = nodes.get(id);
  if (!nc) return;
  out.push('  '.repeat(depth) + nodeLine(nc) + `   [${id}]`);
  for (const ch of children.get(id) || []) walk(gid(ch.guid), depth + 1);
}
const roots = (message.nodeChanges || []).filter(nc => nc.type === 'DOCUMENT');
for (const r of roots) walk(gid(r.guid), 0);

fs.writeFileSync(path.join(DIR, 'fig-outline.txt'), out.join('\n'));
console.log('outline lines:', out.length);

// dump raw json (without blobs' byte arrays) for detailed queries
const replacer = (k, v) => {
  if (v && v.constructor === Uint8Array) return '<bytes:' + v.length + '>';
  return v;
};
fs.writeFileSync(path.join(DIR, 'fig-raw.json'), JSON.stringify(message, replacer));
console.log('raw json saved');

// text style overrides detail dump for TEXT nodes
const textDetails = [];
for (const nc of message.nodeChanges || []) {
  if (nc.type === 'TEXT' && nc.textData) {
    textDetails.push({ id: gid(nc.guid), name: nc.name, data: nc.textData });
  }
}
fs.writeFileSync(path.join(DIR, 'fig-text.json'), JSON.stringify(textDetails, replacer, 1));
console.log('text nodes:', textDetails.length);
