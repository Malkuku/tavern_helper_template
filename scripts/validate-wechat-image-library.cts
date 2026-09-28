import assert from 'node:assert/strict';
import {
  applyNewChatMediaSnapshot,
  saveWechatAccount,
  mediaSnapshot,
  restoreMissingStickers,
} from '../src/手机界面/apps/wechat/accountManagement';
import {
  deleteWechatImage,
  hasWechatImage,
  imageReferences,
  readWechatImageLibrary,
  refreshWechatImageLibrary,
  resolveWechatImage,
  storeWechatImage,
} from '../src/手机界面/apps/wechat/imageLibrary';
import { addSticker } from '../src/手机界面/apps/wechat/wechatData';
import type { 微信数据 } from '../src/手机界面/types';

let variables: Record<string, any> = {};
(globalThis as any).getScriptId = () => 'test-script';
(globalThis as any).getVariables = () => variables;
(globalThis as any).updateVariablesWith = (updater: (value: Record<string, any>) => Record<string, any>) => {
  variables = updater(variables);
  return variables;
};

const png = 'data:image/png;base64,iVBORw0KGgo=';
const url = storeWechatImage(png);
assert.match(url, /^script-image:\/\/[0-9a-f-]+$/);
assert.equal(storeWechatImage(png), url, '重复上传复用同一库项');
assert.equal(readWechatImageLibrary()[url.slice('script-image://'.length)], png);
refreshWechatImageLibrary();
assert.equal(resolveWechatImage(url), png);
assert.equal(resolveWechatImage('https://example.com/a.png'), 'https://example.com/a.png');
assert.equal(hasWechatImage('script-image://missing'), false);

const account = (name: string, friends: string[]) => ({ 昵称: name, 头像: '', 表情包: {}, 好友: friends });
const current: 微信数据 = {
  账号: { user: account('我', []), alice: account('爱丽丝', []), bob: account('鲍勃', []) },
  会话: {},
  准备发送: null,
};
const updated = saveWechatAccount(current, 'alice', '爱丽丝2', url, { 微笑: url }, ['user', 'bob']);
assert.deepEqual(updated.账号.alice.好友, ['user', 'bob']);
assert.deepEqual(updated.账号.user.好友, ['alice']);
assert.deepEqual(updated.账号.bob.好友, ['alice']);
assert.deepEqual(current.账号.user.好友, [], '编辑不应修改原对象');
assert.equal(addSticker(updated, '星星', url).账号.user.表情包.星星, url);
const removed = saveWechatAccount(updated, 'alice', '爱丽丝2', '', {}, []);
assert.deepEqual(removed.账号.user.好友, []);
assert.deepEqual(removed.账号.bob.好友, []);
assert.equal(imageReferences(updated.账号).has(url), true);
assert.throws(() => deleteWechatImage(url, updated.账号), /仍被/);
deleteWechatImage(url, removed.账号);
assert.equal(resolveWechatImage(url), '');

const snapshot = mediaSnapshot(updated.账号);
const newChat = structuredClone(current.账号);
applyNewChatMediaSnapshot(newChat, snapshot, () => true);
assert.equal(newChat.alice.头像, url, '新聊天恢复作者保存的头像');
assert.equal(newChat.alice.表情包.微笑, url, '新聊天恢复作者保存的表情包');
assert.throws(() => applyNewChatMediaSnapshot(structuredClone(current.账号), snapshot, () => false), /图片库中缺失/);
const missing = structuredClone(updated.账号);
delete missing.alice.表情包.微笑;
assert.equal(restoreMissingStickers(missing, snapshot), true);
assert.equal(missing.alice.表情包.微笑, url);
console.log('微信图片库复用、引用、清理、好友双向更新与表情恢复验证通过');
