import assert from 'node:assert/strict';
import {
  applyWeChatLogs,
  friendRequest,
  isWeChatMessage,
  logConfirmsPending,
  parseWeChatLogs,
  privateChatKey,
  privateKey,
  unappliedWeChatLogs,
} from '../src/手机界面/apps/wechat/wechatData';
import type { 微信数据 } from '../src/手机界面/types';

const time = '2026-09-26T03:10[6]';
const account = (name: string) => ({ 昵称: name, 头像: '', 表情包: {}, 好友: [] as string[] });
const initial: 微信数据 = {
  账号: { user: account('我'), 凛: account('凛'), 索菲亚: account('索菲亚') },
  会话: {},
  准备发送: null,
};
const apply = (data: 微信数据, events: object[]) =>
  applyWeChatLogs(data, parseWeChatLogs(`<WeChatLog>${JSON.stringify({ 事件: events })}</WeChatLog>`));
const op = (操作: string, 会话: string, 操作者: string, 目标?: unknown, extra: object = {}) => ({
  类型: '操作',
  操作,
  会话,
  操作者,
  时间: time,
  ...(目标 === undefined ? {} : { 目标 }),
  ...extra,
});
const chat = privateKey('凛', '索菲亚');
const requested = apply(initial, [op('好友申请', chat, '索菲亚', '凛', { 验证消息: '你好' })]);
assert.equal(friendRequest(requested.会话[chat])?.操作者, '索菲亚');
assert.throws(
  () => apply(requested, [{ 类型: '消息', 会话: chat, 发送者: '索菲亚', 时间: time, 内容: ['你好'] }]),
  /非好友/,
);
const rejected = apply(requested, [op('拒绝好友申请', chat, '凛', '索菲亚')]);
assert.equal(friendRequest(rejected.会话[chat]), null);
const accepted = apply(rejected, [
  op('好友申请', chat, '索菲亚', '凛', { 验证消息: '再试一次' }),
  op('通过好友申请', chat, '凛', '索菲亚'),
  { 类型: '消息', 会话: chat, 发送者: '索菲亚', 时间: time, 内容: ['你好', '<红包 金额="50g">奶茶</红包>'] },
]);
assert.ok(accepted.账号.凛.好友.includes('索菲亚'));
assert.equal(accepted.会话[chat].消息.length, 5);
assert.throws(
  () =>
    apply(requested, [
      op('通过好友申请', chat, '凛', '索菲亚'),
      { 类型: '消息', 会话: chat, 发送者: 'user', 时间: time, 内容: ['越权'] },
    ]),
  /非成员/,
);
assert.equal(requested.账号.凛.好友.length, 0);
const paid = apply(accepted, [op('领取红包', chat, '凛', { 发送者: '索菲亚', 时间: time })]);
const packet = paid.会话[chat].消息.at(-2)!;
assert.ok(isWeChatMessage(packet));
if (isWeChatMessage(packet)) assert.equal(packet.特殊内容状态?.[1], '已领取');
assert.equal(paid.会话[chat].消息.length, 6);
assert.equal(paid.会话[chat].消息.at(-1)?.操作, '领取红包');
assert.throws(() => apply(paid, [op('领取红包', chat, '凛', { 发送者: '索菲亚', 时间: time })]), /已经处理/);
const repeatedPackets = apply(accepted, [
  { 类型: '消息', 会话: chat, 发送者: '索菲亚', 时间: time, 内容: ['<红包 金额="10g">另一个</红包>'] },
]);
const latestPaid = apply(repeatedPackets, [op('领取红包', chat, '凛', { 发送者: '索菲亚', 时间: time })]);
const latestPacket = latestPaid.会话[chat].消息.at(-2)!;
assert.ok(isWeChatMessage(latestPacket));
if (isWeChatMessage(latestPacket)) assert.equal(latestPacket.特殊内容状态?.[0], '已领取');

const groupKey = '群聊:索菲亚-周末计划-0928';
const created = apply(accepted, [op('创建群聊', groupKey, '索菲亚', undefined, { 名称: '周末计划' })]);
assert.deepEqual(created.会话[groupKey].成员, ['索菲亚']);
assert.equal(created.会话[groupKey].群主, '索菲亚');
assert.throws(() => apply(created, [op('邀请进群', groupKey, '索菲亚', 'user')]), /只能邀请自己的好友/);
const group = apply(created, [
  op('邀请进群', groupKey, '索菲亚', '凛'),
  { 类型: '消息', 会话: groupKey, 发送者: '凛', 时间: time, 内容: ['到了'] },
]);
assert.deepEqual(group.会话[groupKey].成员, ['索菲亚', '凛']);
assert.ok(!isWeChatMessage(group.会话[groupKey].消息[1]));
const sameName = apply(group, [op('创建群聊', `${groupKey}-2`, '索菲亚', undefined, { 名称: '周末计划' })]);
assert.equal(sameName.会话[`${groupKey}-2`].名称, '周末计划');
assert.throws(() => apply(sameName, [op('创建群聊', groupKey, '索菲亚', undefined, { 名称: '周末计划' })]), /已存在/);

