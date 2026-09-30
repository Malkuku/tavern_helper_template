// eslint-disable-next-line import-x/no-nodejs-modules
import assert from 'node:assert/strict';
import { saveWechatAccount } from '../src/手机界面/apps/wechat/accountManagement';
import {
  addNamedSticker,
  deleteWechatImage,
  hasWechatImage,
  imageReferences,
  readWechatStickerLibrary,
  refreshWechatImageLibrary,
  resolveWechatImage,
  stickerLibraryEntries,
  stickerReference,
} from '../src/手机界面/apps/wechat/imageLibrary';
import { stickerSourceByName } from '../src/手机界面/apps/wechat/stickerSource';
import type { 微信数据 } from '../src/手机界面/types';

let variables: Record<string, any> = {};
(globalThis as any).getScriptId = () => 'test-script';
(globalThis as any).getVariables = () => variables;
(globalThis as any).updateVariablesWith = (updater: (value: Record<string, any>) => Record<string, any>) => {
  variables = updater(variables);
  return variables;
};

refreshWechatImageLibrary();
const picture = 'data:image/png;base64,iVBORw0KGgo=';
const ref = addNamedSticker('开心', picture);
assert.equal(ref, stickerReference('开心'));
assert.equal(readWechatStickerLibrary().开心.startsWith('script-image://'), true);
assert.deepEqual(
  stickerLibraryEntries().map(([name]) => name),
  ['开心'],
);
assert.equal(resolveWechatImage(ref), picture);
assert.equal(hasWechatImage(ref), true);
assert.throws(() => addNamedSticker('开心', 'https://example.com/other.png'), /已存在/);
assert.throws(() => addNamedSticker('坏<名', picture), /尖括号/);
assert.throws(() => addNamedSticker('空图', 'sticker://开心'), /有效/);

const account = (stickers: Record<string, string>) => ({ 昵称: '角色', 头像: '', 表情包: stickers, 好友: [] });
const current: 微信数据 = {
  账号: { user: account({}), alice: account({ 旧表情: 'https://example.com/old.png' }) },
  会话: {},
  准备发送: null,
};
const updated = saveWechatAccount(current, 'user', '我', '', { 开心: ref }, []);
assert.equal(updated.账号.user.表情包.开心, ref, '账号保存具名库引用');
assert.equal(stickerSourceByName(updated.账号, 'user', '开心', resolveWechatImage), picture);
assert.equal(stickerSourceByName(updated.账号, 'alice', '旧表情', resolveWechatImage), 'https://example.com/old.png');
const pictureRef = readWechatStickerLibrary().开心;
assert.equal(imageReferences({}).has(pictureRef), true, '即使当前聊天无账号引用，具名库也保护图片');
assert.throws(() => deleteWechatImage(pictureRef, {}), /仍被/);
assert.equal(readWechatStickerLibrary().开心, pictureRef, '清理失败不删除表情库项');
console.log('具名表情库入库、账号引用、历史图片与清理保护验证通过');
