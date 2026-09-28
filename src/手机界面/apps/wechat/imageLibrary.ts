import { shallowRef } from 'vue';
import type { 微信数据 } from '../../types';
import { removeImagePlacement, WECHAT_IMAGE_CATEGORIES_KEY } from './imageCategories';

export const WECHAT_IMAGE_LIBRARY_KEY = 'magicGirlWeChatImageLibrary';
export const WECHAT_MEDIA_SNAPSHOT_KEY = 'magicGirlWeChatMediaSnapshot';
const prefix = 'script-image://';
const scope = () => ({ type: 'script' as const, script_id: getScriptId() });
const libraryState = shallowRef<Record<string, string>>({});

export function isImageDataUrl(value: unknown): value is string {
  return typeof value === 'string' && /^data:image\/[\w.+-]+;base64,[A-Za-z0-9+/=]+$/.test(value);
}

export function readWechatImageLibrary(): Record<string, string> {
  const raw = getVariables(scope())?.[WECHAT_IMAGE_LIBRARY_KEY];
  const library: Record<string, string> = {};
  if (raw && typeof raw === 'object' && !Array.isArray(raw))
    for (const [id, value] of Object.entries(raw)) if (isImageDataUrl(value)) library[id] = value;
  return library;
}

export function refreshWechatImageLibrary(): void {
  libraryState.value = readWechatImageLibrary();
}

export function resolveWechatImage(url: string | undefined): string {
  if (!url) return '';
  if (!url.startsWith(prefix)) return url;
  return libraryState.value[url.slice(prefix.length)] || '';
}

export function hasWechatImage(url: string): boolean {
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

export async function readWechatImageFile(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('请选择图片文件。');
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      isImageDataUrl(reader.result) ? resolve(reader.result) : reject(new Error('图片格式无效。'));
    reader.onerror = () => reject(reader.error ?? new Error('无法读取图片。'));
    reader.readAsDataURL(file);
  });
}

export function imageReferences(accounts: 微信数据['账号']): Set<string> {
  const refs = new Set<string>();
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
