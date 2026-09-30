import { shallowRef } from 'vue';
import type { 微信数据 } from '../../types';
import { removeImagePlacement, WECHAT_IMAGE_CATEGORIES_KEY } from './imageCategories';

export const WECHAT_IMAGE_LIBRARY_KEY = 'magicGirlWeChatImageLibrary';
export const WECHAT_MEDIA_SNAPSHOT_KEY = 'magicGirlWeChatMediaSnapshot';
export const WECHAT_STICKER_LIBRARY_KEY = 'magicGirlWeChatStickerLibrary';
const prefix = 'script-image://';
const stickerPrefix = 'sticker://';
const scope = () => ({ type: 'script' as const, script_id: getScriptId() });
const libraryState = shallowRef<Record<string, string>>({});
const stickerState = shallowRef<Record<string, string>>({});

export function isImageDataUrl(value: unknown): value is string {
  return typeof value === 'string' && /^data:image\/[\w.+-]+;base64,[A-Za-z0-9+/=]+$/.test(value);
}

export function readWechatImageLibrary(): Record<string, string> {
  const raw = getVariables(scope())?.[WECHAT_IMAGE_LIBRARY_KEY];
  const library: Record<string, string> = Object.create(null);
  if (raw && typeof raw === 'object' && !Array.isArray(raw))
    for (const [id, value] of Object.entries(raw)) if (isImageDataUrl(value)) library[id] = value;
  return library;
}

export function refreshWechatImageLibrary(): void {
  libraryState.value = readWechatImageLibrary();
  stickerState.value = readWechatStickerLibrary();
}

export function readWechatStickerLibrary(): Record<string, string> {
  const raw = getVariables(scope())?.[WECHAT_STICKER_LIBRARY_KEY];
  const library: Record<string, string> = Object.create(null);
  if (raw && typeof raw === 'object' && !Array.isArray(raw))
    for (const [name, url] of Object.entries(raw))
      if (name.trim() && typeof url === 'string' && url) library[name] = url;
  return library;
}

export function stickerLibraryEntries(): [string, string][] {
  return Object.entries(stickerState.value);
}

export function stickerReference(name: string): string {
  return `${stickerPrefix}${name}`;
}

export function addNamedSticker(name: string, source: string): string {
  const label = name.trim();
  if (!label) throw new Error('请填写表情包名称。');
  if (label.includes('<') || label.includes('>')) throw new Error('表情包名称不能包含尖括号。');
  if (['__proto__', 'constructor', 'prototype'].includes(label)) throw new Error('该表情包名称不可用。');
  if (Object.hasOwn(readWechatStickerLibrary(), label)) throw new Error('表情包名称已存在。');
  if (!isImageDataUrl(source) && !(source.startsWith(prefix) && hasWechatImage(source)) && !/^https?:\/\//.test(source))
    throw new Error('请选择有效的表情图片。');
  const url = isImageDataUrl(source) ? storeWechatImage(source) : source;
  updateVariablesWith(
    variables => ({
      ...variables,
      [WECHAT_STICKER_LIBRARY_KEY]: { ...(variables[WECHAT_STICKER_LIBRARY_KEY] || {}), [label]: url },
    }),
    scope(),
  );
  refreshWechatImageLibrary();
  return stickerReference(label);
}

export function resolveWechatImage(url: string | undefined): string {
  if (!url) return '';
  if (url.startsWith(stickerPrefix)) {
    const source = stickerState.value[url.slice(stickerPrefix.length)];
    return source && !source.startsWith(stickerPrefix) ? resolveWechatImage(source) : '';
  }
  if (!url.startsWith(prefix)) return url;
  return libraryState.value[url.slice(prefix.length)] || '';
}

export function hasWechatImage(url: string): boolean {
  if (url.startsWith(stickerPrefix)) {
    const source = readWechatStickerLibrary()[url.slice(stickerPrefix.length)];
    return !!source && !source.startsWith(stickerPrefix) && hasWechatImage(source);
  }
  if (!url.startsWith(prefix)) return true;
  return !!readWechatImageLibrary()[url.slice(prefix.length)];
}

export function imageLibraryEntries(): [string, string][] {
  return Object.entries(libraryState.value).map(([id, data]) => [`${prefix}${id}`, data]);
}

export function imageIdFromUrl(url: string): string {
  return url.startsWith(prefix) ? url.slice(prefix.length) : '';
}

export function storeWechatImage(dataUrl: string): string {
  if (!isImageDataUrl(dataUrl)) throw new Error('请选择有效的图片。');
  const existing = Object.entries(readWechatImageLibrary()).find(([, value]) => value === dataUrl);
  if (existing) return `${prefix}${existing[0]}`;
  const id = crypto.randomUUID();
  updateVariablesWith(
    variables => ({
      ...variables,
      [WECHAT_IMAGE_LIBRARY_KEY]: { ...(variables[WECHAT_IMAGE_LIBRARY_KEY] || {}), [id]: dataUrl },
    }),
    scope(),
  );
  refreshWechatImageLibrary();
  return `${prefix}${id}`;
}

function readImageDataUrl(file: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      isImageDataUrl(reader.result) ? resolve(reader.result) : reject(new Error('图片格式无效。'));
    reader.onerror = () => reject(reader.error ?? new Error('无法读取图片。'));
    reader.readAsDataURL(file);
  });
}

