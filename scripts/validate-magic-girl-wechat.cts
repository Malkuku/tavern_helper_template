import assert from 'node:assert/strict';
import {
  addSticker,
  applyWeChatOperation,
  applyWeChatLogs,
  chatTitle,
  contentSummary,
  decideFriendRequest,
  logMessagesPresent,
  logConfirmsPending,
  mergeStickerSnapshot,
  parseWeChatLogs,
  privateChatKey,
  sendFriendRequest,
} from '../src/手机界面/apps/wechat/wechatData';
import type { 微信数据 } from '../src/手机界面/types';

const account = (name: string) => ({
  昵称: name,
  头像: '',
  表情包: {},
  好友: [] as string[],
  好友请求: { 收到: {}, 发出: {} },
});
const initial: 微信数据 = {
  账号: { user: account('我'), 凛: account('凛'), 索菲亚: account('索菲亚') },
  会话: {},
  准备发送: { 会话: privateChatKey('凛'), 时间: '2026-9-26T03:10[6]', 内容: ['我到了。'] },
};
initial.账号.user.好友.push('凛');
initial.账号.凛.好友.push('user');

const logs = parseWeChatLogs(
  `<WeChatLog>${JSON.stringify({
    事件: [
      {
        类型: '消息',
        会话: privateChatKey('凛'),
        会话信息: { 类型: '私聊', 成员: ['user', '凛'] },
        发送者: 'user',
        时间: '2026-9-26T03:10[6]',
        内容: ['我到了。'],
      },
      {
        类型: '消息',
        会话: privateChatKey('凛'),
        发送者: '凛',
        时间: '2026-9-26T03:11[6]',
        内容: ['<红包 金额="50g">晚饭钱</红包>', '<名片 角色="索菲亚">'],
      },
      {
        类型: '操作',
        操作: '领取红包',
        时间: '2026-9-26T03:12[6]',
        操作者: 'user',
        会话: privateChatKey('凛'),
        目标: { 发送者: '凛', 时间: '2026-9-26T03:11[6]' },
      },
      {
        类型: '操作',
        操作: '发送好友申请',
        时间: '2026-9-26T03:13[6]',
        发起者: '索菲亚',
        接收者: 'user',
        验证消息: '你好',
      },
    ],
  })}</WeChatLog>`,
);
const result = applyWeChatLogs(initial, logs);
const reportedLog = parseWeChatLogs(
  `<WeChatLog>${JSON.stringify({
    事件: [
      {
        类型: '消息',
        会话: '私聊:user&小鸟游琉璃',
        发送者: 'user',
        时间: '2026-09-26T03:10[6]',
        内容: ['富婆妈妈😭'],
        会话信息: { 类型: '私聊', 成员: ['user', '小鸟游琉璃'] },
      },
      {
        类型: '消息',
        会话: '私聊:user&小鸟游琉璃',
        发送者: '小鸟游琉璃',
        时间: '2026-09-26T03:12[6]',
        内容: ['？', '大半夜发这个', '缺钱？'],
      },
    ],
  })}</WeChatLog>`,
);
const reportedPending: 微信数据 = {
  ...initial,
  账号: { ...initial.账号, 小鸟游琉璃: account('小鸟游琉璃') },
  准备发送: { 会话: '私聊:user&小鸟游琉璃', 时间: '2026-9-26T03:10[6]', 内容: ['富婆妈妈😭'] },
};
assert.equal(logConfirmsPending(reportedPending, reportedLog[0]), true);
assert.equal(applyWeChatLogs(reportedPending, reportedLog).准备发送, null);
assert.throws(
  () =>
    applyWeChatLogs(
      { ...reportedPending, 准备发送: { ...reportedPending.准备发送!, 时间: '2026-9-26T03:11[6]' } },
      reportedLog,
    ),
  /时间不一致/,
);
assert.equal(
  applyWeChatLogs(reportedPending, parseWeChatLogs('<WeChatLog>{"事件":[]}</WeChatLog>')).准备发送?.内容[0],
  '富婆妈妈😭',
);
assert.equal(result.会话[privateChatKey('凛')].消息.length, 2);
assert.equal(result.准备发送, null);
assert.equal(result.账号.user.好友请求.收到.索菲亚.验证消息, '你好');
assert.equal(contentSummary(result.会话[privateChatKey('凛')].消息[1].内容), '[红包] [名片]');
assert.equal(result.会话[privateChatKey('凛')].消息[1].特殊内容状态?.[0], '已领取');
assert.equal(result.会话[privateChatKey('凛')].消息[1].内容[0], '<红包 金额="50g">晚饭钱</红包>');
assert.equal(logMessagesPresent(result, logs), true);
assert.equal(logConfirmsPending(initial, logs[0]), true);
assert.throws(() => parseWeChatLogs('<WeChatLog>{}</WeChatLog>'));
assert.throws(() => applyWeChatLogs({ ...initial, 准备发送: { ...initial.准备发送!, 内容: ['不同内容'] } }, logs));
const accepted = decideFriendRequest(result, '索菲亚', true);
assert.ok(accepted.账号.user.好友.includes('索菲亚'));
const requested = sendFriendRequest(initial, '索菲亚', '申请好友');
assert.equal(requested.账号.user.好友请求.发出.索菲亚.验证消息, '申请好友');
const withTransfer = applyWeChatLogs(
  { ...result, 准备发送: null },
  parseWeChatLogs(
    `<WeChatLog>${JSON.stringify({
      事件: [
        {
          类型: '消息',
          会话: privateChatKey('凛'),
          发送者: '凛',
          时间: '2026-9-26T03:14[6]',
          内容: ['<转账 金额="200g">药费</转账>'],
        },
      ],
    })}</WeChatLog>`,
  ),
);
const transferEvent = {
  类型: '操作' as const,
  操作: '退回转账',
  时间: '2026-9-26T03:15[6]',
  操作者: 'user',
  会话: privateChatKey('凛'),
  目标: { 发送者: '凛', 时间: '2026-9-26T03:14[6]' },
};
const returned = applyWeChatOperation(withTransfer, transferEvent);
assert.equal(returned.会话[privateChatKey('凛')].消息[2].特殊内容状态?.[0], '已退回');
assert.throws(() => applyWeChatOperation(returned, { ...transferEvent, 操作: '领取转账' }));
const poked = applyWeChatOperation(returned, {
  类型: '操作',
  操作: '拍一拍',
  时间: '2026-9-26T03:16[6]',
  操作者: 'user',
  目标: '凛',
  会话: privateChatKey('凛'),
});
assert.equal(poked.会话[privateChatKey('凛')].消息.at(-1)?.系统提示, true);
const recalled = applyWeChatOperation(poked, {
  类型: '操作',
  操作: '撤回消息',
  时间: '2026-9-26T03:17[6]',
  操作者: 'user',
  会话: privateChatKey('凛'),
  目标: { 发送者: 'user', 时间: '2026-9-26T03:10[6]' },
});
assert.equal(recalled.会话[privateChatKey('凛')].消息[0].已撤回, true);
assert.throws(() =>
  applyWeChatOperation(recalled, {
    类型: '操作',
    操作: '撤回消息',
    时间: '2026-9-26T03:18[6]',
    操作者: 'user',
    会话: privateChatKey('凛'),
    目标: { 发送者: 'user', 时间: '2026-9-26T03:10[6]' },
  }),
);
const group = {
  ...recalled,
  会话: { ...recalled.会话, '群聊:学生会': { 类型: '群聊' as const, 名称: '学生会', 成员: ['user', '凛'], 消息: [] } },
};
const invited = applyWeChatOperation(group, {
  类型: '操作',
  操作: '邀请进群',
  时间: '2026-9-26T03:19[6]',
  操作者: 'user',
  会话: '群聊:学生会',
  对象: '索菲亚',
});
assert.ok(invited.会话['群聊:学生会'].成员.includes('索菲亚'));
assert.equal(invited.会话['群聊:学生会'].消息[0].系统提示, true);
assert.throws(() =>
  applyWeChatOperation(invited, {
    类型: '操作',
    操作: '邀请进群',
    时间: '2026-9-26T03:20[6]',
    操作者: 'user',
    会话: '群聊:学生会',
    对象: '索菲亚',
  }),
);
const stickerData = addSticker(initial, '挥手', 'data:image/png;base64,dGVzdA==');
assert.equal(stickerData.账号.user.表情包.挥手, 'data:image/png;base64,dGVzdA==');
assert.equal(initial.账号.user.表情包.挥手, undefined);
assert.throws(() => addSticker(stickerData, '挥手', 'data:image/png;base64,dGVzdA=='));
const missingSticker = mergeStickerSnapshot({}, stickerData.账号.user.表情包);
assert.equal(missingSticker.restoreNeeded, true);
assert.equal(missingSticker.stickers.挥手, 'data:image/png;base64,dGVzdA==');
const newBackup = mergeStickerSnapshot(stickerData.账号.user.表情包, undefined);
assert.equal(newBackup.backupNeeded, true);
assert.equal(newBackup.backup.挥手, 'data:image/png;base64,dGVzdA==');
assert.equal(mergeStickerSnapshot(stickerData.账号.user.表情包, newBackup.backup).restoreNeeded, false);
console.log('微信正文增量与好友流程验证通过');
