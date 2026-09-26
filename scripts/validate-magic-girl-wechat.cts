import assert from 'node:assert/strict';
import {
  addSticker,
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

const text = `<WeChatLog>${JSON.stringify({
  新增消息: [
    {
      会话: privateChatKey('凛'),
      会话信息: { 类型: '私聊', 成员: ['user', '凛'] },
      消息: [
        { 发送者: 'user', 时间: '2026-9-26T03:10[6]', 内容: ['我到了。'] },
        {
          发送者: '凛',
          时间: '2026-9-26T03:11[6]',
          内容: [
            '<语音 时长="4s">知道了</语音>',
            { 引用: { 发送者: 'user', 时间: '2026-9-26T03:10[6]', 内容: ['我到了。'] } },
          ],
        },
      ],
    },
  ],
  好友事件: [{ 操作: '发送好友申请', 发起者: '索菲亚', 接收者: 'user', 验证消息: '你好' }],
  清空准备发送: true,
})}</WeChatLog>`;
const logs = parseWeChatLogs(`正文\n${text}\n后续`);
assert.equal(logs.length, 1);
const result = applyWeChatLogs(initial, logs);
assert.equal(result.会话[privateChatKey('凛')].消息.length, 2);
assert.equal(logMessagesPresent(result, logs), true);
assert.equal(logMessagesPresent(initial, logs), false);
assert.equal(result.准备发送, null);
assert.equal(result.账号.user.好友请求.收到.索菲亚.验证消息, '你好');
assert.equal(initial.会话[privateChatKey('凛')], undefined);
assert.equal(chatTitle(privateChatKey('凛'), result.会话[privateChatKey('凛')], result), '凛');
assert.equal(contentSummary(result.会话[privateChatKey('凛')].消息[1].内容), '[语音] [引用]');

const accepted = decideFriendRequest(result, '索菲亚', true);
assert.ok(accepted.账号.user.好友.includes('索菲亚'));
assert.ok(accepted.账号.索菲亚.好友.includes('user'));
assert.equal(accepted.账号.user.好友请求.收到.索菲亚, undefined);

const requested = sendFriendRequest(initial, '索菲亚', '申请好友');
assert.equal(requested.账号.user.好友请求.发出.索菲亚.验证消息, '申请好友');
assert.equal(requested.账号.索菲亚.好友请求.收到.user.验证消息, '申请好友');

assert.throws(() => parseWeChatLogs('<WeChatLog>{}</WeChatLog>'));
assert.throws(() => parseWeChatLogs('<WeChatLog>{'));
assert.throws(() => applyWeChatLogs({ ...initial, 准备发送: { ...initial.准备发送!, 内容: ['不同内容'] } }, logs));
assert.equal(initial.准备发送?.内容[0], '我到了。');
const received = parseWeChatLogs(
  `<WeChatLog>{"新增消息":[{"会话":"私聊:user&凛","会话信息":{"类型":"私聊","成员":["user","凛"]},"消息":[{"发送者":"user","时间":"2026-09-26T03:10[6]","内容":["你好？"]},{"发送者":"凛","时间":"2026-09-26T03:12[6]","内容":["你好。","请问有什么事吗？"]}]}]}</WeChatLog>`,
);
assert.deepEqual(received[0].好友事件, []);
const receivedData = applyWeChatLogs({ ...initial, 准备发送: null }, received);
assert.equal(receivedData.会话['私聊:user&凛'].消息.length, 2);
const awaiting = {
  ...initial,
  准备发送: { 会话: '私聊:user&凛', 时间: '2026-09-26T03:10[6]', 内容: ['你好？'] },
};
assert.equal(logConfirmsPending(awaiting, received[0]), true);
const confirmed = applyWeChatLogs(awaiting, received);
assert.equal(confirmed.准备发送, null);
assert.equal(confirmed.会话['私聊:user&凛'].消息.length, 2);
assert.equal(initial.准备发送?.内容[0], '我到了。');
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
