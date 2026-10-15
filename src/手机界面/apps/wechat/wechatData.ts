import { klona } from 'klona';
import type { 微信会话, 微信数据, 微信消息, 微信消息内容, 微信消息流项, 微信操作 } from '../../types';
import { parseLocationShare } from '../map/locationShare';
import { wechatRoleAvatar } from '../../../尘史使徒/UI/components/common/roleAvatarFallback';
import { organizationNoticeAccount, organizationNoticeKey } from '../witch/organizationExchange';

type MessageEvent = 微信消息 & {
  楼层ID: number;
  类型: '消息';
  会话: string;
  会话信息?: Pick<微信会话, '类型' | '名称' | '成员'>;
};
export type OperationEvent = { 类型: '操作'; 操作: string; 时间: string; [key: string]: any };
export interface WeChatLog {
  事件: (MessageEvent | OperationEvent)[];
}

function record(value: unknown): value is Record<string, any> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function messageContent(value: unknown, depth = 0): value is 微信消息内容 {
  if (typeof value === 'string') return !value.startsWith('<位置') || parseLocationShare(value) !== null;
  if (!record(value) || depth > 3) return false;
  if (record(value.转发)) {
    const forwarded = value.转发.私聊 ?? value.转发.群聊;
    return (
      record(forwarded) &&
      Array.isArray(forwarded.成员) &&
      forwarded.成员.every((id: unknown) => typeof id === 'string') &&
      record(forwarded.消息) &&
      Object.entries(forwarded.消息).every(
        ([floor, message]) => validFloorKey(floor) && validMessage(message, depth + 1),
      )
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
    (value.引用 === undefined ||
      (depth < 3 && record(value.引用) && validFloor(value.引用.楼层ID) && validMessage(value.引用, depth + 1)))
  );
}

function validEvent(value: unknown): value is WeChatLog['事件'][number] {
  if (!record(value) || !validFloor(value.楼层ID)) return false;
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
    return (
      record(value.目标) &&
      validFloor(value.目标.楼层ID) &&
      Number.isSafeInteger(value.目标.内容下标) &&
      value.目标.内容下标 >= 0
    );
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
  const matches = [...content.matchAll(/<WeChatLog>\s*((?:(?!<WeChatLog>)[\s\S])*?)\s*<\/WeChatLog>/g)];
  return matches.map(([, json]) => {
    try {
      return parseLog(JSON.parse(json));
    } catch (cause) {
      throw new Error('正文中的 WeChatLog 无法解析。', { cause });
    }
  });
}

export function unappliedWeChatLogs(current: 微信数据, logs: WeChatLog[]): WeChatLog[] {
  const events = logs.flatMap(log => log.事件).filter(event => !alreadyApplied(current, event));
  return events.length ? [{ 事件: events }] : [];
}

function sortableWorldTime(value: string): string {
  const match = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})T(\d{2}):(\d{2})\[([1-7])\]$/);
  if (!match) throw new Error(`聊天时间格式无效：${value}。`);
  const [, year, month, day, hour, minute] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute)));
  if (
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() + 1 !== Number(month) ||
    date.getUTCDate() !== Number(day) ||
    date.getUTCHours() !== Number(hour) ||
    date.getUTCMinutes() !== Number(minute)
  )
    throw new Error(`聊天时间日期无效：${value}。`);
  return `${year}${month.padStart(2, '0')}${day.padStart(2, '0')}${hour}${minute}`;
}

export function worldTimeAfterWeChatLogs(currentTime: string, logs: WeChatLog[]): string {
  let latest = currentTime;
  let latestKey = currentTime ? sortableWorldTime(currentTime) : '';
  for (const event of logs.flatMap(log => log.事件)) {
    const key = sortableWorldTime(event.时间);
    if (key > latestKey) {
      latest = event.时间;
      latestKey = key;
    }
  }
  return latest;
}

export function privateChatKey(otherId: string): string {
  return `私聊:user&${otherId}`;
}

