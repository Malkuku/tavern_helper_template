import { klona } from 'klona';
import type { 微信会话, 微信数据, 微信消息, 微信消息内容 } from '../../types';

type MessageEvent = 微信消息 & { 类型: '消息'; 会话: string; 会话信息?: Pick<微信会话, '类型' | '名称' | '成员'> };
export type OperationEvent = { 类型: '操作'; 操作: string; 时间: string; [key: string]: any };
export interface WeChatLog {
  事件: (MessageEvent | OperationEvent)[];
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

function validEvent(value: unknown): value is WeChatLog['事件'][number] {
  if (!record(value)) return false;
  if (value.类型 === '消息') {
    const info = value.会话信息;
    return (
      typeof value.会话 === 'string' &&
      validMessage(value) &&
      (info === undefined ||
        (record(info) &&
          ['私聊', '群聊'].includes(info.类型) &&
          Array.isArray(info.成员) &&
          info.成员.every((id: unknown) => typeof id === 'string')))
    );
  }
  if (value.类型 !== '操作' || typeof value.时间 !== 'string') return false;
  if (value.操作 === '发送好友申请')
    return typeof value.发起者 === 'string' && typeof value.接收者 === 'string' && typeof value.验证消息 === 'string';
  if (value.操作 === '同意好友申请' || value.操作 === '拒绝好友申请')
    return typeof value.处理者 === 'string' && typeof value.申请者 === 'string';
  if (['领取红包', '领取转账', '退回转账', '撤回消息'].includes(value.操作))
    return (
      typeof value.操作者 === 'string' &&
      typeof value.会话 === 'string' &&
      record(value.目标) &&
      typeof value.目标.发送者 === 'string' &&
      typeof value.目标.时间 === 'string'
    );
  if (value.操作 === '拍一拍')
    return typeof value.操作者 === 'string' && typeof value.目标 === 'string' && typeof value.会话 === 'string';
  if (value.操作 === '邀请进群')
    return typeof value.操作者 === 'string' && typeof value.对象 === 'string' && typeof value.会话 === 'string';
  return false;
}

function parseLog(value: unknown): WeChatLog {
  if (!record(value) || !Array.isArray(value.事件) || !value.事件.every(validEvent))
    throw new Error('WeChatLog 事件数组无效。');
  return value as WeChatLog;
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
        if (item.startsWith('<名片')) return '[名片]';
        return item;
      }
      return '引用' in item ? '[引用]' : '[转发]';
    })
    .join(' ');
}

export function logConfirmsPending(current: 微信数据, log: WeChatLog): boolean {
  const pending = current.准备发送;
  const first = log.事件[0];
  return !!(
    pending &&
    first &&
    first.类型 === '消息' &&
    first.会话 === pending.会话 &&
    first.发送者 === 'user' &&
    sameWeChatTime(first.时间, pending.时间) &&
    JSON.stringify(first.内容) === JSON.stringify(pending.内容)
  );
}

function sameWeChatTime(a: string, b: string): boolean {
  if (a === b) return true;
  const canonical = (value: string) => {
    const match = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})T(\d{2}:\d{2}\[\d\])$/);
    return match ? `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}T${match[4]}` : null;
  };
  return canonical(a) !== null && canonical(a) === canonical(b);
}

function pendingMismatch(current: 微信数据, log: WeChatLog): string | null {
  const pending = current.准备发送;
  const first = log.事件[0];
  if (!pending || !first || first.类型 !== '消息' || first.发送者 !== 'user') return null;
  if (first.会话 !== pending.会话) return `会话不一致（待发送：${pending.会话}；正文：${first.会话}）。`;
  if (!sameWeChatTime(first.时间, pending.时间)) return `时间不一致（待发送：${pending.时间}；正文：${first.时间}）。`;
  if (JSON.stringify(first.内容) !== JSON.stringify(pending.内容))
    return `内容不一致（待发送：${JSON.stringify(pending.内容)}；正文：${JSON.stringify(first.内容)}）。`;
  return null;
}

export function applyWeChatLogs(current: 微信数据, logs: WeChatLog[]): 微信数据 {
  const next = klona(current);
  for (const log of logs) {
    const confirmsPending = logConfirmsPending(next, log);
    const mismatch = pendingMismatch(next, log);
    if (mismatch) throw new Error(`主动聊天日志中的 user 消息与准备发送${mismatch}`);
    for (const event of log.事件) {
      if (event.类型 === '消息') {
        let session = next.会话[event.会话];
        if (!session) {
          if (!event.会话信息) throw new Error(`新会话 ${event.会话} 缺少会话信息。`);
          session = next.会话[event.会话] = { ...klona(event.会话信息), 消息: [] };
        }
        if (!session.成员.includes(event.发送者)) throw new Error(`会话 ${event.会话} 包含非成员消息。`);
        session.消息.push({ 发送者: event.发送者, 时间: event.时间, 内容: klona(event.内容) });
        continue;
      }
      applyOperationInPlace(next, event);
    }
    if (confirmsPending) next.准备发送 = null;
  }
  return next;
}

export function applyWeChatOperation(current: 微信数据, event: OperationEvent): 微信数据 {
  if (!validEvent(event)) throw new Error('微信操作格式无效。');
  const next = klona(current);
  applyOperationInPlace(next, event);
  return next;
}

