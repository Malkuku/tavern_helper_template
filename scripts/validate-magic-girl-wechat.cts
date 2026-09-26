import assert from 'node:assert/strict';
import {
  applyWeChatLogs,
  applyWeChatOperation,
  deleteWeChatFromFloor,
  logConfirmsPending,
  normalizeWeChatIds,
  parseWeChatLogs,
  unappliedWeChatLogs,
} from '../src/手机界面/apps/wechat/wechatData';
import type { 微信数据 } from '../src/手机界面/types';

const time = '2026-09-26T03:10[6]';
const key = '私聊:user&小鸟游琉璃';
const account = (name: string, friends: string[]) => ({ 昵称: name, 头像: '', 表情包: {}, 好友: friends });
const empty: 微信数据 = {
  账号: {
    user: account('我', ['小鸟游琉璃', '凛']),
    小鸟游琉璃: account('小鸟游琉璃', ['user']),
    凛: account('凛', ['user']),
  },
  会话: {},
  准备发送: null,
};
const message = (id: number, sender: string, content: string, extra: object = {}) => ({
  类型: '消息',
  楼层ID: id,
  会话: key,
  发送者: sender,
  时间: time,
  内容: [content],
  ...extra,
});
const parse = (events: object[]) => parseWeChatLogs(`<WeChatLog>${JSON.stringify({ 事件: events })}</WeChatLog>`);
const first = parse([
  message(1, 'user', '在吗', { 会话信息: { 类型: '私聊', 成员: ['user', '小鸟游琉璃'] } }),
  message(2, '小鸟游琉璃', '在'),
]);
const stored = applyWeChatLogs(empty, first);
assert.deepEqual(
  stored.会话[key].消息.map(item => item.楼层ID),
  [1, 2],
);

// 同一楼层两段增量：旧 user 消息不与第二次发送的缓冲比较。
const waiting = structuredClone(stored);
waiting.准备发送 = { 楼层ID: 3, 会话: key, 时间: time, 内容: ['想你了不可以吗？'] };
const second = parse([message(3, 'user', '想你了不可以吗？'), message(4, '小鸟游琉璃', '少来')]);
const remaining = unappliedWeChatLogs(waiting, [...first, ...second]);
assert.deepEqual(remaining[0].事件, second[0].事件);
const oldLog = parse(first[0].事件.map(({ 楼层ID: _id, ...event }) => event));
assert.deepEqual(unappliedWeChatLogs(waiting, [...oldLog, ...second])[0].事件, second[0].事件);
assert.throws(
  () =>
    unappliedWeChatLogs(waiting, [
      ...oldLog,
      ...parse([
        {
          类型: '消息',
          会话: key,
          发送者: 'user',
          时间: time,
          内容: ['想你了不可以吗？'],
        },
      ]),
    ]),
  /旧日志缺少楼层 ID/,
);
const done = applyWeChatLogs(waiting, remaining);
assert.equal(done.准备发送, null);
assert.deepEqual(
  done.会话[key].消息.map(item => item.楼层ID),
  [1, 2, 3, 4],
);
assert.deepEqual(unappliedWeChatLogs(done, [...first, ...second]), []);

// 连续添加的内容只在显式确认后匹配正文，顺序由同一内容数组保持。
const batch = structuredClone(stored);
batch.准备发送 = { 楼层ID: 3, 会话: key, 时间: time, 内容: ['第一条', '<名片 角色="凛">', '附言'], 已确认: false };
const batchLog = parse([{ ...message(3, 'user', '第一条'), 内容: ['第一条', '<名片 角色="凛">', '附言'] }]);
assert.equal(logConfirmsPending(batch, batchLog[0]), false);
batch.准备发送.已确认 = true;
assert.equal(logConfirmsPending(batch, batchLog[0]), true);
const batchDone = applyWeChatLogs(batch, batchLog);
assert.equal(batchDone.准备发送, null);
assert.deepEqual((batchDone.会话[key].消息[2] as { 内容: string[] }).内容, ['第一条', '<名片 角色="凛">', '附言']);

