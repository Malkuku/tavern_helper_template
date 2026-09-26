import assert from 'node:assert/strict';
import type { 微信数据, 微信消息 } from '../src/手机界面/types';
import {
  initialReadCursors,
  latestNotifiableMessage,
  newIncomingMessages,
  reconcileReadCursors,
  unreadConversationKeys,
} from '../src/手机界面/apps/wechat/wechatNotifications';

const chatA = '私聊:user&甲';
const chatB = '私聊:user&乙';
const message = (id: number, sender: string): 微信消息 => ({
  楼层ID: id,
  发送者: sender,
  时间: '2026-09-27T10:00[7]',
  内容: [`消息${id}`],
});
const data = (a: 微信数据['会话'][string]['消息'], b: 微信数据['会话'][string]['消息']): 微信数据 => ({
  账号: {},
  准备发送: null,
  会话: {
    [chatA]: { 类型: '私聊', 成员: ['user', '甲'], 消息: a },
    [chatB]: { 类型: '私聊', 成员: ['user', '乙'], 消息: b },
  },
});

const historical = data([message(1, '甲')], [message(1, 'user')]);
const baseline = initialReadCursors(historical);
assert.deepEqual(baseline, { [chatA]: 1, [chatB]: 1 });
assert.deepEqual(unreadConversationKeys(historical, baseline), [], '首次加载不把历史算作未读');
assert.deepEqual(newIncomingMessages(null, historical), [], '首次加载不弹旧消息');

const updated = data([message(1, '甲'), message(2, 'user'), message(3, '甲')], [message(1, 'user'), message(2, '乙')]);
assert.deepEqual(
  newIncomingMessages(historical, updated).map(({ key, message: item }) => [key, item.楼层ID]),
  [
    [chatA, 3],
    [chatB, 2],
  ],
  '只为新增的他人消息弹窗',
);
assert.deepEqual(unreadConversationKeys(updated, baseline), [chatA, chatB]);
assert.deepEqual(unreadConversationKeys(updated, { ...baseline, [chatA]: 3 }), [chatB], '打开一个会话不清除其他会话');
assert.deepEqual(newIncomingMessages(updated, updated), [], '重复刷新不弹窗');
assert.equal(latestNotifiableMessage(historical, updated, chatB, { [chatA]: { muted: true } }), null);
assert.equal(latestNotifiableMessage(historical, updated, null, { [chatA]: { muted: true } })?.key, chatB);

const withOperation = data(
  [
    ...historical.会话[chatA].消息,
    { 楼层ID: 2, 时间: '2026-09-27T10:00[7]', 操作: '拍一拍', 操作者: '甲', 目标: 'user' },
  ],
  historical.会话[chatB].消息,
);
assert.deepEqual(newIncomingMessages(historical, withOperation), [], '操作项不触发消息弹窗');
assert.deepEqual(unreadConversationKeys(withOperation, baseline), [], '操作项不产生消息未读');

const shortened = data([message(1, '甲')], []);
assert.deepEqual(reconcileReadCursors(shortened, { [chatA]: 3, [chatB]: 2 }), { [chatA]: 1, [chatB]: 0 });
assert.deepEqual(unreadConversationKeys(updated, { [chatA]: 3, [chatB]: 2 }), [], '脚本保存的已读位置可恢复到对应会话');

console.log('微信未读：历史基线、新消息、操作过滤、去重、会话隔离与删除后位置通过。');
