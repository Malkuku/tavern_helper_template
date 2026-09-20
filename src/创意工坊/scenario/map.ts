import type { MapEntry } from './types';

const allowedTags = new Set([
  'svg',
  'g',
  'path',
  'circle',
  'ellipse',
  'rect',
  'line',
  'polyline',
  'polygon',
  'title',
  'desc',
]);
const allowedAttributes = new Set([
  'viewbox',
  'xmlns',
  'fill',
  'fill-opacity',
  'stroke',
  'stroke-width',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-opacity',
  'opacity',
  'd',
  'cx',
  'cy',
  'r',
  'rx',
  'ry',
  'x',
  'y',
  'x1',
  'y1',
  'x2',
  'y2',
  'width',
  'height',
  'points',
  'transform',
  'role',
  'aria-label',
]);

export function sanitizeMapSvg(markup: string): string {
  const source = markup.trim();
  if (!source || !/^<svg(?:\s|>)/i.test(source) || !/<\/svg>$/i.test(source))
    throw new Error('地图图标必须是完整的 <svg> 字符串。');
  if (/<!|<\?|\b(?:href|src|style)\s*=|\bon[a-z]+\s*=/i.test(source))
    throw new Error('地图 SVG 包含禁止的脚本、样式或外部资源。');

  const tagPattern = /<\/?\s*([\w:-]+)([^<>]*)>/g;
  let match: RegExpExecArray | null;
  while ((match = tagPattern.exec(source))) {
    const tag = match[1].toLowerCase();
    if (!allowedTags.has(tag)) throw new Error(`地图 SVG 不允许 <${tag}> 标签。`);
    if (match[0].startsWith('</')) continue;
    const attributes = match[2].replace(/\/$/, '');
    const attrPattern = /([^\s=]+)\s*=\s*("[^"]*"|'[^']*')/g;
    let attr: RegExpExecArray | null;
    let consumed = '';
    while ((attr = attrPattern.exec(attributes))) {
      const name = attr[1].toLowerCase();
      if (!allowedAttributes.has(name)) throw new Error(`地图 SVG 不允许属性 ${name}。`);
      const value = attr[2].slice(1, -1);
      if (name === 'xmlns' && (tag !== 'svg' || value !== 'http://www.w3.org/2000/svg'))
        throw new Error('地图 SVG 的 xmlns 只能使用标准 SVG 命名空间。');
      if (name !== 'xmlns' && /(?:javascript|data|https?):/i.test(value))
        throw new Error(`地图 SVG 属性 ${name} 不允许 URL 或可执行协议。`);
      if ((name === 'fill' || name === 'stroke') && !isSafeSvgColor(value))
        throw new Error(`地图 SVG 的 ${name} 颜色无效。`);
      consumed += attr[0];
    }
    const residue = attributes.replace(attrPattern, '').trim();
    if (residue) throw new Error('地图 SVG 属性格式无效。');
  }
  return source;
}

export function renderMapSvg(markup: string): string {
  return sanitizeMapSvg(markup).replace(
    /<(svg|g|path|circle|ellipse|rect|line|polyline|polygon)\b([^<>]*)>/gi,
    (tag, name, raw) => {
      const colors: string[] = [];
      const attributes = String(raw).replace(
        /\s+(fill|stroke)\s*=\s*("([^"]*)"|'([^']*)')/gi,
        (_all, key, _quoted, doubleValue, singleValue) => {
          const value = doubleValue ?? singleValue;
          colors.push(`${String(key).toLowerCase()}:${value} !important`);
          return '';
        },
      );
      return `<${name}${attributes}${colors.length ? ` style="${colors.join(';')}"` : ''}>`;
    },
  );
}

export interface MapSvgDisplaySize {
  width?: number;
  height?: number;
  aspectRatio?: number;
}

const mapViewBoxPixelScale = 2;

export function mapSvgDisplaySize(markup: string): MapSvgDisplaySize {
  let source: string;
  try {
    source = sanitizeMapSvg(markup);
  } catch {
    return {};
  }
  const root = source.match(/^<svg\b([^<>]*)>/i)?.[1] ?? '';
  const dimensions: MapSvgDisplaySize = {};
  for (const match of root.matchAll(/(?:^|\s)(width|height)\s*=\s*("([^"]*)"|'([^']*)')/gi)) {
    const value = (match[3] ?? match[4]).trim();
    if (!/^\d+(?:\.\d+)?(?:px)?$/i.test(value)) continue;
    const number = Number.parseFloat(value);
    if (Number.isFinite(number) && number > 0) dimensions[match[1].toLowerCase() as 'width' | 'height'] = number;
  }
  const viewBoxValue = root.match(/\bviewBox\s*=\s*("([^"]*)"|'([^']*)')/i);
  const viewBox = (viewBoxValue?.[2] ?? viewBoxValue?.[3])
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);
  if (viewBox?.length === 4 && viewBox.every(Number.isFinite) && viewBox[2] > 0 && viewBox[3] > 0)
    dimensions.aspectRatio = viewBox[2] / viewBox[3];
  if (viewBox?.length === 4 && dimensions.width === undefined && dimensions.height === undefined) {
    dimensions.width = viewBox[2] * mapViewBoxPixelScale;
    dimensions.height = viewBox[3] * mapViewBoxPixelScale;
  }
  return dimensions;
}

function isSafeSvgColor(value: string): boolean {
  return /^(?:none|currentColor|transparent|#[0-9a-f]{3,8}|[a-z]+|(?:rgb|rgba|hsl|hsla)\([\d\s.,%+-]+\))$/i.test(
    value.trim(),
  );
}

export function mapContainsLocation(map: MapEntry | undefined, target: string): boolean {
  if (!map || !target) return false;
  const visit = (nodes: Record<string, any>): boolean =>
    Object.entries(nodes).some(([name, node]) => name === target || visit(node?.子地图 ?? {}));
  return visit(map.data as Record<string, any>);
}

export function findMapPath(nodes: Record<string, any>, target: string, path: string[] = []): string[] | undefined {
  for (const [name, node] of Object.entries(nodes ?? {})) {
    const next = [...path, name];
    if (name === target) return next;
    const found = findMapPath(node?.子地图 ?? {}, target, next);
    if (found) return found;
  }
}

export function mapTravelPath(nodes: Record<string, any>, start: string, end: string): string[] {
  const from = findMapPath(nodes, start),
    to = findMapPath(nodes, end);
  if (!from || !to) return [end];
  let common = 0;
  while (common < from.length && common < to.length && from[common] === to[common]) common++;
  const route = [...from.slice(common).reverse(), ...to.slice(common)];
  return route.length ? route : [end];
}
