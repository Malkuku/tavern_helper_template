import type { JsonObject } from './types';

export type MainlineBlockType = 'title' | 'text' | 'metric' | 'list' | 'tags' | 'divider' | 'container';
export interface MainlineBlock {
  id: string;
  type: MainlineBlockType;
  label?: string;
  source?: string[];
  variant: string;
  children?: MainlineBlock[];
}
export interface MainlineLayout {
  mode: 'preset' | 'custom';
  blocks: MainlineBlock[];
}
export interface MainlineMeta extends JsonObject {
  version: 1;
  layouts: Record<string, MainlineLayout>;
}

export const mainlineBlockCatalog: Record<MainlineBlockType, { label: string; variants: string[] }> = {
  title: { label: '标题', variants: ['display', 'section', 'eyebrow'] },
  text: { label: '正文', variants: ['prose', 'quote', 'callout'] },
  metric: { label: '指标', variants: ['number', 'gauge', 'badge'] },
  list: { label: '列表', variants: ['bullets', 'steps', 'cards'] },
  tags: { label: '标签', variants: ['pills', 'seals', 'plain'] },
  divider: { label: '分隔', variants: ['line', 'glyph', 'space'] },
  container: { label: '容器', variants: ['panel', 'stack', 'grid'] },
};

export function isMainlineMeta(value: unknown): value is MainlineMeta {
  return Boolean(
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    (value as MainlineMeta).version === 1 &&
    (value as MainlineMeta).layouts &&
    typeof (value as MainlineMeta).layouts === 'object' &&
    !Array.isArray((value as MainlineMeta).layouts),
  );
}

export function mainlineEntries(mainline: JsonObject) {
  return Object.entries(mainline).filter(([key]) => key !== 'meta');
}

export function createMainlineBlock(type: MainlineBlockType, source?: string[], label?: string): MainlineBlock {
  return {
    id: crypto.randomUUID(),
    type,
    source,
    label,
    variant: mainlineBlockCatalog[type].variants[0],
    ...(type === 'container' ? { children: [] } : {}),
  };
}

export function defaultMainlineLayout(data: unknown): MainlineLayout {
  const blocks = [createMainlineBlock('title', ['$title'])];
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    blocks.push(createMainlineBlock('text', ['$value']));
    return { mode: 'preset', blocks };
  }
  for (const [key, value] of Object.entries(data)) {
    const type: MainlineBlockType = Array.isArray(value)
      ? value.every(item => typeof item !== 'object')
        ? 'list'
        : 'text'
      : typeof value === 'number'
        ? 'metric'
        : 'text';
    blocks.push(createMainlineBlock(type, [key], key));
  }
  return { mode: 'preset', blocks };
}

export function ensureMainlineMeta(mainline: JsonObject): MainlineMeta {
  const current = isMainlineMeta(mainline.meta) ? mainline.meta : { version: 1 as const, layouts: {} };
  for (const [key, data] of mainlineEntries(mainline)) {
    const layout = current.layouts[key];
    if (!layout || typeof layout !== 'object' || !Array.isArray(layout.blocks)) {
      current.layouts[key] = defaultMainlineLayout(data);
    } else if (layout.mode !== 'custom' && layout.mode !== 'preset') {
      // 旧版布局没有模式标记；保守迁移为预设视觉，避免仅打开编辑器就改变玩家界面。
      layout.mode = 'preset';
    }
  }
  for (const key of Object.keys(current.layouts)) if (!(key in mainline)) delete current.layouts[key];
  mainline.meta = current;
  return current;
}

export function resolveMainlineSource(data: unknown, title: string, source?: string[]) {
  if (!source?.length) return undefined;
  if (source[0] === '$title') return title;
  if (source[0] === '$value') return data;
  let value: unknown = data;
  for (const key of source) {
    if (!value || typeof value !== 'object') return undefined;
    value = (value as Record<string, unknown>)[key];
  }
  return value;
}

export function flattenMainlineSources(data: unknown, prefix: string[] = []): { path: string[]; label: string }[] {
  if (!data || typeof data !== 'object') return [{ path: ['$value'], label: '当前值' }];
  const result: { path: string[]; label: string }[] = [];
  for (const [key, value] of Object.entries(data)) {
    const path = [...prefix, key];
    result.push({ path, label: path.join(' › ') });
    if (value && typeof value === 'object' && !Array.isArray(value))
      result.push(...flattenMainlineSources(value, path));
  }
  return result;
}
