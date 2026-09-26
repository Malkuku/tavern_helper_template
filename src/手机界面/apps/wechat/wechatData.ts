import { klona } from 'klona';
import type { 微信会话, 微信数据, 微信消息, 微信消息内容, 微信消息流项, 微信操作 } from '../../types';

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
    value.内容.every((item: unknown) => messageContent(item, depth)) &&
    (value.引用 === undefined || (depth < 3 && validMessage(value.引用, depth + 1)))
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
  if (typeof value.操作者 !== 'string' || typeof value.会话 !== 'string') return false;
  if (value.操作 === '好友申请') return typeof value.目标 === 'string' && typeof value.验证消息 === 'string';
  if (value.操作 === '通过好友申请' || value.操作 === '拒绝好友申请') return typeof value.目标 === 'string';
  if (['领取红包', '领取转账', '退回转账'].includes(value.操作))
    return record(value.目标) && typeof value.目标.发送者 === 'string' && typeof value.目标.时间 === 'string';
  if (value.操作 === '拍一拍') return typeof value.目标 === 'string';
  if (value.操作 === '创建群聊') return typeof value.名称 === 'string' && value.名称.trim().length > 0;
  if (value.操作 === '邀请进群') return typeof value.目标 === 'string';
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

export function privateKey(a: string, b: string): string {
  return a === 'user' ? privateChatKey(b) : b === 'user' ? privateChatKey(a) : `私聊:${[a, b].sort().join('&')}`;
}

export function isWeChatMessage(item: 微信消息流项): item is 微信消息 {
  return '发送者' in item;
}

export function friendRequest(session: 微信会话 | undefined): 微信操作 | null {
  if (!session || session.类型 !== '私聊') return null;
  for (let index = session.消息.length - 1; index >= 0; index--) {
    const item = session.消息[index];
    if (isWeChatMessage(item)) continue;
    if (item.操作 === '通过好友申请' || item.操作 === '拒绝好友申请') return null;
    if (item.操作 === '好友申请') return item;
  }
  return null;
}

export function operationSummary(item: 微信操作): string {
  if (item.操作 === '好友申请') return `${item.操作者}申请添加${item.目标}为好友：${item.验证消息 || ''}`;
  if (item.操作 === '通过好友申请') return `${item.操作者}通过了${item.目标}的好友申请`;
  if (item.操作 === '拒绝好友申请') return `${item.操作者}拒绝了${item.目标}的好友申请`;
  if (item.操作 === '拍一拍') return `${item.操作者}拍了拍${item.目标}`;
  if (item.操作 === '创建群聊') return `${item.操作者}创建了群聊`;
  if (item.操作 === '邀请进群') return `${item.操作者}邀请${item.目标}加入群聊`;
  if (item.操作 === '领取红包') return `${item.操作者}领取了红包`;
  if (item.操作 === '领取转账') return `${item.操作者}确认了收款`;
  if (item.操作 === '退回转账') return `${item.操作者}退回了转账`;
  throw new Error('未知微信操作。');
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
      return '[转发]';
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
    JSON.stringify(first.内容) === JSON.stringify(pending.内容) &&
    JSON.stringify(first.引用) === JSON.stringify(pending.引用)
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
  if (JSON.stringify(first.引用) !== JSON.stringify(pending.引用)) return '引用不一致。';
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
          if (
            event.会话信息.类型 !== '私聊' ||
            event.会话信息.成员.length !== 2 ||
            privateKey(event.会话信息.成员[0], event.会话信息.成员[1]) !== event.会话
          )
            throw new Error('新私聊会话信息无效。');
          session = next.会话[event.会话] = { ...klona(event.会话信息), 消息: [] };
        }
        if (!session.成员.includes(event.发送者)) throw new Error(`会话 ${event.会话} 包含非成员消息。`);
        if (session.类型 === '私聊' && !mutualFriends(next, session.成员[0], session.成员[1]))
          throw new Error('非好友不能发送普通私聊消息。');
        session.消息.push({
          发送者: event.发送者,
          时间: event.时间,
          内容: klona(event.内容),
          ...(event.引用 ? { 引用: klona(event.引用) } : {}),
        });
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
  if (!next.账号[event.操作者]) throw new Error('微信操作人不存在。');
  if (event.操作 === '创建群聊') {
    if (!event.会话.startsWith('群聊:') || next.会话[event.会话]) throw new Error('群聊会话 key 无效或已存在。');
    const session: 微信会话 = { 类型: '群聊', 名称: event.名称, 群主: event.操作者, 成员: [event.操作者], 消息: [] };
    next.会话[event.会话] = session;
    session.消息.push(persistOperation(event));
    return;
  }
  if (event.操作 === '好友申请' || event.操作 === '通过好友申请' || event.操作 === '拒绝好友申请') {
    const other = event.目标;
    if (
      typeof other !== 'string' ||
      !next.账号[other] ||
      other === event.操作者 ||
      event.会话 !== privateKey(event.操作者, other)
    )
      throw new Error('好友操作目标无效。');
    const session =
      next.会话[event.会话] ??
      (next.会话[event.会话] = {
        类型: '私聊',
        成员:
          event.会话 === privateChatKey(other)
            ? ['user', other]
            : event.会话 === privateChatKey(event.操作者)
              ? ['user', event.操作者]
              : [event.操作者, other].sort(),
        消息: [],
      });
    if (session.类型 !== '私聊' || !session.成员.includes(event.操作者) || !session.成员.includes(other))
      throw new Error('好友操作会话无效。');
    const pending = friendRequest(session);
    if (event.操作 === '好友申请') {
      if (mutualFriends(next, event.操作者, other) || pending) throw new Error('已经是好友或有待处理申请。');
    } else {
      if (!pending || pending.操作者 !== other || pending.目标 !== event.操作者)
        throw new Error('待处理好友申请不存在。');
      if (event.操作 === '通过好友申请') {
        next.账号[event.操作者].好友.push(other);
        next.账号[other].好友.push(event.操作者);
      }
    }
    session.消息.push(persistOperation(event));
    return;
  }
  const session = next.会话[event.会话];
  if (!session) throw new Error(`操作引用了不存在的会话 ${event.会话}。`);
  if (!session.成员.includes(event.操作者)) throw new Error('微信操作人不是会话成员。');
  if (event.操作 === '邀请进群') {
    if (session.类型 !== '群聊' || !next.账号[event.目标] || session.成员.includes(event.目标))
      throw new Error('群邀请目标无效。');
    if (!mutualFriends(next, event.操作者, event.目标)) throw new Error('只能邀请自己的好友进群。');
    session.成员.push(event.目标);
    session.消息.push(persistOperation(event));
  } else if (event.操作 === '拍一拍') {
    if (!session.成员.includes(event.目标)) throw new Error('拍一拍目标不是会话成员。');
    session.消息.push(persistOperation(event));
  } else {
    const tag = event.操作 === '领取红包' ? '红包' : '转账';
    const target = [...session.消息]
      .reverse()
      .find(
        item =>
          isWeChatMessage(item) &&
          item.发送者 === event.目标.发送者 &&
          item.时间 === event.目标.时间 &&
          item.发送者 !== event.操作者 &&
          item.内容.some(
            (part, index) => typeof part === 'string' && part.startsWith(`<${tag} `) && !item.特殊内容状态?.[index],
          ),
      );
    if (!target || !isWeChatMessage(target)) throw new Error('款项目标不存在或已经处理。');
    const index = target.内容.findIndex(
      (part, index) => typeof part === 'string' && part.startsWith(`<${tag} `) && !target.特殊内容状态?.[index],
    );
    target.特殊内容状态 = {
      ...target.特殊内容状态,
      [index]: event.操作 === '领取红包' ? '已领取' : event.操作 === '领取转账' ? '已收款' : '已退回',
    };
    session.消息.push(persistOperation(event));
  }
}

