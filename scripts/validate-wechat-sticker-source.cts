// eslint-disable-next-line import-x/no-nodejs-modules
import assert from 'node:assert/strict';
import type { 微信数据 } from '../src/手机界面/types';
import { stickerSourceByName } from '../src/手机界面/apps/wechat/stickerSource';

const account = (stickers: Record<string, string>) => ({ 昵称: '', 头像: '', 表情包: stickers, 好友: [] });
const accounts: 微信数据['账号'] = {
  user: account({ 捂脸: 'user-image', 同名: 'user-version', 损坏: 'missing' }),
  凛: account({ 同名: 'rin-version', 损坏: 'rin-image' }),
  雫: account({ 花: 'shizuku-image' }),
};
const resolve = (url: string | undefined) => (url === 'missing' ? '' : (url ?? ''));

assert.equal(stickerSourceByName(accounts, '凛', '同名', resolve), 'rin-version', '发送者的同名表情优先');
assert.equal(stickerSourceByName(accounts, '雫', '同名', resolve), 'user-version', 'AI 写错发送者时使用现有图片');
assert.equal(stickerSourceByName(accounts, '凛', '花', resolve), 'shizuku-image', '也能找到其他角色库存');
assert.equal(stickerSourceByName(accounts, 'user', '损坏', resolve), 'rin-image', '无效图片引用继续寻找');
assert.equal(stickerSourceByName(accounts, '凛', '不存在', resolve), '', '无匹配时保留文本回退');
console.log('微信表情包跨账号解析验证通过');