export function privateKey(a: string, b: string): string {
  return a === 'user' ? privateChatKey(b) : b === 'user' ? privateChatKey(a) : `私聊:${[a, b].sort().join('&')}`;
}

function matchesPrivateKey(key: string, a: string, b: string): boolean {
  return key === privateKey(a, b) || (a !== 'user' && b !== 'user' && key === `私聊:${b}&${a}`);
}

function validFloor(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) > 0;
}

function validFloorKey(value: string): boolean {
  return validFloor(Number(value)) && String(Number(value)) === value;
}

export function messageEntries<T>(messages: Record<string, T>): [string, T][] {
  return Object.entries(messages).sort(([a], [b]) => Number(a) - Number(b));
}

export function nextWeChatFloor(messages: Record<string, unknown>): number {
  return Math.max(0, ...Object.keys(messages).map(Number)) + 1;
}

export function deleteWeChatFromFloor(current: 微信数据, conversation: string, floorId: number): 微信数据 {
  const next = klona(current);
  const session = next.会话[conversation];
  if (!session || !Number.isSafeInteger(floorId) || !Object.hasOwn(session.消息, String(floorId)))
    throw new Error('要删除的消息楼层不存在。');
  if (next.准备发送?.会话 === conversation) throw new Error('请先处理当前会话的待发送消息。');
  for (const key of Object.keys(session.消息)) if (Number(key) >= floorId) delete session.消息[key];
  return next;
}

export function isWeChatMessage(item: 微信消息流项): item is 微信消息 {
  return '发送者' in item;
}

export function friendRequest(session: 微信会话 | undefined): 微信操作 | null {
  if (!session || session.类型 !== '私聊') return null;
  for (const [, item] of messageEntries(session.消息).reverse()) {
    if (isWeChatMessage(item)) continue;
    if (item.操作 === '通过好友申请' || item.操作 === '拒绝好友申请') return null;
    if (item.操作 === '好友申请') return item;
  }
  return null;
}

export function incomingFriendRequests(data: 微信数据 | null | undefined): [string, 微信操作][] {
  return Object.values(data?.会话 ?? {})
    .map(friendRequest)
    .filter((item): item is 微信操作 => !!item && item.目标 === 'user')
    .map(item => [item.操作者, item]);
}

export function visibleUserChats(data: 微信数据): [string, 微信会话][] {
  return Object.entries(data.会话).filter(([, session]) => {
    if (!session.成员.includes('user')) return false;
    if (session.类型 === '群聊') return true;
    return canSendPrivateMessage(data, session);
  });
}

export function canSendPrivateMessage(data: 微信数据, session: 微信会话): boolean {
  return Object.values(session.消息).some(isWeChatMessage) || mutualFriends(data, session.成员[0], session.成员[1]);
}

function ensureEventAccounts(data: 微信数据, ids: string[]): void {
  for (const id of new Set(ids)) {
    if (id === organizationNoticeAccount) throw new Error('组织财务仅用于只读通知，不能作为聊天账号。');
    if (typeof id !== 'string' || !id.trim()) throw new Error('聊天人物名称不能为空。');
    if (Object.hasOwn(data.账号, id)) continue;
    data.账号[id] = { 昵称: id === 'user' ? '我' : id, 头像: wechatRoleAvatar(undefined, id), 表情包: {}, 好友: [] };
  }
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
  throw new Error('未知聊天操作。');
}

export function chatTitle(key: string, session: 微信会话, data: 微信数据): string {
  if (session.类型 === '群聊') return session.名称 || key;
  const other = session.成员.find(id => id !== 'user');
  return other ? data.账号[other]?.昵称 || other : key;
}

export function parseTransferMessage(value: string): { amount: string; recipient?: string; remark: string } | null {
  const match = value.match(/^<转账 金额="(\d+(?:\.\d{1,2})?g?)"(?: 收款人="([^"<>]+)")?>([\s\S]*?)<\/转账>$/);
  return match ? { amount: match[1], ...(match[2] ? { recipient: match[2] } : {}), remark: match[3] } : null;
}

