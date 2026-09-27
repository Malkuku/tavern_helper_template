/** 商店新生成图标除了通过 SVG 安全白名单，还须是不含文字的正方形图形。 */
export function isGeneratedShopIcon(svg: string | undefined): boolean {
  if (!svg || /<(?:title|desc)\b/i.test(svg) || svg.replace(/<[^>]+>/g, '').trim()) return false;
  const rootTag = /^<svg\b([^>]*)>/i.exec(svg.trim());
  const viewBox = rootTag && /\bviewBox\s*=\s*["']([^"']+)["']/.exec(rootTag[1]);
  const values = viewBox?.[1].trim().split(/\s+/).map(Number);
  return !!values && values.length === 4 && values.every(Number.isFinite) && values[2] > 0 && values[2] === values[3];
}