// 同文、同时间仍可占用两个不同楼层；同 ID 改写必须报错。
const same = parse([message(5, 'user', '在吗'), message(6, 'user', '在吗')]);
const once = applyWeChatLogs(done, [{ 事件: [same[0].事件[0]] }]);
assert.equal(unappliedWeChatLogs(once, same)[0].事件.length, 1);
assert.equal(applyWeChatLogs(once, unappliedWeChatLogs(once, same)).会话[key].消息.length, 6);
assert.throws(() => unappliedWeChatLogs(once, parse([message(5, 'user', '改写')])), /不一致/);
assert.throws(() => applyWeChatLogs(done, parse([message(6, 'user', '跳号')])), /不连续/);
const quote = { 楼层ID: 2, 内容下标: 0, 发送者: '小鸟游琉璃', 时间: time, 内容: ['在'] };
assert.equal(applyWeChatLogs(done, parse([message(5, 'user', '收到', { 引用: quote })])).会话[key].消息.length, 5);
assert.throws(
  () => applyWeChatLogs(done, parse([message(5, 'user', '收到', { 引用: { ...quote, 楼层ID: 1 } })])),
  /引用的楼层 ID/,
);

// 旧变量按数组顺序补号；引用和款项用楼层 ID 定位。
const legacy = structuredClone(done);
delete (legacy.会话[key].消息[0] as { 楼层ID?: number }).楼层ID;
assert.equal(normalizeWeChatIds(legacy).会话[key].消息[0].楼层ID, 1);
const payment = applyWeChatLogs(done, parse([message(5, 'user', '<转账 金额="50g">奶茶</转账>')]));
const paid = applyWeChatOperation(payment, {
  类型: '操作',
  楼层ID: 6,
  操作: '领取转账',
  会话: key,
  操作者: '小鸟游琉璃',
  时间: time,
  目标: { 楼层ID: 5, 内容下标: 0 },
});
assert.equal(paid.会话[key].消息[4].楼层ID, 5);
assert.equal((paid.会话[key].消息[4] as { 特殊内容状态?: Record<number, string> }).特殊内容状态?.[0], '已收款');
assert.throws(
  () =>
    applyWeChatOperation(paid, {
      类型: '操作',
      楼层ID: 7,
      操作: '领取转账',
      会话: key,
      操作者: '小鸟游琉璃',
      时间: time,
      目标: { 楼层ID: 5, 内容下标: 0 },
    }),
  /已经处理/,
);
const other = applyWeChatLogs(
  paid,
  parse([
    {
      类型: '消息',
      楼层ID: 1,
      会话: '私聊:user&凛',
      发送者: '凛',
      时间: time,
      内容: ['另一个会话'],
      会话信息: { 类型: '私聊', 成员: ['user', '凛'] },
    },
  ]),
);
assert.equal(other.会话['私聊:user&凛'].消息[0].楼层ID, 1);
assert.equal(other.会话[key].消息.at(-1)?.楼层ID, 6);
const truncated = deleteWeChatFromFloor(other, key, 5);
assert.deepEqual(truncated.会话[key].消息.map(item => item.楼层ID), [1, 2, 3, 4]);
assert.equal(truncated.会话['私聊:user&凛'].消息.length, 1);
assert.throws(() => deleteWeChatFromFloor(other, key, 7), /不存在/);
const npcAccounts = structuredClone(empty);
npcAccounts.账号.索菲亚 = account('索菲亚', []);
const npcRequest = applyWeChatLogs(npcAccounts, parse([{
    类型: '操作', 楼层ID: 1, 操作: '好友申请', 会话: '私聊:索菲亚&小鸟游琉璃',
    时间: time, 操作者: '小鸟游琉璃', 目标: '索菲亚', 验证消息: '小鸟游琉璃。',
  }]));
assert.equal(npcRequest.会话['私聊:索菲亚&小鸟游琉璃'].消息.length, 1);
console.log('微信会话楼层 ID 验证通过');