const userChat = privateChatKey('凛');
const ready: 微信数据 = {
  ...initial,
  账号: structuredClone(initial.账号),
  准备发送: { 会话: userChat, 时间: time, 内容: ['回'], 引用: { 发送者: '凛', 时间: time, 内容: ['回来吗'] } },
};
ready.账号.user.好友.push('凛');
ready.账号.凛.好友.push('user');
const pendingLog = parseWeChatLogs(
  `<WeChatLog>${JSON.stringify({
    事件: [
      {
        类型: '消息',
        会话: userChat,
        会话信息: { 类型: '私聊', 成员: ['user', '凛'] },
        发送者: 'user',
        时间: time,
        内容: ['回'],
        引用: { 发送者: '凛', 时间: time, 内容: ['回来吗'] },
      },
    ],
  })}</WeChatLog>`,
);
assert.equal(logConfirmsPending(ready, pendingLog[0]), true);
assert.equal(applyWeChatLogs(ready, pendingLog).准备发送, null);
const advancedReady = structuredClone(ready);
advancedReady.准备发送!.时间 = '2026-9-26T03:10[6]';
const advancedLog = structuredClone(pendingLog);
advancedLog[0].事件[0].时间 = '2026-09-26T03:12[6]';
assert.equal(logConfirmsPending(advancedReady, advancedLog[0]), true);
const advancedApplied = applyWeChatLogs(advancedReady, advancedLog);
assert.equal(advancedApplied.准备发送, null);
assert.equal(advancedApplied.会话[userChat].消息[0].时间, '2026-09-26T03:12[6]');
const earlierLog = structuredClone(advancedLog);
earlierLog[0].事件[0].时间 = '2026-09-26T03:09[6]';
assert.throws(() => applyWeChatLogs(advancedReady, earlierLog), /正文时间早于待发送时间/);
const wrongContentLog = structuredClone(advancedLog);
if (wrongContentLog[0].事件[0].类型 === '消息') wrongContentLog[0].事件[0].内容 = ['别的消息'];
assert.throws(() => applyWeChatLogs(advancedReady, wrongContentLog), /内容不一致/);

const birdChat = privateChatKey('小鸟游琉璃');
const birdReady: 微信数据 = structuredClone(initial);
birdReady.账号['小鸟游琉璃'] = account('小鸟游琉璃');
birdReady.账号.user.好友.push('小鸟游琉璃');
birdReady.账号['小鸟游琉璃'].好友.push('user');
const firstLog = parseWeChatLogs(
  `<WeChatLog>${JSON.stringify({
    事件: [
      {
        类型: '消息',
        会话: birdChat,
        会话信息: { 类型: '私聊', 成员: ['user', '小鸟游琉璃'] },
        发送者: 'user',
        时间: time,
        内容: ['你好？'],
      },
      { 类型: '消息', 会话: birdChat, 发送者: '小鸟游琉璃', 时间: '2026-09-26T03:12[6]', 内容: ['？', '有事直说'] },
    ],
  })}</WeChatLog>`,
);
const secondLog = parseWeChatLogs(
  `<WeChatLog>${JSON.stringify({
    事件: [
      { 类型: '消息', 会话: birdChat, 发送者: 'user', 时间: '2026-09-26T03:13[6]', 内容: ['<名片 角色="索菲亚">'] },
      {
        类型: '消息',
        会话: birdChat,
        发送者: '小鸟游琉璃',
        时间: '2026-09-26T03:15[6]',
        内容: ['柊索菲亚？', '你跟她搭上线了。', '大半夜推她名片，想让我做什么。'],
      },
    ],
  })}</WeChatLog>`,
);
const birdAfterFirst = applyWeChatLogs(birdReady, firstLog);
const appended = [...firstLog, ...secondLog];
const remaining = unappliedWeChatLogs(birdAfterFirst, appended, JSON.stringify(firstLog));
assert.deepEqual(remaining[0].事件, secondLog[0].事件);
assert.equal(applyWeChatLogs(birdAfterFirst, remaining).会话[birdChat].消息.length, 4);
assert.deepEqual(unappliedWeChatLogs(birdAfterFirst, firstLog, JSON.stringify(firstLog)), []);
const edited = structuredClone(appended);
edited[0].事件[0].内容 = ['改写'];
assert.throws(() => unappliedWeChatLogs(birdAfterFirst, edited, JSON.stringify(firstLog)), /旧增量仍在变量中/);
console.log('微信会话消息流验证通过');
