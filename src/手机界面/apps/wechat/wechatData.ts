import { klona } from 'klona';
import type { 微信会话, 微信数据, 微信消息, 微信消息内容 } from '../../types';

export interface WeChatLog {
  新增消息: { 会话: string; 会话信息?: Pick<微信会话, '类型' | '名称' | '成员'>; 消息: 微信消息[] }[];
  好友事件: (
    | { 操作: '发送好友申请'; 发起者: string; 接收者: string; 验证消息: string }
    | { 操作: '同意好友申请' | '拒绝好友申请'; 处理者: string; 申请者: string }
  )[];
  清空准备发送?: true;
}

function record(value: unknown): value is Record<string, any> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function messageContent(value: unknown, depth = 0): value is 微信消息内容 {
  if (typeof value === 'string') return true;
  if (!record(value) || depth > 3) return false;
  if ('引用' in value) return validMessage(value.引用, depth + 1);
  if (record(value.转发)) {
    const forwarded = value.转发.私聊 ?? value.转发.群聊;
    return (
      record(forwarded) &&
      Array.isArray(forwarded.成员) &&
      forwarded.成员.every((id: unknown) => typeof id === 'string') &&
      Array.isArray(forwarded.消息) &&
      forwarded.消息.every((message: unknown) => validMessage(message, depth + 1))
    );
  }
  return false;
}

function validMessage(value: unknown, depth = 0): value is 微信消息 {
  return (
    record(value) &&
    typeof value.发送者 === 'string' &&
    typeof value.时间 === 'string' &&
    Array.isArray(value.内容) &&
    value.内容.every((item: unknown) => messageContent(item, depth))
  );
}

function validEvent(value: unknown): value is WeChatLog['好友事件'][number] {
  if (!record(value)) return false;
  if (value.操作 === '发送好友申请')
    return typeof value.发起者 === 'string' && typeof value.接收者 === 'string' && typeof value.验证消息 === 'string';
  return (
    (value.操作 === '同意好友申请' || value.操作 === '拒绝好友申请') &&
    typeof value.处理者 === 'string' &&
    typeof value.申请者 === 'string'
  );
}

function parseLog(value: unknown): WeChatLog {
  if (
    !record(value) ||
    !Array.isArray(value.新增消息) ||
    (value.好友事件 !== undefined && !Array.isArray(value.好友事件))
  )
    throw new Error('WeChatLog 缺少新增消息数组或好友事件格式无效。');
  if (value.清空准备发送 !== undefined && value.清空准备发送 !== true)
    throw new Error('WeChatLog 的清空准备发送只能为 true。');
  const friendEvents = value.好友事件 ?? [];
  if (!friendEvents.every(validEvent)) throw new Error('WeChatLog 包含无效好友事件。');
  for (const item of value.新增消息) {
    if (!record(item) || typeof item.会话 !== 'string' || !Array.isArray(item.消息) || !item.消息.every(validMessage))
      throw new Error('WeChatLog 包含无效会话消息。');
    if (item.会话信息 !== undefined) {
      const info = item.会话信息;
      if (
        !record(info) ||
        !['私聊', '群聊'].includes(info.类型) ||
        !Array.isArray(info.成员) ||
        !info.成员.every((id: unknown) => typeof id === 'string') ||
        (info.名称 !== undefined && typeof info.名称 !== 'string')
      )
        throw new Error('WeChatLog 会话信息无效。');
    }
  }
  return { ...value, 好友事件: friendEvents } as WeChatLog;
}

export function parseWeChatLogs(content: string): WeChatLog[] {
  const openCount = [...content.matchAll(/<WeChatLog>/g)].length;
  const matches = [...content.matchAll(/<WeChatLog>\s*([\s\S]*?)\s*<\/WeChatLog>/g)];
  if (openCount !== matches.length) throw new Error('正文中的 WeChatLog 标签未闭合。');
  return matches.map(([, json]) => {
    try {
      return parseLog(JSON.parse(json));
    } catch (cause) {
      throw new Error('正文中的 WeChatLog 无法解析。', { cause });
    }
  });
}

export function privateChatKey(otherId: string): string {
  return `私聊:user&${otherId}`;
}

export function chatTitle(key: string, session: 微信会话, data: 微信数据): string {
  if (session.类型 === '群聊') return session.名称 || key;
  const other = session.成员.find(id => id !== 'user');
  return other ? data.账号[other]?.昵称 || other : key;
}

export function contentSummary(content: 微信消息内容[]): string {
  return content
    .map(item => {
      if (typeof item === 'string') {
        if (item.startsWith('<语音')) return '[语音]';
        if (item.startsWith('<表情包>')) return '[表情包]';
        if (item.startsWith('<红包')) return '[红包]';
        if (item.startsWith('<转账')) return '[转账]';
        return item;
      }
      return '引用' in item ? '[引用]' : '[转发]';
    })
    .join(' ');
}

export function logConfirmsPending(current: 微信数据, log: WeChatLog): boolean {
  const pending = current.准备发送;
  const first = log.新增消息.flatMap(item => item.消息.map(message => ({ key: item.会话, message })))[0];
  return !!(
    pending &&
    first &&
    first.key === pending.会话 &&
    first.message.发送者 === 'user' &&
    first.message.时间 === pending.时间 &&
    JSON.stringify(first.message.内容) === JSON.stringify(pending.内容)
  );
}