export function transferRecipient(session: 微信会话, sender: string, value: string): string {
  const transfer = parseTransferMessage(value);
  if (!transfer) throw new Error('转账内容无效。');
  const recipient = session.类型 === '群聊' ? transfer.recipient : session.成员.find(id => id !== sender);
  if (!recipient || recipient === sender || !session.成员.includes(recipient))
    throw new Error('群聊转账必须指定一位其他群成员收款。');
  if (session.类型 === '私聊' && transfer.recipient && transfer.recipient !== recipient)
    throw new Error('私聊转账收款人与会话成员不一致。');
  return recipient;
}

export function contentSummary(content: 微信消息内容[]): string {
  return content
    .map(item => {
      if (typeof item === 'string') {
        const displayParts = displayContentParts([item]);
        if (displayParts.length > 1 || displayParts[0].part !== item)
          return displayParts
            .map(({ part }) =>
              typeof part === 'string' && /^<表情包>[\s\S]*<\/表情包>$/.test(part) ? '[表情包]' : part,
            )
            .join('');
        if (item.startsWith('<语音')) return '[语音]';
        if (item.startsWith('<表情包>')) return '[表情包]';
        if (item.startsWith('<红包')) return '[红包]';
        if (item.startsWith('<转账')) return '[转账]';
        if (item.startsWith('<名片')) return '[名片]';
        if (parseLocationShare(item)) return `[位置] ${parseLocationShare(item)}`;
        return item;
      }
      return '[转发]';
    })
    .join(' ');
}

export function displayContentParts(content: 微信消息内容[]): { part: 微信消息内容; sourceIndex: number }[] {
  return content.flatMap((item, sourceIndex) => {
    if (typeof item !== 'string') return [{ part: item, sourceIndex }];
    if (/^<(语音|红包|转账)\s[^>]*>[\s\S]*<\/\1>$/.test(item)) return [{ part: item, sourceIndex }];
    const result: { part: 微信消息内容; sourceIndex: number }[] = [];
    const sticker = /<表情包>([\s\S]*?)<\/表情包>/g;
    let start = 0;
    for (const match of item.matchAll(sticker)) {
      if (match.index > start && item.slice(start, match.index).trim())
        result.push({ part: item.slice(start, match.index), sourceIndex });
      result.push({ part: match[0], sourceIndex });
      start = match.index + match[0].length;
    }
    if (start < item.length && item.slice(start).trim()) result.push({ part: item.slice(start), sourceIndex });
    return result.length ? result : [{ part: item, sourceIndex }];
  });
}

export function logConfirmsPending(current: 微信数据, log: WeChatLog): boolean {
  const pending = current.准备发送;
  const first = log.事件[0];
  return !!(
    pending &&
    pending.已确认 !== false &&
    first &&
    first.类型 === '消息' &&
    first.楼层ID === pending.楼层ID &&
    first.会话 === pending.会话 &&
    first.发送者 === 'user' &&
    confirmableWeChatTime(first.时间, pending.时间) &&
    JSON.stringify(first.内容) === JSON.stringify(pending.内容) &&
    JSON.stringify(first.引用) === JSON.stringify(pending.引用)
  );
}

function confirmableWeChatTime(logTime: string, pendingTime: string): boolean {
  if (logTime === pendingTime) return true;
  const sortable = (value: string) => {
    const match = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})T(\d{2}:\d{2}\[\d\])$/);
    return match ? `${match[1]}${match[2].padStart(2, '0')}${match[3].padStart(2, '0')}${match[4].slice(0, 5)}` : null;
  };
  const actual = sortable(logTime);
  const pending = sortable(pendingTime);
  return actual !== null && pending !== null && actual >= pending;
}