function applyOperationInPlace(next: 微信数据, event: OperationEvent): void {
  if (event.操作 === '发送好友申请') {
    const from = next.账号[event.发起者];
    const to = next.账号[event.接收者];
    if (!from || !to || from.好友.includes(event.接收者) || from.好友请求.发出[event.接收者])
      throw new Error('好友申请目标无效或已申请。');
    from.好友请求.发出[event.接收者] = { 验证消息: event.验证消息 };
    to.好友请求.收到[event.发起者] = { 验证消息: event.验证消息 };
  } else if (event.操作 === '同意好友申请' || event.操作 === '拒绝好友申请') {
    const handler = next.账号[event.处理者];
    const applicant = next.账号[event.申请者];
    if (!handler || !applicant || !handler.好友请求.收到[event.申请者]) throw new Error('待处理好友申请不存在。');
    delete handler.好友请求.收到[event.申请者];
    delete applicant.好友请求.发出[event.处理者];
    if (event.操作 === '同意好友申请') {
      if (!handler.好友.includes(event.申请者)) handler.好友.push(event.申请者);
      if (!applicant.好友.includes(event.处理者)) applicant.好友.push(event.处理者);
    }
  } else {
    const session = next.会话[event.会话];
    if (!session) throw new Error(`操作引用了不存在的会话 ${event.会话}。`);
    if (!session.成员.includes(event.操作者)) throw new Error('微信操作人不是会话成员。');
    if (event.操作 === '邀请进群') {
      if (session.类型 !== '群聊' || !next.账号[event.对象]) throw new Error('群邀请目标无效。');
      if (session.成员.includes(event.对象)) throw new Error('该账号已在群聊中。');
      session.成员.push(event.对象);
      session.消息.push({
        发送者: event.操作者,
        时间: event.时间,
        内容: [`${event.操作者}邀请${event.对象}加入群聊`],
        系统提示: true,
      });
    } else if (event.操作 === '拍一拍') {
      if (!session.成员.includes(event.目标)) throw new Error('拍一拍目标不是会话成员。');
      session.消息.push({
        发送者: event.操作者,
        时间: event.时间,
        内容: [`${event.操作者}拍了拍${event.目标}`],
        系统提示: true,
      });
    } else {
      const targets = session.消息.filter(
        message => message.发送者 === event.目标.发送者 && message.时间 === event.目标.时间,
      );
      if (targets.length !== 1) throw new Error('微信操作目标消息不存在或不唯一。');
      const target = targets[0];
      if (event.操作 === '撤回消息') {
        if (target.发送者 !== event.操作者) throw new Error('只能撤回自己的消息。');
        if (target.已撤回) throw new Error('消息已经撤回。');
        target.已撤回 = true;
      } else {
        const tag = event.操作 === '领取红包' ? '红包' : '转账';
        const index = target.内容.findIndex(item => typeof item === 'string' && item.startsWith(`<${tag} `));
        if (index < 0 || target.已撤回) throw new Error(`${event.操作}目标类型不匹配。`);
        if (target.发送者 === event.操作者) throw new Error('不能领取或退回自己发送的款项。');
        if (target.特殊内容状态?.[index]) throw new Error('该款项已经处理。');
        const suffix = event.操作 === '领取红包' ? '已领取' : event.操作 === '领取转账' ? '已收款' : '已退回';
        target.特殊内容状态 = { ...target.特殊内容状态, [index]: suffix };
      }
    }
  }
}

export function logMessagesPresent(current: 微信数据, logs: WeChatLog[]): boolean {
  return logs.every(log =>
    log.事件.every(item => {
      if (item.类型 === '消息') {
        const messages = current.会话[item.会话]?.消息 ?? [];
        return messages.some(message => message.发送者 === item.发送者 && message.时间 === item.时间);
      }
      if (
        item.操作 === '领取红包' ||
        item.操作 === '领取转账' ||
        item.操作 === '退回转账' ||
        item.操作 === '撤回消息'
      ) {
        const target = current.会话[item.会话]?.消息.find(
          message => message.发送者 === item.目标.发送者 && message.时间 === item.目标.时间,
        );
        if (!target) return false;
        if (item.操作 === '撤回消息') return target.已撤回 === true;
        const tag = item.操作 === '领取红包' ? '红包' : '转账';
        const index = target.内容.findIndex(part => typeof part === 'string' && part.startsWith(`<${tag} `));
        const expected = item.操作 === '领取红包' ? '已领取' : item.操作 === '领取转账' ? '已收款' : '已退回';
        return index >= 0 && target.特殊内容状态?.[index] === expected;
      }
      if (item.操作 === '拍一拍' || item.操作 === '邀请进群') {
        const messages = current.会话[item.会话]?.消息 ?? [];
        return messages.some(
          message => message.系统提示 && message.发送者 === item.操作者 && message.时间 === item.时间,
        );
      }
      if (item.操作 === '发送好友申请') {
        const handledLater = log.事件.some(
          later =>
            later.类型 === '操作' &&
            (later.操作 === '同意好友申请' || later.操作 === '拒绝好友申请') &&
            later.处理者 === item.接收者 &&
            later.申请者 === item.发起者,
        );
        return handledLater || !!current.账号[item.发起者]?.好友请求.发出[item.接收者];
      }
      if (item.操作 === '同意好友申请') return !!current.账号[item.处理者]?.好友.includes(item.申请者);
      if (item.操作 === '拒绝好友申请') return !current.账号[item.处理者]?.好友请求.收到[item.申请者];
      return false;
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
