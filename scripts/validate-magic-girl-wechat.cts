// eslint-disable-next-line import-x/no-nodejs-modules
import assert from 'node:assert/strict';
import {
  applyWeChatLogs,
  applyWeChatOperation,
  canSendPrivateMessage,
  contentSummary,
  displayContentParts,
  deleteWeChatFromFloor,
  logConfirmsPending,
  messageEntries,
  nextWeChatFloor,
  parseTransferMessage,
  parseWeChatLogs,
  unappliedWeChatLogs,
  transferRecipient,
  visibleUserChats,
  worldTimeAfterWeChatLogs,
} from '../src/手机界面/apps/wechat/wechatData';
import type { 微信数据 } from '../src/手机界面/types';
import { statDataPatch } from '../src/Utils/statDataPatch';
import { parseVariableLogs } from '../src/Utils/VariableLogParser';
import { locationShare } from '../src/手机界面/apps/map/locationShare';

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
const missingAccounts: 微信数据 = { 账号: {}, 会话: {}, 准备发送: null };
const newcomer = '栗原桃香';
const newcomerKey = `私聊:user&${newcomer}`;
const newcomerLog = parse([
  {
    类型: '操作',
    楼层ID: 1,
    操作: '好友申请',
    会话: newcomerKey,
    时间: '2026-09-28T22:48[1]',
    操作者: newcomer,
    目标: 'user',
    验证消息: '栗原桃香（加了，快通过）',
    会话信息: { 类型: '私聊', 成员: ['user', newcomer] },
  },
  {
    类型: '操作',
    楼层ID: 2,
    操作: '通过好友申请',
    会话: newcomerKey,
    时间: '2026-09-28T22:49[1]',
    操作者: 'user',
    目标: newcomer,
  },
  {
    类型: '消息',
    楼层ID: 3,
    会话: newcomerKey,
    时间: '2026-09-28T22:52[1]',
    发送者: newcomer,
    内容: ['CH-0482', '密钥是0001850024', '排班表等我回宿舍用平板发，手机里没存pdf'],
  },
]);
const newcomerChat = applyWeChatLogs(missingAccounts, newcomerLog);
assert.equal(Object.keys(newcomerChat.会话[newcomerKey].消息).length, 3);
assert.equal(newcomerChat.账号[newcomer].昵称, newcomer);
assert.ok(newcomerChat.账号[newcomer].头像);
assert.deepEqual(newcomerChat.账号[newcomer].好友, ['user']);
assert.deepEqual(missingAccounts, { 账号: {}, 会话: {}, 准备发送: null });
assert.deepEqual(unappliedWeChatLogs(newcomerChat, newcomerLog), []);
const directLog = parse([
  {
    类型: '消息',
    楼层ID: 1,
    会话: newcomerKey,
    时间: time,
    发送者: newcomer,
    内容: ['第一次直接发来消息'],
    会话信息: { 类型: '私聊', 成员: ['user', newcomer] },
  },
]);
const directChat = applyWeChatLogs(missingAccounts, directLog);
assert.deepEqual(directChat.账号[newcomer].好友, []);
assert.deepEqual(directChat.账号.user.好友, []);
assert.deepEqual(
  visibleUserChats(directChat).map(([id]) => id),
  [newcomerKey],
);
assert.ok(canSendPrivateMessage(directChat, directChat.会话[newcomerKey]), '已发生的聊天允许回复');
const replied = applyWeChatLogs(
  directChat,
  parse([{ 类型: '消息', 楼层ID: 2, 会话: newcomerKey, 时间: time, 发送者: 'user', 内容: ['收到'] }]),
);
assert.equal(Object.keys(replied.会话[newcomerKey].消息).length, 2);
const onlyRequest = applyWeChatOperation(missingAccounts, newcomerLog[0].事件[0] as any);
assert.ok(onlyRequest.账号[newcomer]);
assert.deepEqual(visibleUserChats(onlyRequest), []);
assert.equal(canSendPrivateMessage(onlyRequest, onlyRequest.会话[newcomerKey]), false);
const groupCreated = applyWeChatOperation(missingAccounts, {
  类型: '操作',
  操作: '创建群聊',
  会话: '群聊:新群',
  操作者: newcomer,
  名称: '新群',
  时间: time,
});
assert.ok(groupCreated.账号[newcomer]);
const groupMessage = applyWeChatLogs(
  groupCreated,
  parse([{ 类型: '消息', 楼层ID: 2, 会话: '群聊:新群', 时间: time, 发送者: newcomer, 内容: ['群里也能聊天'] }]),
);
assert.equal(Object.keys(groupMessage.会话['群聊:新群'].消息).length, 2);
const originalAccount = account('原昵称', []);
const withExisting = { ...missingAccounts, 账号: { [newcomer]: originalAccount } };
const preservedChat = applyWeChatLogs(withExisting, directLog);
assert.deepEqual(preservedChat.账号[newcomer], originalAccount);
assert.throws(
  () =>
    applyWeChatLogs(
      missingAccounts,
      parse([
        ...directLog[0].事件,
        { 类型: '消息', 楼层ID: 2, 会话: newcomerKey, 时间: time, 发送者: '不在会话的人', 内容: ['无效消息'] },
      ]),
    ),
  /非成员/,
);
assert.deepEqual(missingAccounts.账号, {}, '失败不能留下半成品账号');
const completeLog = `<WeChatLog>${JSON.stringify({ 事件: [message(1, 'user', '完整消息')] })}</WeChatLog>`;
assert.deepEqual(parseWeChatLogs(`<WeChatLog>{"事件":[ ${completeLog}`), parseWeChatLogs(completeLog));
assert.deepEqual(parseWeChatLogs(`${completeLog}<WeChatLog>{"事件":[`), parseWeChatLogs(completeLog));
assert.deepEqual(parseWeChatLogs('<WeChatLog>{"事件":['), []);
assert.deepEqual(parse([message(1, 'user', locationShare('学园区'))])[0].事件[0].内容, [locationShare('学园区')]);
assert.equal(contentSummary([locationShare('学园区')]), '[位置] 学园区');
const mixedSticker = '还把我也拉进来了<表情包>星星-眨眼</表情包>';
assert.deepEqual(displayContentParts([mixedSticker]), [
  { part: '还把我也拉进来了', sourceIndex: 0 },
  { part: '<表情包>星星-眨眼</表情包>', sourceIndex: 0 },
]);
assert.deepEqual(displayContentParts(['前<表情包>甲</表情包>后<表情包>乙</表情包>']), [
  { part: '前', sourceIndex: 0 },
  { part: '<表情包>甲</表情包>', sourceIndex: 0 },
  { part: '后', sourceIndex: 0 },
  { part: '<表情包>乙</表情包>', sourceIndex: 0 },
]);
assert.deepEqual(displayContentParts(['文字', '<表情包>甲</表情包>', '未闭合<表情包>甲']), [
  { part: '文字', sourceIndex: 0 },
  { part: '<表情包>甲</表情包>', sourceIndex: 1 },
  { part: '未闭合<表情包>甲', sourceIndex: 2 },
]);
assert.equal(contentSummary([mixedSticker]), '还把我也拉进来了[表情包]');
assert.equal(
  worldTimeAfterWeChatLogs(time, parse([message(1, 'user', '稍后', { 时间: '2026-9-26T03:20[6]' })])),
  '2026-9-26T03:20[6]',
);
assert.equal(
  worldTimeAfterWeChatLogs('2026-09-26T04:00[6]', parse([message(1, 'user', '稍早')])),
  '2026-09-26T04:00[6]',
);
assert.equal(worldTimeAfterWeChatLogs('', parse([message(1, 'user', '初始化')])), time);
assert.equal(
  worldTimeAfterWeChatLogs(
    time,
    parse([
      message(1, 'user', '最新', { 时间: '2026-09-26T05:00[6]' }),
      message(2, '小鸟游琉璃', '稍早', { 时间: '2026-09-26T04:00[6]' }),
    ]),
  ),
  '2026-09-26T05:00[6]',
);
assert.equal(worldTimeAfterWeChatLogs('2026-09-26T05:00[6]', []), '2026-09-26T05:00[6]');
assert.throws(
  () => worldTimeAfterWeChatLogs(time, parse([message(1, 'user', '坏时间', { 时间: '2026-09-31T03:20[6]' })])),
  /聊天时间日期无效/,
);
assert.equal(contentSummary([' <表情包>星星-眨眼</表情包>']), '[表情包]');
assert.deepEqual(displayContentParts(['<语音 时长="3s">提到<表情包>星星-眨眼</表情包></语音>']), [
  { part: '<语音 时长="3s">提到<表情包>星星-眨眼</表情包></语音>', sourceIndex: 0 },
]);
assert.deepEqual(parse([message(1, 'user', mixedSticker)])[0].事件[0].内容, [mixedSticker]);
assert.throws(() => parse([message(1, 'user', '<位置 key="">')]));
const first = parse([
  message(1, 'user', '在吗', { 会话信息: { 类型: '私聊', 成员: ['user', '小鸟游琉璃'] } }),
  message(2, '小鸟游琉璃', '在'),
]);
const stored = applyWeChatLogs(empty, first);
assert.deepEqual(
  messageEntries(stored.会话[key].消息).map(([id]) => Number(id)),
  [1, 2],
);

