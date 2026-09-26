import type { 微信数据, 微信消息 } from '../../types';
import { isWeChatMessage } from './wechatData';

export type ReadCursors = Record<string, number>;

export function initialReadCursors(data: 微信数据): ReadCursors {
  return Object.fromEntries(Object.entries(data.会话).map(([key, session]) => [key, session.消息.length]));
}

export function reconcileReadCursors(data: 微信数据, cursors: ReadCursors): ReadCursors {
  return Object.fromEntries(
    Object.entries(data.会话).map(([key, session]) => [
      key,
      Math.min(Number.isSafeInteger(cursors[key]) && cursors[key] >= 0 ? cursors[key] : 0, session.消息.length),
    ]),
  );
}

export function unreadConversationKeys(data: 微信数据, cursors: ReadCursors): string[] {
  return Object.entries(data.会话)
    .filter(
      ([key, session]) =>
        session.成员.includes('user') &&
        session.消息.slice(cursors[key] ?? 0).some(item => isWeChatMessage(item) && item.发送者 !== 'user'),
    )
    .map(([key]) => key);
}

export function newIncomingMessages(
  previous: 微信数据 | null,
  current: 微信数据,
): { key: string; message: 微信消息 }[] {
  if (!previous) return [];
  return Object.entries(current.会话).flatMap(([key, session]) =>
    session.成员.includes('user')
      ? session.消息
          .slice(previous.会话[key]?.消息.length ?? 0)
          .filter((item): item is 微信消息 => isWeChatMessage(item) && item.发送者 !== 'user')
          .map(message => ({ key, message }))
      : [],
  );
}

export function latestNotifiableMessage(
  previous: 微信数据 | null,
  current: 微信数据,
  activeKey: string | null,
  appearance: Record<string, { muted?: boolean }>,
): { key: string; message: 微信消息 } | null {
  return (
    newIncomingMessages(previous, current)
      .filter(({ key }) => key !== activeKey && !appearance[key]?.muted)
      .at(-1) ?? null
  );
}