function pendingMismatch(current: 微信数据, log: WeChatLog): string | null {
  const pending = current.准备发送;
  const first = log.事件[0];
  if (!pending || pending.已确认 === false || !first || first.类型 !== '消息' || first.发送者 !== 'user') return null;
  if (first.楼层ID !== pending.楼层ID) return `楼层 ID 不一致（待发送：${pending.楼层ID}；正文：${first.楼层ID}）。`;
  if (first.会话 !== pending.会话) return `会话不一致（待发送：${pending.会话}；正文：${first.会话}）。`;
  if (!confirmableWeChatTime(first.时间, pending.时间))
    return `正文时间早于待发送时间或格式无效（待发送：${pending.时间}；正文：${first.时间}）。`;
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
      if (event.会话 === organizationNoticeKey) throw new Error('组织财务通知不能由聊天正文写入。');
      if (alreadyApplied(next, event)) continue;
      if (event.类型 === '消息') {
        let session = next.会话[event.会话];
        if (!session) {
          if (!event.会话信息) throw new Error(`新会话 ${event.会话} 缺少会话信息。`);
          if (
            event.会话信息.类型 !== '私聊' ||
            event.会话信息.成员.length !== 2 ||
            !matchesPrivateKey(event.会话, event.会话信息.成员[0], event.会话信息.成员[1])
          )
            throw new Error('新私聊会话信息无效。');
          session = next.会话[event.会话] = { ...klona(event.会话信息), 消息: {} };
        }
        if (!session.成员.includes(event.发送者)) throw new Error(`会话 ${event.会话} 包含非成员消息。`);
        ensureEventAccounts(next, session.成员);
        for (const item of event.内容) {
          if (typeof item === 'string' && item.startsWith('<转账 ')) transferRecipient(session, event.发送者, item);
        }
        if (event.楼层ID !== nextWeChatFloor(session.消息)) throw new Error(`会话 ${event.会话} 的楼层 ID 不连续。`);
        if (event.引用) {
          const quoted = session.消息[String(event.引用.楼层ID)];
          const quotedContent =
            quoted && isWeChatMessage(quoted)
              ? event.引用.内容下标 === undefined
                ? quoted.内容
                : [quoted.内容[event.引用.内容下标]]
              : undefined;
          if (
            !quoted ||
            !isWeChatMessage(quoted) ||
            quoted.发送者 !== event.引用.发送者 ||
            quoted.时间 !== event.引用.时间 ||
            JSON.stringify(quotedContent) !== JSON.stringify(event.引用.内容)
          )
            throw new Error('引用的楼层 ID 与消息快照不一致。');
        }
        session.消息[String(event.楼层ID)] = {
          发送者: event.发送者,
          时间: event.时间,
          内容: klona(event.内容),
          ...(event.引用 ? { 引用: klona(event.引用) } : {}),
        };
        continue;
      }
      applyOperationInPlace(next, event);
    }
    if (confirmsPending) next.准备发送 = null;
  }
  return next;
}

export function applyWeChatOperation(current: 微信数据, event: OperationEvent): 微信数据 {
  if (event.会话 === organizationNoticeKey) throw new Error('组织财务会话不支持聊天互动。');
  const next = klona(current);
  event = { ...event, 楼层ID: nextWeChatFloor(next.会话[event.会话]?.消息 ?? {}) };
  if (!validEvent(event)) throw new Error('聊天操作格式无效。');
  applyOperationInPlace(next, event);
  return next;
}