// 同一楼层两段增量：旧 user 消息不与第二次发送的缓冲比较。
const waiting = structuredClone(stored);
waiting.准备发送 = { 楼层ID: 3, 会话: key, 时间: time, 内容: ['想你了不可以吗？'] };
const second = parse([message(3, 'user', '想你了不可以吗？'), message(4, '小鸟游琉璃', '少来')]);
const remaining = unappliedWeChatLogs(waiting, [...first, ...second]);
assert.deepEqual(remaining[0].事件, second[0].事件);
const done = applyWeChatLogs(waiting, remaining);
assert.equal(done.准备发送, null);
assert.deepEqual(
  messageEntries(done.会话[key].消息).map(([id]) => Number(id)),
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
assert.deepEqual((batchDone.会话[key].消息['3'] as { 内容: string[] }).内容, ['第一条', '<名片 角色="凛">', '附言']);

// 同文、同时间仍可占用两个不同楼层；同 ID 改写必须报错。
const same = parse([message(5, 'user', '在吗'), message(6, 'user', '在吗')]);
const once = applyWeChatLogs(done, [{ 事件: [same[0].事件[0]] }]);
assert.equal(unappliedWeChatLogs(once, same)[0].事件.length, 1);
assert.equal(Object.keys(applyWeChatLogs(once, unappliedWeChatLogs(once, same)).会话[key].消息).length, 6);
assert.throws(() => unappliedWeChatLogs(once, parse([message(5, 'user', '改写')])), /冲突/);
assert.throws(() => applyWeChatLogs(done, parse([message(6, 'user', '跳号')])), /不连续/);
const quote = { 楼层ID: 2, 内容下标: 0, 发送者: '小鸟游琉璃', 时间: time, 内容: ['在'] };
assert.equal(
  Object.keys(applyWeChatLogs(done, parse([message(5, 'user', '收到', { 引用: quote })])).会话[key].消息).length,
  5,
);
assert.throws(
  () => applyWeChatLogs(done, parse([message(5, 'user', '收到', { 引用: { ...quote, 楼层ID: 1 } })])),
  /引用的楼层 ID/,
);

// 引用和款项用楼层 key 定位。
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
assert.equal(Number(Object.keys(paid.会话[key].消息)[4]), 5);
assert.equal((paid.会话[key].消息['5'] as { 特殊内容状态?: Record<number, string> }).特殊内容状态?.[0], '已收款');
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
const groupKey = '群聊:transfer-test';
const group = structuredClone(empty);
group.会话[groupKey] = { 类型: '群聊', 名称: '测试群', 成员: ['user', '小鸟游琉璃', '凛'], 消息: {} };
const addressedTransfer = '<转账 金额="50" 收款人="凛">奶茶</转账>';
assert.deepEqual(parseTransferMessage(addressedTransfer), { amount: '50', recipient: '凛', remark: '奶茶' });
assert.equal(transferRecipient(group.会话[groupKey], 'user', addressedTransfer), '凛');
assert.throws(() => transferRecipient(group.会话[groupKey], 'user', '<转账 金额="50">奶茶</转账>'), /指定/);
assert.throws(
  () => transferRecipient(group.会话[groupKey], 'user', '<转账 金额="50" 收款人="陌生人">奶茶</转账>'),
  /指定/,
);
const groupTransfer = applyWeChatLogs(
  group,
  parse([
    {
      类型: '消息',
      楼层ID: 1,
      会话: groupKey,
      发送者: 'user',
      时间: time,
      内容: [addressedTransfer],
    },
  ]),
);
assert.throws(
  () =>
    applyWeChatLogs(
      group,
      parse([
        {
          类型: '消息',
          楼层ID: 1,
          会话: groupKey,
          发送者: 'user',
          时间: time,
          内容: ['<转账 金额="50">奶茶</转账>'],
        },
      ]),
    ),
  /指定/,
);
const groupReceive = (actor: string) =>
  applyWeChatOperation(groupTransfer, {
    类型: '操作',
    楼层ID: 2,
    操作: '领取转账',
    会话: groupKey,
    操作者: actor,
    时间: time,
    目标: { 楼层ID: 1, 内容下标: 0 },
  });
assert.throws(() => groupReceive('小鸟游琉璃'), /指定收款人/);
assert.equal(
  (groupReceive('凛').会话[groupKey].消息['1'] as { 特殊内容状态?: Record<number, string> }).特殊内容状态?.[0],
  '已收款',
);
const incomingGroup = applyWeChatLogs(
  group,
  parse([
    {
      类型: '消息',
      楼层ID: 1,
      会话: groupKey,
      发送者: '凛',
      时间: time,
      内容: ['<转账 金额="8" 收款人="user">礼物</转账>'],
    },
  ]),
);
assert.equal(
  (
    applyWeChatOperation(incomingGroup, {
      类型: '操作',
      楼层ID: 2,
      操作: '领取转账',
      会话: groupKey,
      操作者: 'user',
      时间: time,
      目标: { 楼层ID: 1, 内容下标: 0 },
    }).会话[groupKey].消息['1'] as { 特殊内容状态?: Record<number, string> }
  ).特殊内容状态?.[0],
  '已收款',
);
const legacyGroup = structuredClone(group);
legacyGroup.会话[groupKey].消息['1'] = { 发送者: 'user', 时间: time, 内容: ['<转账 金额="5">未指定收款人</转账>'] };
assert.throws(
  () =>
    applyWeChatOperation(legacyGroup, {
      类型: '操作',
      楼层ID: 2,
      操作: '领取转账',
      会话: groupKey,
      操作者: '凛',
      时间: time,
      目标: { 楼层ID: 1, 内容下标: 0 },
    }),
  /指定/,
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
assert.deepEqual(Object.keys(other.会话['私聊:user&凛'].消息), ['1']);
assert.equal(nextWeChatFloor(other.会话[key].消息), 7);
const truncated = deleteWeChatFromFloor(other, key, 5);
assert.deepEqual(
  messageEntries(truncated.会话[key].消息).map(([id]) => Number(id)),
  [1, 2, 3, 4],
);
assert.equal(Object.keys(truncated.会话['私聊:user&凛'].消息).length, 1);
assert.throws(() => deleteWeChatFromFloor(other, key, 7), /不存在/);
const npcAccounts = structuredClone(empty);
npcAccounts.账号.索菲亚 = account('索菲亚', []);
const npcRequest = applyWeChatLogs(
  npcAccounts,
  parse([
    {
      类型: '操作',
      楼层ID: 1,
      操作: '好友申请',
      会话: '私聊:索菲亚&小鸟游琉璃',
      时间: time,
      操作者: '小鸟游琉璃',
      目标: '索菲亚',
      验证消息: '小鸟游琉璃。',
    },
  ]),
);
assert.equal(Object.keys(npcRequest.会话['私聊:索菲亚&小鸟游琉璃'].消息).length, 1);
const applicant = structuredClone(empty);
applicant.账号.索菲亚 = account('索菲亚', []);
const incoming = applyWeChatLogs(
  applicant,
  parse([
    {
      类型: '操作',
      楼层ID: 1,
      操作: '好友申请',
      会话: '私聊:user&索菲亚',
      时间: time,
      操作者: '索菲亚',
      目标: 'user',
      验证消息: '请加我',
    },
  ]),
);
assert.deepEqual(visibleUserChats(incoming), [], '待处理好友申请不进入会话列表');
const accepted = applyWeChatLogs(
  incoming,
  parse([
    {
      类型: '操作',
      楼层ID: 2,
      操作: '通过好友申请',
      会话: '私聊:user&索菲亚',
      时间: time,
      操作者: 'user',
      目标: '索菲亚',
    },
  ]),
);
assert.deepEqual(
  visibleUserChats(accepted).map(([id]) => id),
  ['私聊:user&索菲亚'],
  '通过申请后显示私聊',
);
const rejected = applyWeChatLogs(
  incoming,
  parse([
    {
      类型: '操作',
      楼层ID: 2,
      操作: '拒绝好友申请',
      会话: '私聊:user&索菲亚',
      时间: time,
      操作者: 'user',
      目标: '索菲亚',
    },
  ]),
);
assert.deepEqual(visibleUserChats(rejected), [], '拒绝后仍不显示私聊');
// 第100楼仅生成该对象字段补丁，历史与消息本体都不携带重复身份。
const hundredEvents = Array.from({ length: 100 }, (_, index) =>
  message(
    index + 1,
    '小鸟游琉璃',
    '第' + (index + 1) + '条',
    index === 0 ? { 会话信息: { 类型: '私聊', 成员: ['user', '小鸟游琉璃'] } } : {},
  ),
);
const ninetyNine = applyWeChatLogs(empty, parse(hundredEvents.slice(0, 99)));
const hundredLog = parse(hundredEvents.slice(99));
const hundred = applyWeChatLogs(ninetyNine, hundredLog);
const patchText = statDataPatch({ 手机: { 微信: ninetyNine } }, { 手机: { 微信: hundred } });
const patch = JSON.parse(patchText.match(/<JSONPatch>([\s\S]*?)<\/JSONPatch>/)![1]);
assert.deepEqual(patch, [
  {
    op: 'add',
    path: '/手机/微信/会话/' + key + '/消息/100',
    value: { 发送者: '小鸟游琉璃', 时间: time, 内容: ['第100条'] },
  },
]);
assert.ok(!patchText.includes('第99条'));
const visiblePatch = parseVariableLogs(patchText, { includeUpdateVariable: true });
assert.equal(visiblePatch[0].type, 'variableedit');
assert.deepEqual((visiblePatch[0].data as any).手机.微信.会话[key].消息['100'], patch[0].value);
assert.deepEqual(unappliedWeChatLogs(hundred, [...hundredLog, ...hundredLog]), []);
assert.deepEqual(applyWeChatLogs(ninetyNine, [...hundredLog, ...hundredLog]), hundred, '同正文重复日志仅入库一次');
assert.equal(statDataPatch(hundred, applyWeChatLogs(hundred, hundredLog)), '');
assert.equal(nextWeChatFloor(hundred.会话[key].消息), 101);
assert.deepEqual(
  messageEntries({
    '100': hundred.会话[key].消息['100'],
    '2': hundred.会话[key].消息['2'],
    '10': hundred.会话[key].消息['10'],
  }).map(([id]) => Number(id)),
  [2, 10, 100],
);
for (const [, item] of messageEntries(hundred.会话[key].消息)) assert.ok(!Object.hasOwn(item, '楼层ID'));
const forwarded = {
  转发: {
    私聊: {
      成员: ['user', '小鸟游琉璃'],
      消息: {
        '2': { 发送者: 'user', 时间: time, 内容: ['快照2'] },
        '10': { 发送者: '小鸟游琉璃', 时间: time, 内容: ['快照10'] },
      },
    },
  },
};
const forwardLog = parse([{ ...message(101, 'user', ''), 内容: [forwarded] }]);
const withForward = applyWeChatLogs(hundred, forwardLog);
assert.deepEqual((withForward.会话[key].消息['101'] as any).内容[0], forwarded);
console.log('微信会话楼层键验证通过：100楼字段差分、重放、顺序、引用、转发、款项与删除。');