function mutualFriends(data: 微信数据, a: string, b: string): boolean {
  return !!data.账号[a]?.好友.includes(b) && !!data.账号[b]?.好友.includes(a);
}

function persistOperation(event: OperationEvent): 微信操作 {
  return {
    时间: event.时间,
    操作: event.操作,
    操作者: event.操作者,
    ...(event.目标 !== undefined ? { 目标: klona(event.目标) } : {}),
    ...(event.验证消息 !== undefined ? { 验证消息: event.验证消息 } : {}),
    ...(event.名称 !== undefined ? { 名称: event.名称 } : {}),
  } as 微信操作;
}

export function logMessagesPresent(current: 微信数据, logs: WeChatLog[]): boolean {
  return logs.every(log =>
    log.事件.every(item => {
      if (item.类型 === '消息') {
        const messages = current.会话[item.会话]?.消息 ?? [];
        return messages.some(
          message =>
            isWeChatMessage(message) &&
            message.发送者 === item.发送者 &&
            message.时间 === item.时间 &&
            JSON.stringify(message.内容) === JSON.stringify(item.内容),
        );
      }
      return (current.会话[item.会话]?.消息 ?? []).some(
        entry =>
          !isWeChatMessage(entry) &&
          entry.操作 === item.操作 &&
          entry.时间 === item.时间 &&
          entry.操作者 === item.操作者 &&
          JSON.stringify(entry.目标) === JSON.stringify(item.目标),
      );
    }),
  );
}

export function sendFriendRequest(current: 微信数据, recipientId: string, message: string, time: string): 微信数据 {
  return applyWeChatOperation(current, {
    类型: '操作',
    操作: '好友申请',
    操作者: 'user',
    目标: recipientId,
    会话: privateChatKey(recipientId),
    验证消息: message,
    时间: time,
  });
}

export function decideFriendRequest(current: 微信数据, applicantId: string, accept: boolean, time: string): 微信数据 {
  return applyWeChatOperation(current, {
    类型: '操作',
    操作: accept ? '通过好友申请' : '拒绝好友申请',
    操作者: 'user',
    目标: applicantId,
    会话: privateChatKey(applicantId),
    时间: time,
  });
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
