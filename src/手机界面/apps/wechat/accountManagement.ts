import { klona } from 'klona';
import type { 微信数据 } from '../../types';

export type AccountMediaSnapshot = Record<string, { 头像: string; 表情包: Record<string, string> }>;

export function addWechatAccount(current: 微信数据, id: string, name: string, avatar: string): 微信数据 {
  if (current.账号[id]) return current;
  const trimmed = name.trim();
  if (!id || id === 'user' || !trimmed) throw new Error('账号信息无效。');
  const next = klona(current);
  next.账号[id] = { 昵称: trimmed, 头像: avatar, 表情包: {}, 好友: [] };
  return next;
}

export function saveWechatAccount(
  current: 微信数据,
  id: string,
  name: string,
  avatar: string,
  stickers: Record<string, string>,
  friends: string[],
): 微信数据 {
  if (!current.账号[id]) throw new Error('账号不存在。');
  const trimmed = name.trim();
  if (!trimmed) throw new Error('昵称不能为空。');
  const uniqueFriends = [...new Set(friends)];
  if (uniqueFriends.some(friend => friend === id || !current.账号[friend])) throw new Error('好友账号无效。');
  if (Object.entries(stickers).some(([label, image]) => !label.trim() || !image))
    throw new Error('表情包名称或图片无效。');
  const next = klona(current);
  const oldFriends = new Set(next.账号[id].好友);
  next.账号[id] = { ...next.账号[id], 昵称: trimmed, 头像: avatar, 表情包: { ...stickers }, 好友: uniqueFriends };
  for (const friend of new Set([...oldFriends, ...uniqueFriends])) {
    const peer = next.账号[friend];
    if (!peer) continue;
    peer.好友 = peer.好友.filter(value => value !== id);
    if (uniqueFriends.includes(friend)) peer.好友.push(id);
  }
  return next;
}

export function mediaSnapshot(accounts: 微信数据['账号']): AccountMediaSnapshot {
  return Object.fromEntries(
    Object.entries(accounts).map(([id, account]) => [id, { 头像: account.头像, 表情包: { ...account.表情包 } }]),
  );
}

export function restoreMissingStickers(accounts: 微信数据['账号'], snapshot: AccountMediaSnapshot): boolean {
  let changed = false;
  for (const [id, saved] of Object.entries(snapshot)) {
    const account = accounts[id];
    if (!account || !saved || !saved.表情包) continue;
    for (const [name, url] of Object.entries(saved.表情包)) {
      if (!Object.hasOwn(account.表情包, name) && typeof url === 'string') {
        account.表情包[name] = url;
        changed = true;
      }
    }
  }
  return changed;
}

/** 只在新聊天首次组装时应用脚本媒体，已有楼层的用户修改不被覆盖。 */
export function applyNewChatMediaSnapshot(
  accounts: 微信数据['账号'],
  snapshot: unknown,
  hasImage: (url: string) => boolean,
): void {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) return;
  for (const [id, value] of Object.entries(snapshot)) {
    const account = accounts[id];
    if (!account || !value || typeof value !== 'object' || Array.isArray(value)) continue;
    const media = value as { 头像?: unknown; 表情包?: unknown };
    if (typeof media.头像 === 'string') {
      if (media.头像 && !hasImage(media.头像)) throw new Error(`${id} 的头像在 Weline 图片库中缺失。`);
      account.头像 = media.头像;
    }
    if (media.表情包 && typeof media.表情包 === 'object' && !Array.isArray(media.表情包)) {
      for (const [name, url] of Object.entries(media.表情包)) {
        if (typeof url !== 'string' || !name) continue;
        if (!hasImage(url)) throw new Error(`${id} 的表情包「${name}」在 Weline 图片库中缺失。`);
        account.表情包[name] = url;
      }
    }
  }
}
