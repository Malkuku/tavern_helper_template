import type { 微信数据 } from '../../types';

/** 消息中的表情包只有名称；发送者库存缺失时，从当前聊天的其他账号中找同名图片。 */
export function stickerSourceByName(
  accounts: 微信数据['账号'],
  sender: string,
  name: string,
  resolve: (url: string | undefined) => string,
): string {
  const owners = [...new Set([sender, 'user', ...Object.keys(accounts).sort()])];
  for (const id of owners) {
    const image = resolve(accounts[id]?.表情包?.[name]);
    if (image) return image;
  }
  return '';
}