async function smallerWebp(file: Blob): Promise<Blob | null> {
  if (!/^image\/(png|jpeg|webp|avif)$/.test(file.type) || typeof createImageBitmap !== 'function') return null;
  const image = await createImageBitmap(file);
  try {
    const factor = Math.min(1, 2048 / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * factor));
    canvas.height = Math.max(1, Math.round(image.height * factor));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('无法创建图片压缩画布。');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const compressed = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(value => (value ? resolve(value) : reject(new Error('图片压缩失败。'))), 'image/webp', 0.82),
    );
    return compressed.type === 'image/webp' && compressed.size < file.size ? compressed : null;
  } finally {
    image.close();
  }
}

export async function readWechatImageFile(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('请选择图片文件。');
  return readImageDataUrl((await smallerWebp(file)) ?? file);
}

export async function compressWechatImageLibrary(): Promise<{ count: number; savedBytes: number }> {
  const original = readWechatImageLibrary();
  const replacements: Record<string, string> = {};
  let savedBytes = 0;
  for (const [id, dataUrl] of Object.entries(original)) {
    const blob = await (await fetch(dataUrl)).blob();
    const compressed = await smallerWebp(blob);
    if (!compressed) continue;
    replacements[id] = await readImageDataUrl(compressed);
    savedBytes += dataUrl.length - replacements[id].length;
  }
  if (Object.keys(replacements).length) {
    updateVariablesWith(variables => {
      const library = { ...(variables[WECHAT_IMAGE_LIBRARY_KEY] || {}) };
      for (const [id, replacement] of Object.entries(replacements))
        if (library[id] === original[id]) library[id] = replacement;
      return { ...variables, [WECHAT_IMAGE_LIBRARY_KEY]: library };
    }, scope());
    refreshWechatImageLibrary();
  }
  return { count: Object.keys(replacements).length, savedBytes };
}

export function imageReferences(accounts: 微信数据['账号']): Set<string> {
  const refs = new Set<string>();
  for (const image of Object.values(readWechatStickerLibrary())) if (image.startsWith(prefix)) refs.add(image);
  for (const account of Object.values(accounts)) {
    if (account.头像.startsWith(prefix)) refs.add(account.头像);
    for (const image of Object.values(account.表情包)) if (image.startsWith(prefix)) refs.add(image);
  }
  return refs;
}

export function deleteWechatImage(url: string, accounts: 微信数据['账号']): void {
  if (!url.startsWith(prefix)) throw new Error('只能清理图片库中的图片。');
  if (imageReferences(accounts).has(url)) throw new Error('该图片仍被当前聊天的账号引用。');
  const saved = getVariables(scope())?.[WECHAT_MEDIA_SNAPSHOT_KEY];
  if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
    for (const value of Object.values(saved)) {
      if (!value || typeof value !== 'object') continue;
      const media = value as { 头像?: unknown; 表情包?: unknown };
      if (
        media.头像 === url ||
        (media.表情包 && typeof media.表情包 === 'object' && Object.values(media.表情包).includes(url))
      )
        throw new Error('该图片仍被脚本中的账号备份引用。');
    }
  }
  const id = url.slice(prefix.length);
  updateVariablesWith(variables => {
    const library = { ...(variables[WECHAT_IMAGE_LIBRARY_KEY] || {}) };
    delete library[id];
    return {
      ...variables,
      [WECHAT_IMAGE_LIBRARY_KEY]: library,
      [WECHAT_IMAGE_CATEGORIES_KEY]: removeImagePlacement(variables[WECHAT_IMAGE_CATEGORIES_KEY], id),
    };
  }, scope());
  refreshWechatImageLibrary();
}