export function applyWeChatLogs(current: 微信数据, logs: WeChatLog[]): 微信数据 {
  const next = klona(current);
  for (const log of logs) {
    const confirmsPending = logConfirmsPending(next, log);
    if (log.清空准备发送 && !confirmsPending) throw new Error('主动聊天日志中的 user 消息与准备发送不一致。');
    for (const item of log.新增消息) {
      let session = next.会话[item.会话];
      if (!session) {
        if (!item.会话信息) throw new Error(`新会话 ${item.会话} 缺少会话信息。`);
        session = next.会话[item.会话] = { ...klona(item.会话信息), 消息: [] };
      }
      if (item.消息.some(message => !session.成员.includes(message.发送者)))
        throw new Error(`会话 ${item.会话} 包含非成员消息。`);
      session.消息.push(...klona(item.消息));
    }
    for (const event of log.好友事件) {
      if (event.操作 === '发送好友申请') {
        const from = next.账号[event.发起者];
        const to = next.账号[event.接收者];
        if (!from || !to) throw new Error('好友申请引用了不存在的账号。');
        from.好友请求.发出[event.接收者] = { 验证消息: event.验证消息 };
        to.好友请求.收到[event.发起者] = { 验证消息: event.验证消息 };
      } else {
        const handler = next.账号[event.处理者];
        const applicant = next.账号[event.申请者];
        if (!handler || !applicant) throw new Error('好友申请处理引用了不存在的账号。');
        delete handler.好友请求.收到[event.申请者];
        delete applicant.好友请求.发出[event.处理者];
        if (event.操作 === '同意好友申请') {
          if (!handler.好友.includes(event.申请者)) handler.好友.push(event.申请者);
          if (!applicant.好友.includes(event.处理者)) applicant.好友.push(event.处理者);
        }
      }
    }
    if (confirmsPending) next.准备发送 = null;
  }
  return next;
}

export function logMessagesPresent(current: 微信数据, logs: WeChatLog[]): boolean {
  return logs.every(log =>
    log.新增消息.every(item => {
      if (!item.消息.length) return true;
      const messages = current.会话[item.会话]?.消息 ?? [];
      const expected = JSON.stringify(item.消息);
      return messages.some((_, index) => JSON.stringify(messages.slice(index, index + item.消息.length)) === expected);
    }),
  );
}

export function sendFriendRequest(current: 微信数据, recipientId: string, message: string): 微信数据 {
  const next = klona(current);
  const user = next.账号.user;
  const recipient = next.账号[recipientId];
  if (!user || !recipient || recipientId === 'user') throw new Error('好友账号不存在。');
  if (user.好友.includes(recipientId)) throw new Error('对方已经是好友。');
  if (user.好友请求.发出[recipientId]) throw new Error('好友申请已发送。');
  user.好友请求.发出[recipientId] = { 验证消息: message };
  recipient.好友请求.收到.user = { 验证消息: message };
  return next;
}

export function decideFriendRequest(current: 微信数据, applicantId: string, accept: boolean): 微信数据 {
  const next = klona(current);
  const user = next.账号.user;
  const applicant = next.账号[applicantId];
  if (!user || !applicant || !user.好友请求.收到[applicantId]) throw new Error('待处理好友申请不存在。');
  delete user.好友请求.收到[applicantId];
  delete applicant.好友请求.发出.user;
  if (accept) {
    if (!user.好友.includes(applicantId)) user.好友.push(applicantId);
    if (!applicant.好友.includes('user')) applicant.好友.push('user');
  }
  return next;
}

export function addSticker(current: 微信数据, name: string, source: string): 微信数据 {
  const user = current.账号.user;
  if (!user) throw new Error('微信用户账号不存在。');
  const trimmed = name.trim();
  if (!trimmed) throw new Error('请填写表情包名称。');
  if (!source.startsWith('data:image/')) throw new Error('请选择图片文件。');
  if (user.表情包[trimmed]) throw new Error('表情包名称已存在。');
  const next = klona(current);
  next.账号.user.表情包[trimmed] = source;
  return next;
}

export function mergeStickerSnapshot(
  current: Record<string, string>,
  snapshot: unknown,
): { stickers: Record<string, string>; backup: Record<string, string>; restoreNeeded: boolean; backupNeeded: boolean } {
  const backup: Record<string, string> = {};
  if (snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot)) {
    for (const [name, source] of Object.entries(snapshot)) {
      if (typeof source === 'string' && source.startsWith('data:image/')) backup[name] = source;
    }
  }
  const stickers = { ...current };
  let restoreNeeded = false;
  let backupNeeded = false;
  for (const [name, source] of Object.entries(backup)) {
    if (!(name in stickers)) {
      stickers[name] = source;
      restoreNeeded = true;
    }
  }
  for (const [name, source] of Object.entries(current)) {
    if (source.startsWith('data:image/') && !(name in backup)) {
      backup[name] = source;
      backupNeeded = true;
    }
  }
  return { stickers, backup, restoreNeeded, backupNeeded };
}