function applyOperationInPlace(next: 微信数据, event: OperationEvent): void {
  ensureEventAccounts(next, [event.操作者, ...(typeof event.目标 === 'string' ? [event.目标] : [])]);
  if (event.楼层ID !== nextWeChatFloor(next.会话[event.会话]?.消息 ?? {}))
    throw new Error(`会话 ${event.会话} 的楼层 ID 不连续。`);
  if (event.操作 === '创建群聊') {
    if (!event.会话.startsWith('群聊:') || next.会话[event.会话]) throw new Error('群聊会话 key 无效或已存在。');
    const session: 微信会话 = { 类型: '群聊', 名称: event.名称, 群主: event.操作者, 成员: [event.操作者], 消息: {} };
    next.会话[event.会话] = session;
    session.消息[String(event.楼层ID)] = persistOperation(event);
    return;
  }
  if (event.操作 === '好友申请' || event.操作 === '通过好友申请' || event.操作 === '拒绝好友申请') {
    const other = event.目标;
    if (typeof other !== 'string' || !next.账号[other] || other === event.操作者)
      throw new Error(`好友操作目标无效：账号 ${String(other)} 不存在或与操作者相同。`);
    if (!matchesPrivateKey(event.会话, event.操作者, other))
      throw new Error(`好友操作会话无效：${event.会话} 不是双方的私聊。`);
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
        消息: {},
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
    session.消息[String(event.楼层ID)] = persistOperation(event);
    return;
  }
  const session = next.会话[event.会话];
  if (!session) throw new Error(`操作引用了不存在的会话 ${event.会话}。`);
  if (!session.成员.includes(event.操作者)) throw new Error('聊天操作人不是会话成员。');
  if (event.操作 === '邀请进群') {
    if (session.类型 !== '群聊' || !next.账号[event.目标] || session.成员.includes(event.目标))
      throw new Error('群邀请目标无效。');
    if (!mutualFriends(next, event.操作者, event.目标)) throw new Error('只能邀请自己的好友进群。');
    session.成员.push(event.目标);
    session.消息[String(event.楼层ID)] = persistOperation(event);
  } else if (event.操作 === '拍一拍') {
    if (!session.成员.includes(event.目标)) throw new Error('拍一拍目标不是会话成员。');
    session.消息[String(event.楼层ID)] = persistOperation(event);
  } else {
    const tag = event.操作 === '领取红包' ? '红包' : '转账';
    const target = session.消息[String(event.目标.楼层ID)];
    if (!target || !isWeChatMessage(target)) throw new Error('款项目标不存在或已经处理。');
    const index = event.目标.内容下标;
    if (
      target.发送者 === event.操作者 ||
      typeof target.内容[index] !== 'string' ||
      !target.内容[index].startsWith(`<${tag} `) ||
      target.特殊内容状态?.[index]
    )
      throw new Error('款项目标不存在或已经处理。');
    if (tag === '转账' && transferRecipient(session, target.发送者, target.内容[index] as string) !== event.操作者)
      throw new Error('只有指定收款人可以收款或退回转账。');
    target.特殊内容状态 = {
      ...target.特殊内容状态,
      [index]: event.操作 === '领取红包' ? '已领取' : event.操作 === '领取转账' ? '已收款' : '已退回',
    };
    session.消息[String(event.楼层ID)] = persistOperation(event);
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

function alreadyApplied(data: 微信数据, event: WeChatLog['事件'][number]): boolean {
  const stored = data.会话[event.会话]?.消息[String(event.楼层ID)];
  if (!stored) return false;
  if (!logEventMatchesItem(event, stored)) throw new Error(`会话 ${event.会话} 的楼层 ${event.楼层ID} 内容冲突。`);
  return true;
}

function logEventMatchesItem(event: WeChatLog['事件'][number], item: 微信消息流项): boolean {
  if (event.类型 === '消息')
    return (
      isWeChatMessage(item) &&
      item.发送者 === event.发送者 &&
      item.时间 === event.时间 &&
      JSON.stringify(item.内容) === JSON.stringify(event.内容) &&
      JSON.stringify(item.引用) === JSON.stringify(event.引用)
    );
  return (
    !isWeChatMessage(item) &&
    item.操作 === event.操作 &&
    item.时间 === event.时间 &&
    item.操作者 === event.操作者 &&
    JSON.stringify(item.目标) === JSON.stringify(event.目标) &&
    item.验证消息 === event.验证消息 &&
    item.名称 === event.名称
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
