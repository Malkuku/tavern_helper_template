import { ref } from 'vue';
import type { 微信数据 } from '../../types';
import { addNamedSticker, readWechatStickerLibrary, resolveWechatImage, stickerReference } from './imageLibrary';

export type SaveStickerAccount = (
  id: string,
  name: string,
  avatar: string,
  stickers: Record<string, string>,
  friends: string[],
) => Promise<void>;
export type StickerDraft = { id: number; name: string; url: string; file?: File; imported: boolean; error: string };

/** 文件、图库和聊天添加共用；入库与账号保存的部分成功可重试。 */
export function useStickerImport(
  accountId: () => string,
  accounts: () => 微信数据['账号'],
  saveAccount: SaveStickerAccount,
) {
  const drafts = ref<StickerDraft[]>([]);
  const busy = ref(false);
  const error = ref('');
  let nextId = 0;

  function addImage(url: string, name = '', file?: File) {
    const library = readWechatStickerLibrary();
    const existing = Object.entries(library).find(([label, source]) =>
      file ? label === name && resolveWechatImage(source) === url : source === url,
    );
    drafts.value.push({ id: nextId++, name: existing?.[0] ?? name, url, file, imported: !!existing, error: '' });
  }

  async function save(): Promise<boolean> {
    if (busy.value) return false;
    error.value = '';
    const account = accounts()[accountId()];
    if (!account) {
      error.value = '当前账号不存在，请先创建账号。';
      return false;
    }
    if (!drafts.value.length) {
      error.value = '请先选择图片。';
      return false;
    }
    const library = readWechatStickerLibrary();
    const names = new Set<string>();
    for (const draft of drafts.value) {
      draft.name = draft.name.trim();
      draft.error = '';
      if (!draft.name) draft.error = '请填写名称。';
      else if (
        (!draft.imported && draft.name.length > 30) ||
        /[<>]/.test(draft.name) ||
        ['__proto__', 'constructor', 'prototype'].includes(draft.name)
      )
        draft.error = '名称不可用，请使用不超过 30 字的名称，不含尖括号。';
      else if (names.has(draft.name)) draft.error = '清单中名称重复，请修改或移除一张。';
      else if (!draft.imported && (Object.hasOwn(library, draft.name) || Object.hasOwn(account.表情包, draft.name)))
        draft.error = '名称已存在，请换一个名称。';
      names.add(draft.name);
    }
    if (drafts.value.some(draft => draft.error)) {
      error.value = '请修正标出的名称。';
      return false;
    }
    const conflicts = drafts.value.filter(
      draft =>
        draft.imported && account.表情包[draft.name] && account.表情包[draft.name] !== stickerReference(draft.name),
    );
    if (
      conflicts.length &&
      !window.confirm(
        `替换当前账号的同名表情 ${conflicts.map(draft => draft.name).join('、')}？该账号同名历史消息也会显示新图片。`,
      )
    )
      return false;
    busy.value = true;
    try {
      for (const draft of drafts.value) {
        if (draft.imported) continue;
        try {
          addNamedSticker(draft.name, draft.url);
          draft.imported = true;
        } catch (cause) {
          draft.error = cause instanceof Error ? cause.message : '图片保存失败。';
        }
      }
      const imported = drafts.value.filter(draft => draft.imported);
      if (imported.length) {
        const current = accounts()[accountId()];
        if (!current) throw new Error('当前账号已不存在。');
        const stickers = { ...current.表情包 };
        for (const draft of imported) stickers[draft.name] = stickerReference(draft.name);
        await saveAccount(accountId(), current.昵称, current.头像, stickers, current.好友);
        drafts.value = drafts.value.filter(draft => !draft.imported);
      }
      if (drafts.value.length) {
        error.value = '部分图片未保存，失败条目已保留，可重试。';
        return false;
      }
      return true;
    } catch (cause) {
      error.value = `图片已保留，账号或备份保存未完成：${cause instanceof Error ? cause.message : '保存失败'}。点击保存可重试。`;
      return false;
    } finally {
      busy.value = false;
    }
  }
  return { drafts, busy, error, addImage, save };
}
