import { MvuUtil } from '@/Utils/MvuUtil';
import { KatEvents } from '@/Constants/KatEvent';
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { klona } from 'klona';
import type { stat_data, 微信数据, 微信消息, 微信消息内容, 次要角色人设 } from '../types';
import {
  addSticker,
  applyWeChatOperation,
  applyWeChatLogs,
  decideFriendRequest,
  deleteWeChatFromFloor,
  logConfirmsPending,
  mergeStickerSnapshot,
  normalizeWeChatIds,
  parseWeChatLogs,
  privateChatKey,
  sendFriendRequest,
  unappliedWeChatLogs,
} from '../apps/wechat/wechatData';
import type { OperationEvent } from '../apps/wechat/wechatData';
import { parseLocationShare } from '../apps/map/locationShare';
import { findPhoneMapPath } from '../apps/map/phoneMap';
import { applyCharacterUnlock, type CharacterKind } from '../apps/data/profileUnlock';
import { applyInventoryTransfers, type InventorySide, type InventoryTransfer } from '../apps/data/inventoryTransfer';
import {
  initialReadCursors,
  latestNotifiableMessage,
  reconcileReadCursors,
  unreadConversationKeys,
  type ReadCursors,
} from '../apps/wechat/wechatNotifications';
import { reconcileWorldbookStatData } from './worldbookInit';
import { changeRuntimeMinorRole as applyRuntimeMinorChange } from '../apps/roleEditor/roleAssets';
import {
  applySkillRefresh,
  buySkill as applySkillPurchase,
  refreshQuote,
  sellSkill as applySkillSale,
} from '../apps/skillShop/skillShop';
import {
  applyItemRefresh,
  buyItem as applyItemPurchase,
  itemRefreshQuote,
  sellItem as applyItemSale,
} from '../apps/itemShop/itemShop';
import {
  abandonTask as applyTaskAbandon,
  acceptTask as applyTaskAccept,
  claimTask as applyTaskClaim,
  refreshTasks as applyTaskRefresh,
  taskRefreshState,
} from '../apps/quests/quests';

function paymentCents(content: unknown, kind: '红包' | '转账'): number {
  if (typeof content !== 'string') throw new Error('款项金额无效。');
  const match = content.match(new RegExp(`^<${kind} 金额="(\\d+(?:\\.\\d{1,2})?)g?">[\\s\\S]*<\\/${kind}>$`));
  if (!match) throw new Error('款项金额无效。');
  const [yuan, fraction = ''] = match[1].split('.');
  const cents = Number(yuan) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(cents) || cents <= 0) throw new Error('款项金额无效。');
  return cents;
}

function settlePayments(data: stat_data, before: 微信数据, after: 微信数据): void {
  const user = data.角色?.user;
  if (!user || !Number.isFinite(user.金钱)) throw new Error('角色金钱变量无效。');
  let balance = Math.round(user.金钱 * 100);
  for (const [key, session] of Object.entries(after.会话)) {
    const oldCount = before.会话[key]?.消息.length ?? 0;
    for (const item of session.消息.slice(oldCount)) {
      if ('发送者' in item) {
        if (item.发送者 === 'user') {
          for (const content of item.内容) {
            if (typeof content === 'string' && content.startsWith('<转账 ')) balance -= paymentCents(content, '转账');
            if (typeof content === 'string' && content.startsWith('<红包 ')) balance -= paymentCents(content, '红包');
          }
        }
        continue;
      }
      if (!['领取红包', '领取转账', '退回转账'].includes(item.操作)) continue;
      if (typeof item.目标 !== 'object' || !item.目标) throw new Error('款项目标无效。');
      const target = session.消息[item.目标.楼层ID - 1];
      if (!target || !('发送者' in target)) throw new Error('款项目标不存在。');
      const kind = item.操作 === '领取红包' ? '红包' : '转账';
      const amount = paymentCents(target.内容[item.目标.内容下标], kind);
      if (item.操作 === '退回转账' && target.发送者 === 'user') balance += amount;
      else if (item.操作 !== '退回转账' && item.操作者 === 'user' && target.发送者 !== 'user') balance += amount;
    }
  }
  if (balance < 0) throw new Error('余额不足，无法转账。');
  user.金钱 = balance / 100;
}

export const useMagicGirlStatStore = defineStore('magic-girl-stat', () => {
  const statData = ref<stat_data | null>(null);
  const wechatLogError = ref('');
  const skillRefreshError = ref('');
  const skillRefreshing = ref(false);
  let skillRefreshStartMessageId = -1;
  const itemRefreshError = ref('');
  const itemRefreshing = ref(false);
  let itemRefreshStartMessageId = -1;
  const taskRefreshError = ref('');
  const taskRefreshing = ref(false);
  let taskRefreshStartMessageId = -1;
  const unreadChatKeys = ref<string[]>([]);
  const wechatNotification = ref<{ key: string; message: 微信消息 } | null>(null);
  const failedWeChatMessageId = ref<number | null>(null);
  const failedWeChatLogIndex = ref<number | null>(null);
  let pollingTimer: ReturnType<typeof setInterval> | undefined;
  let refreshTimer: ReturnType<typeof setTimeout> | undefined;
  let chatGeneration = 0;
  let statWriteQueue = Promise.resolve();
  let stickerSyncQueued = false;
  let readChatId: string | null = null;
  let readCursors: ReadCursors = {};
  let activeWeChatConversation: string | null = null;

  function persistReadCursors() {
    if (!readChatId) return;
    const chatId = readChatId;
    const cursors = { ...readCursors };
    try {
      updateVariablesWith(
        variables => ({
          ...variables,
          magicGirlWeChatRead: { ...(variables.magicGirlWeChatRead || {}), [chatId]: cursors },
        }),
        { type: 'script', script_id: getScriptId() },
      );
    } catch (error) {
      console.error('微信已读位置保存失败', error);
    }
  }

  function syncWeChatNotifications(previous: 微信数据 | null, current: 微信数据) {
    const chatId = SillyTavern.getCurrentChatId();
    if (readChatId !== chatId) {
      readChatId = chatId;
      previous = null;
      activeWeChatConversation = null;
      wechatNotification.value = null;
      let stored: unknown;
      try {
        stored = getVariables({ type: 'script', script_id: getScriptId() })?.magicGirlWeChatRead?.[chatId];
      } catch (error) {
        console.error('微信已读位置读取失败', error);
      }
      readCursors =
        stored && typeof stored === 'object' && !Array.isArray(stored)
          ? reconcileReadCursors(current, stored as ReadCursors)
          : initialReadCursors(current);
      if (!stored) persistReadCursors();
    } else {
      const next = reconcileReadCursors(current, readCursors);
      if (Object.entries(next).some(([key, value]) => readCursors[key] !== value)) {
        readCursors = next;
        persistReadCursors();
      }
    }
    if (activeWeChatConversation && current.会话[activeWeChatConversation]) markWeChatRead(activeWeChatConversation);
    unreadChatKeys.value = unreadConversationKeys(current, readCursors);
    let appearance: Record<string, { muted?: boolean }> = {};
    try {
      appearance = getVariables({ type: 'script', script_id: getScriptId() })?.magicGirlWeChatAppearance || {};
    } catch (error) {
      console.error('微信会话外观读取失败', error);
    }
    const latest = latestNotifiableMessage(previous, current, activeWeChatConversation, appearance);
    if (latest) wechatNotification.value = latest;
  }

  function markWeChatRead(key: string) {
    const session = statData.value?.手机?.微信?.会话[key];
    if (!session?.成员.includes('user') || !readChatId) return;
    if (readCursors[key] !== session.消息.length) {
      readCursors = { ...readCursors, [key]: session.消息.length };
      persistReadCursors();
    }
    unreadChatKeys.value = unreadChatKeys.value.filter(item => item !== key);
    if (wechatNotification.value?.key === key) wechatNotification.value = null;
  }

  function setActiveWeChatConversation(key: string | null) {
    activeWeChatConversation = key;
    if (key) markWeChatRead(key);
  }

  function dismissWeChatNotification() {
    wechatNotification.value = null;
  }

  function queueStatWork<T>(work: () => Promise<T>): Promise<T> {
    const result = statWriteQueue.then(work);
    statWriteQueue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  async function writeStatData(data: stat_data, previous: Mvu.MvuData) {
    const next = { ...previous, stat_data: data };
    await Mvu.replaceMvuData(next, { type: 'message', message_id: getLastMessageId() });
    await eventEmit('mag_variable_update_ended', next, previous);
    refresh();
  }

  async function updateWeChat(
    updater: (current: 微信数据, data: stat_data) => 微信数据,
    beforeWrite?: (data: stat_data) => Promise<void>,
  ) {
    const generation = chatGeneration;
    return queueStatWork(async () => {
      await waitGlobalInitialized('Mvu');
      if (generation !== chatGeneration) throw new Error('聊天已切换，微信操作已取消。');
      const previous = Mvu.getMvuData({ type: 'message', message_id: -1 });
      if (!previous?.stat_data?.手机?.微信) throw new Error('微信变量尚未初始化，请重新打开手机。');
      const data = klona(previous.stat_data) as stat_data;
      const before = data.手机.微信;
      const after = updater(before, data);
      settlePayments(data, before, after);
      data.手机.微信 = after;
      if (generation !== chatGeneration) throw new Error('聊天已切换，微信操作已取消。');
      if (beforeWrite) await beforeWrite(data);
      if (generation !== chatGeneration) throw new Error('聊天已切换，微信操作已取消。');
      await writeStatData(data, previous);
    });
  }

  async function changeCharacterData<T>(change: (data: stat_data) => T): Promise<T> {
    const generation = chatGeneration;
    return queueStatWork(async () => {
      await waitGlobalInitialized('Mvu');
      if (generation !== chatGeneration) throw new Error('聊天已切换，操作已取消。');
      const previous = Mvu.getMvuData({ type: 'message', message_id: -1 });
      if (!previous?.stat_data?.角色?.user) throw new Error('角色变量尚未初始化。');
      const data = klona(previous.stat_data) as stat_data;
      const result = change(data);
      if (generation !== chatGeneration) throw new Error('聊天已切换，操作已取消。');
      await writeStatData(data, previous);
      return result;
    });
  }

  async function saveProfileBaseInfo(value: string) {
    await changeCharacterData(data => {
      data.角色.user.基础信息.背景 = value;
    });
  }

  async function changeRuntimeMinorRole(key: string, original: 次要角色人设, next: 次要角色人设 | null) {
    await changeCharacterData(data => applyRuntimeMinorChange(data, key, original, next));
  }

  async function unlockCharacterInfo(kind: CharacterKind, key: string, field: string): Promise<boolean> {
    return changeCharacterData(data => applyCharacterUnlock(data, kind, key, field));
  }

  async function transferInventory(transfers: InventoryTransfer[]): Promise<void> {
    if (!transfers.length) return;
    await changeCharacterData(data => applyInventoryTransfers(data, transfers));
  }

  async function refreshGeneratedShop(kind: '技能' | '道具') {
    if (skillRefreshing.value || itemRefreshing.value || taskRefreshing.value)
      throw new Error('已有生成任务正在进行，请等待完成。');
    const generation = chatGeneration;
    await waitGlobalInitialized('Mvu');
    if (generation !== chatGeneration) throw new Error('聊天已切换，商店刷新已取消。');
    const current = Mvu.getMvuData({ type: 'message', message_id: -1 })?.stat_data as stat_data | undefined;
    if (!current?.角色?.user || !current.系统) throw new Error('商店变量尚未初始化。');
    const quote = kind === '技能' ? refreshQuote(current) : itemRefreshQuote(current);
    if (!Number.isSafeInteger(current.角色.user.恶堕积分) || current.角色.user.恶堕积分 < quote.price)
      throw new Error(`恶堕积分不足，需要 ${quote.price} 点。`);
    if (generation !== chatGeneration) throw new Error('聊天已切换，商店刷新已取消。');
    if (skillRefreshing.value || itemRefreshing.value || taskRefreshing.value)
      throw new Error('已有生成任务正在进行，请等待完成。');
    const refreshing = kind === '技能' ? skillRefreshing : itemRefreshing;
    const refreshError = kind === '技能' ? skillRefreshError : itemRefreshError;
    refreshError.value = '';
    refreshing.value = true;
    if (kind === '技能') skillRefreshStartMessageId = getLastMessageId();
    else itemRefreshStartMessageId = getLastMessageId();
    try {
      await eventEmit(kind === '技能' ? 'Chat_On_SkillShop' : 'Chat_On_ItemShop');
    } catch (error) {
      refreshing.value = false;
      refreshError.value = error instanceof Error ? error.message : `${kind}商店刷新事件触发失败。`;
      throw error;
    }
  }

  async function refreshSkillShop() {
    await refreshGeneratedShop('技能');
  }

  async function refreshItemShop() {
    await refreshGeneratedShop('道具');
  }

  function cancelSkillRefresh() {
    if (!skillRefreshing.value) return;
    skillRefreshing.value = false;
    skillRefreshError.value = '已取消等待；迟到的技能生成结果不会结算。';
  }

  function cancelItemRefresh() {
    if (!itemRefreshing.value) return;
    itemRefreshing.value = false;
    itemRefreshError.value = '已取消等待；迟到的道具生成结果不会结算。';
  }

  async function purchaseSkill(name: string) {
    await changeCharacterData(data => applySkillPurchase(data, name));
  }

  async function sellOwnedSkill(name: string): Promise<number> {
    return changeCharacterData(data => applySkillSale(data, name));
  }

  async function purchaseItem(name: string, quantity: number) {
    await changeCharacterData(data => applyItemPurchase(data, name, quantity));
  }

  async function sellOwnedItem(side: InventorySide, name: string, quantity: number): Promise<number> {
    return changeCharacterData(data => applyItemSale(data, side, name, quantity));
  }

  async function acceptTask(name: string) {
    await changeCharacterData(data => applyTaskAccept(data, name));
  }

  async function abandonTask(name: string) {
    await changeCharacterData(data => applyTaskAbandon(data, name));
  }

  async function claimTask(name: string): Promise<number> {
    return changeCharacterData(data => applyTaskClaim(data, name));
  }

  async function refreshTaskBoard() {
    if (taskRefreshing.value || skillRefreshing.value || itemRefreshing.value)
      throw new Error('已有生成任务正在进行，请等待完成。');
    const generation = chatGeneration;
    await waitGlobalInitialized('Mvu');
    if (generation !== chatGeneration) throw new Error('聊天已切换，任务刷新已取消。');
    const current = Mvu.getMvuData({ type: 'message', message_id: -1 })?.stat_data as stat_data | undefined;
    if (!current?.系统 || !current?.任务 || !current?.任务候选) throw new Error('任务变量尚未初始化。');
    if (!taskRefreshState(current).available) throw new Error('今天的免费任务刷新次数已用完。');
    if (taskRefreshing.value || skillRefreshing.value || itemRefreshing.value)
      throw new Error('已有生成任务正在进行，请等待完成。');
    taskRefreshError.value = '';
    taskRefreshing.value = true;
    taskRefreshStartMessageId = getLastMessageId();
    try {
      await eventEmit('Chat_On_Quest');
    } catch (error) {
      taskRefreshing.value = false;
      taskRefreshError.value = error instanceof Error ? error.message : '任务刷新事件触发失败。';
      throw error;
    }
  }

  function cancelTaskRefresh() {
    if (!taskRefreshing.value) return;
    taskRefreshing.value = false;
    taskRefreshError.value = '已取消等待；迟到的任务生成结果不会结算。';
  }

  async function sendWeChatMessage(
    conversation: string,
    content: 微信消息内容[],
    quote?: 微信消息 & { 内容下标?: number },
  ) {
    const generation = chatGeneration;
    await updateWeChat((current, stat) => {
      for (const item of content) {
        if (typeof item !== 'string' || !item.startsWith('<位置')) continue;
        const key = parseLocationShare(item);
        if (!key || !findPhoneMapPath(stat.地图 ?? {}, key))
          throw new Error('位置分享必须使用当前地图中存在的节点 key。');
      }
      if (current.准备发送 && current.准备发送.已确认 !== false)
        throw new Error('上一批微信仍在等待正文确认，请先重试或等待完成。');
      if (current.准备发送 && current.准备发送.会话 !== conversation) throw new Error('请先确认当前会话的待发送消息。');
      const worldTime = stat.世界?.时间;
      if (!worldTime) throw new Error('世界时间尚未设置，无法发送微信。');
      const session = current.会话[conversation];
      if (session) {
        if (!session.成员.includes('user')) throw new Error('不能从 user 手机向非本人会话发送消息。');
        if (
          session.类型 === '私聊' &&
          !session.成员.every(
            id => id === 'user' || (current.账号.user?.好友.includes(id) && current.账号[id]?.好友.includes('user')),
          )
        )
          throw new Error('非好友不能发送普通私聊消息。');
      } else {
        const other = conversation.startsWith('私聊:user&') ? conversation.slice('私聊:user&'.length) : '';
        if (
          !other ||
          conversation !== privateChatKey(other) ||
          !current.账号.user?.好友.includes(other) ||
          !current.账号[other]
        )
          throw new Error('目标私聊不存在或对方不是好友。');
      }
      const wechat = normalizeWeChatIds(current);
      if (wechat.准备发送) {
        if (quote) throw new Error('引用只能添加在本批消息的第一项。');
        wechat.准备发送.内容.push(...klona(content));
        return wechat;
      }
      wechat.准备发送 = {
        楼层ID: (wechat.会话[conversation]?.消息.length ?? 0) + 1,
        会话: conversation,
        时间: worldTime,
        内容: klona(content),
        已确认: false,
        ...(quote
          ? {
              引用: {
                楼层ID: quote.楼层ID,
                ...(quote.内容下标 === undefined ? {} : { 内容下标: quote.内容下标 }),
                发送者: quote.发送者,
                时间: quote.时间,
                内容: klona(quote.内容),
              },
            }
          : {}),
      };
      return wechat;
    });
    if (generation !== chatGeneration) throw new Error('聊天已切换，请返回原聊天重试发送。');
  }

  async function confirmWeChatSend() {
    const generation = chatGeneration;
    await updateWeChat(current => {
      if (!current.准备发送) throw new Error('没有待发送的微信消息。');
      if (current.准备发送.已确认 !== false) throw new Error('这批微信消息已经确认，请等待正文或重试生成。');
      const wechat = klona(current);
      wechat.准备发送!.已确认 = true;
      return wechat;
    });
    if (generation !== chatGeneration) throw new Error('聊天已切换，请返回原聊天重试发送。');
    await eventEmit('Chat_On_WeChat');
  }

  async function discardWeChatDraft() {
    await updateWeChat(current => {
      if (!current.准备发送 || current.准备发送.已确认 !== false) throw new Error('没有可清空的待发送微信消息。');
      const wechat = klona(current);
      wechat.准备发送 = null;
      return wechat;
    });
  }

  async function deleteWeChatFloor(conversation: string, floorId: number) {
    const lastId = getLastMessageId();
    const originals = getChatMessages(`0-${lastId}`).filter(
      message => message.role === 'assistant' && message.message.includes('<WeChatLog>'),
    );
    const edits = originals
      .map(message => ({
        message_id: message.message_id,
        message: message.message.replace(/<WeChatLog>\s*([\s\S]*?)\s*<\/WeChatLog>/g, (tag, json: string) => {
          let log;
          try {
            log = JSON.parse(json);
          } catch {
            return tag;
          }
          if (!Array.isArray(log.事件)) return tag;
          const events = log.事件.filter((event: any) => event.会话 !== conversation || event.楼层ID < floorId);
          return events.length === log.事件.length
            ? tag
            : events.length
              ? `<WeChatLog>${JSON.stringify({ ...log, 事件: events })}</WeChatLog>`
              : '';
        }),
      }))
      .filter(message => message.message !== getChatMessages(message.message_id)[0]?.message);
    if (edits.length) await setChatMessages(edits, { refresh: 'affected' });
    try {
      await updateWeChat(current => deleteWeChatFromFloor(current, conversation, floorId));
    } catch (error) {
      if (edits.length)
        await setChatMessages(
          originals.map(({ message_id, message }) => ({ message_id, message })),
          { refresh: 'affected' },
        );
      throw error;
    }
    wechatLogError.value = '';
  }

  async function clearFailedWeChatLog() {
    const id = failedWeChatMessageId.value;
    const index = failedWeChatLogIndex.value;
    if (id === null || index === null) throw new Error('尚未定位到可清除的微信日志。');
    const message = getChatMessages(id)[0];
    if (!message || message.role !== 'assistant') throw new Error('出错的正文楼层已不存在。');
    let tagIndex = 0;
    const cleaned = message.message.replace(/<WeChatLog>\s*[\s\S]*?\s*<\/WeChatLog>/g, tag =>
      tagIndex++ === index ? '' : tag,
    );
    if (cleaned === message.message) throw new Error('出错的微信日志已不存在。');
    await setChatMessages([{ message_id: id, message: cleaned }], { refresh: 'affected' });
    failedWeChatMessageId.value = null;
    failedWeChatLogIndex.value = null;
    wechatLogError.value = '';
  }

  async function retryWeChatSend() {
    const pending = statData.value?.手机?.微信?.准备发送;
    if (!pending) throw new Error('没有待生成的微信消息。');
    if (pending.已确认 === false) throw new Error('请先确认发送这批微信消息。');
    await eventEmit('Chat_On_WeChat');
  }

  async function requestWeChatFriend(id: string, message: string) {
    await updateWeChat((current, data) => {
      if (!data.世界?.时间) throw new Error('世界时间尚未设置，无法申请好友。');
      return sendFriendRequest(current, id, message, data.世界.时间);
    });
  }

  async function ensureNearbyAccount(id: string, name: string, avatar: string) {
    await updateWeChat((current, data) => {
      const character = data.角色.主要角色[id] || data.角色.次要角色[id];
      if (!character || id === 'user') throw new Error('附近的角色已不存在。');
      if (current.账号[id]) return current;
      const next = klona(current);
      next.账号[id] = { 昵称: name, 头像: avatar, 表情包: {}, 好友: [] };
      return next;
    });
  }

  async function respondWeChatFriend(id: string, accept: boolean) {
    await updateWeChat((current, data) => {
      if (!data.世界?.时间) throw new Error('世界时间尚未设置，无法处理好友申请。');
      return decideFriendRequest(current, id, accept, data.世界.时间);
    });
  }

  async function performWeChatOperation(event: OperationEvent) {
    await updateWeChat((current, data) => {
      if (current.准备发送) throw new Error('上一条微信仍在等待正文确认。');
      if (!data.世界?.时间) throw new Error('世界时间尚未设置。');
      return applyWeChatOperation(current, { ...event, 时间: data.世界.时间 });
    });
  }

  async function updateWeChatProfile(name: string, image: string) {
    await updateWeChat(current => {
      const next = klona(current);
      if (!next.账号.user) throw new Error('微信 user 账号不存在。');
      if (!name.trim()) throw new Error('名字不能为空。');
      next.账号.user.昵称 = name.trim();
      next.账号.user.头像 = image;
      return next;
    });
  }

  async function createWeChatGroup(name: string, members: string[]) {
    const key = `群聊:${crypto.randomUUID()}`;
    await updateWeChat((current, data) => {
      if (current.准备发送) throw new Error('上一条微信仍在等待正文确认。');
      if (!data.世界?.时间) throw new Error('世界时间尚未设置。');
      if (!members.length || members.some(id => !current.账号.user.好友.includes(id)))
        throw new Error('请选择至少一位好友加入群聊。');
      let next = applyWeChatOperation(current, {
        类型: '操作',
        操作: '创建群聊',
        会话: key,
        操作者: 'user',
        名称: name,
        时间: data.世界.时间,
      });
      for (const id of members)
        next = applyWeChatOperation(next, {
          类型: '操作',
          操作: '邀请进群',
          会话: key,
          操作者: 'user',
          目标: id,
          时间: data.世界.时间,
        });
      return next;
    });
    return key;
  }

  async function addWeChatSticker(name: string, source: string) {
    await updateWeChat(
      current => addSticker(current, name, source),
      async data => {
        const scope = { type: 'script' as const, script_id: getScriptId() };
        await updateVariablesWith(
          variables => ({
            ...variables,
            magicGirlWeChatStickerSnapshot: mergeStickerSnapshot(
              data.手机.微信.账号.user.表情包,
              variables.magicGirlWeChatStickerSnapshot,
            ).backup,
          }),
          scope,
        );
      },
    );
  }

  async function syncStickerSnapshot() {
    const generation = chatGeneration;
    await waitGlobalInitialized('Mvu');
    if (generation !== chatGeneration) return;
    const previous = Mvu.getMvuData({ type: 'message', message_id: -1 });
    const stickers = previous?.stat_data?.手机?.微信?.账号?.user?.表情包;
    if (!stickers) return;
    const scope = { type: 'script' as const, script_id: getScriptId() };
    const snapshot = getVariables(scope)?.magicGirlWeChatStickerSnapshot;
    const merged = mergeStickerSnapshot(stickers, snapshot);
    if (merged.backupNeeded) {
      await updateVariablesWith(variables => ({ ...variables, magicGirlWeChatStickerSnapshot: merged.backup }), scope);
    }
    if (generation !== chatGeneration) return;
    if (merged.restoreNeeded) {
      const data = klona(previous.stat_data) as stat_data;
      data.手机.微信.账号.user.表情包 = merged.stickers;
      await writeStatData(data, previous);
    }
  }

  function scheduleStickerSync() {
    if (stickerSyncQueued) return;
    stickerSyncQueued = true;
    void queueStatWork(syncStickerSnapshot)
      .catch(error => console.error('微信表情包备份同步失败', error))
      .finally(() => {
        stickerSyncQueued = false;
      });
  }

  async function processWeChatMessage(messageId: number, generation: number) {
    if (generation !== chatGeneration) return;
    const message = getChatMessages(messageId)[0];
    if (!message || message.role !== 'assistant' || !message.message.includes('<WeChatLog>')) return;
    const tags = [...message.message.matchAll(/<WeChatLog>\s*[\s\S]*?\s*<\/WeChatLog>/g)];
    const logs = tags.map((match, index) => {
      try {
        return parseWeChatLogs(match[0])[0];
      } catch (error) {
        failedWeChatLogIndex.value = index;
        throw error;
      }
    });
    if ([...message.message.matchAll(/<WeChatLog>/g)].length !== tags.length)
      throw new Error('正文中的 WeChatLog 标签未闭合，无法自动定位清理范围。');
    if (!logs.length) return;
    await waitGlobalInitialized('Mvu');
    if (generation !== chatGeneration) return;
    const previous = Mvu.getMvuData({ type: 'message', message_id: -1 });
    if (!previous?.stat_data?.手机?.微信) throw new Error('微信变量尚未初始化，正文增量仍待处理。');
    const current = normalizeWeChatIds(previous.stat_data.手机.微信);
    const validateLocations = (entries: typeof logs) => {
      for (const log of entries)
        for (const event of log.事件) {
          if (event.类型 !== '消息') continue;
          for (const item of event.内容) {
            if (typeof item !== 'string' || !item.startsWith('<位置')) continue;
            const key = parseLocationShare(item);
            if (!key || !findPhoneMapPath(previous.stat_data.地图 ?? {}, key))
              throw new Error('微信位置分享的 key 不存在于当前地图。');
          }
        }
    };
    for (let index = 0; index < logs.length; index++) {
      try {
        const prefix = logs.slice(0, index + 1);
        const pendingLogs = unappliedWeChatLogs(current, prefix);
        if (pendingLogs.length) {
          validateLocations(pendingLogs);
          applyWeChatLogs(current, pendingLogs);
        }
      } catch (error) {
        failedWeChatLogIndex.value = index;
        throw error;
      }
    }
    let remaining;
    try {
      remaining = unappliedWeChatLogs(current, logs);
    } catch (error) {
      throw new Error(`第 ${messageId} 楼的${error instanceof Error ? error.message : '微信日志处理失败'}`);
    }
    if (!remaining.length) {
      if (logs.some(log => logConfirmsPending(current, log))) {
        const data = klona(previous.stat_data) as stat_data;
        data.手机.微信.准备发送 = null;
        await writeStatData(data, previous);
      }
      return;
    }
    const data = klona(previous.stat_data) as stat_data;
    data.手机.微信 = applyWeChatLogs(current, remaining);
    settlePayments(data, current, data.手机.微信);
    if (generation !== chatGeneration) return;
    await writeStatData(data, previous);
    wechatLogError.value = '';
    failedWeChatLogIndex.value = null;
  }

  function scheduleWeChatLog(messageId?: number) {
    const generation = chatGeneration;
    failedWeChatLogIndex.value = null;
    void queueStatWork(async () => {
      const id = messageId ?? getLastMessageId();
      if (id >= 0) await processWeChatMessage(id, generation);
    }).catch(error => {
      failedWeChatMessageId.value = messageId ?? getLastMessageId();
      wechatLogError.value = error instanceof Error ? error.message : '微信正文增量处理失败';
      console.error('微信正文增量处理失败', error);
    });
  }

  function scheduleShopResult(kind: '技能' | '道具', messageId?: number) {
    const refreshing = kind === '技能' ? skillRefreshing : itemRefreshing;
    const refreshError = kind === '技能' ? skillRefreshError : itemRefreshError;
    const marker = kind === '技能' ? '<skillVariable' : '<shopVariable';
    const startMessageId = kind === '技能' ? skillRefreshStartMessageId : itemRefreshStartMessageId;
    if (!refreshing.value) return;
    const generation = chatGeneration;
    void queueStatWork(async () => {
      if (!refreshing.value) return;
      const id = messageId ?? getLastMessageId();
      if (id < 0 || generation !== chatGeneration) return;
      const message = getChatMessages(id)[0];
      if (!message || message.role !== 'assistant' || !message.message.includes(marker)) return;
      if (id <= startMessageId) return;
      await waitGlobalInitialized('Mvu');
      if (generation !== chatGeneration) return;
      const previous = Mvu.getMvuData({ type: 'message', message_id: -1 });
      if (!previous?.stat_data?.系统 || !previous.stat_data.角色?.user) throw new Error(`${kind}商店变量尚未初始化。`);
      const data = klona(previous.stat_data) as stat_data;
      if (kind === '技能') applySkillRefresh(data, message.message);
      else applyItemRefresh(data, message.message);
      if (generation !== chatGeneration || !refreshing.value) return;
      await writeStatData(data, previous);
      refreshing.value = false;
      refreshError.value = '';
    }).catch(error => {
      refreshing.value = false;
      refreshError.value = error instanceof Error ? error.message : `${kind}生成结果无效。`;
      console.error(`${kind}商店生成结果处理失败`, error);
    });
  }

  function onShopGenerationEnd(kind: '技能' | '道具', messageId?: number) {
    scheduleShopResult(kind, messageId);
    const refreshing = kind === '技能' ? skillRefreshing : itemRefreshing;
    const refreshError = kind === '技能' ? skillRefreshError : itemRefreshError;
    const marker = kind === '技能' ? '<skillVariable' : '<shopVariable';
    const startMessageId = kind === '技能' ? skillRefreshStartMessageId : itemRefreshStartMessageId;
    if (!refreshing.value) return;
    setTimeout(() => {
      if (!refreshing.value) return;
      const id = messageId ?? getLastMessageId();
      const message = id >= 0 ? getChatMessages(id)[0] : null;
      if (id <= startMessageId || !message?.message.includes(marker)) {
        refreshing.value = false;
        refreshError.value = `本次生成没有返回${kind}商店结果`;
      }
    }, 800);
  }

  function scheduleTaskResult(messageId?: number) {
    if (!taskRefreshing.value) return;
    const generation = chatGeneration;
    void queueStatWork(async () => {
      if (!taskRefreshing.value) return;
      const id = messageId ?? getLastMessageId();
      if (id < 0 || id <= taskRefreshStartMessageId || generation !== chatGeneration) return;
      const message = getChatMessages(id)[0];
      if (!message || message.role !== 'assistant' || !message.message.includes('<questVariable')) return;
      await waitGlobalInitialized('Mvu');
      if (generation !== chatGeneration || !taskRefreshing.value) return;
      const previous = Mvu.getMvuData({ type: 'message', message_id: -1 });
      if (!previous?.stat_data?.系统 || !previous.stat_data.任务候选) throw new Error('任务变量尚未初始化。');
      const data = klona(previous.stat_data) as stat_data;
      applyTaskRefresh(data, message.message);
      if (generation !== chatGeneration || !taskRefreshing.value) return;
      await writeStatData(data, previous);
      taskRefreshing.value = false;
      taskRefreshError.value = '';
    }).catch(error => {
      taskRefreshing.value = false;
      taskRefreshError.value = error instanceof Error ? error.message : '任务生成结果无效。';
      console.error('任务生成结果处理失败', error);
    });
  }

  function onTaskGenerationEnd(messageId?: number) {
    scheduleTaskResult(messageId);
    if (!taskRefreshing.value) return;
    setTimeout(() => {
      if (!taskRefreshing.value) return;
      const id = messageId ?? getLastMessageId();
      const message = id >= 0 ? getChatMessages(id)[0] : null;
      if (id <= taskRefreshStartMessageId || !message?.message.includes('<questVariable')) {
        taskRefreshing.value = false;
        taskRefreshError.value = '本次生成没有返回任务结果';
      }
    }, 800);
  }

  async function checkWorldbook() {
    const generation = ++chatGeneration;
    try {
      await waitGlobalInitialized('Mvu');
      if (generation !== chatGeneration) return;
      const { primary } = getCharWorldbookNames('current');
      if (!primary) throw new Error('当前角色没有绑定主世界书。');
      const entries = await getWorldbook(primary);
      if (generation !== chatGeneration) return;
      const previous = Mvu.getMvuData({ type: 'message', message_id: -1 });
      if (!previous) throw new Error('当前楼层尚无 MVU 数据。');
      const current = previous.stat_data;
      const { data, changed } = reconcileWorldbookStatData(current, entries);
      if (!changed) return;
      const next = { ...previous, stat_data: data };
      // 检查后立即向当前楼层发起写入，避免聊天切换期间提交过期数据。
      if (generation !== chatGeneration) return;
      await Mvu.replaceMvuData(next, { type: 'message', message_id: getLastMessageId() });
      await eventEmit('mag_variable_update_ended', next, previous);
      refresh();
    } catch (error) {
      if (generation === chatGeneration) console.error('魔法少女世界书变量初始化失败', error);
    }
  }

  function refresh() {
    try {
      const previousWechat = statData.value?.手机?.微信 ?? null;
      const data = getVariables({ type: 'message', message_id: -1 })?.stat_data;
      statData.value = data && typeof data === 'object' ? (data as stat_data) : null;
      if (statData.value?.手机?.微信)
        statData.value = {
          ...statData.value,
          手机: { ...statData.value.手机, 微信: normalizeWeChatIds(statData.value.手机.微信) },
        };
      if (statData.value?.手机?.微信) syncWeChatNotifications(previousWechat, statData.value.手机.微信);
      if (statData.value?.手机?.微信?.账号?.user?.表情包) scheduleStickerSync();
      if (statData.value && pollingTimer) {
        clearInterval(pollingTimer);
        pollingTimer = undefined;
      }
      return statData.value !== null;
    } catch (error) {
      console.error('魔法少女变量读取失败', error);
      statData.value = null;
      return false;
    }
  }

  function scheduleRefresh() {
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      refreshTimer = undefined;
      refresh();
    }, 800);
  }

  function resetForChat() {
    chatGeneration++;
    statData.value = null;
    readChatId = null;
    readCursors = {};
    activeWeChatConversation = null;
    unreadChatKeys.value = [];
    wechatNotification.value = null;
    wechatLogError.value = '';
    skillRefreshError.value = '';
    skillRefreshing.value = false;
    skillRefreshStartMessageId = -1;
    itemRefreshError.value = '';
    itemRefreshing.value = false;
    itemRefreshStartMessageId = -1;
    taskRefreshError.value = '';
    taskRefreshing.value = false;
    taskRefreshStartMessageId = -1;
    failedWeChatMessageId.value = null;
    failedWeChatLogIndex.value = null;
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = undefined;
    scheduleRefresh();
    startPolling();
    scheduleWeChatLog();
  }

  function startPolling() {
    if (statData.value || pollingTimer) return;
    pollingTimer = setInterval(() => refresh(), 1000);
  }

  function initialize() {
    refresh();
    startPolling();
    eventOn('mag_variable_update_ended', scheduleRefresh);
    eventOn(KatEvents.kat_mvu_update_finished, scheduleRefresh);
    eventOn(tavern_events.MESSAGE_DELETED, scheduleRefresh);
    eventOn(tavern_events.CHAT_CHANGED, resetForChat);
    eventOn(tavern_events.GENERATION_ENDED, scheduleWeChatLog);
    eventOn(tavern_events.GENERATION_ENDED, (id?: number) => {
      onShopGenerationEnd('技能', id);
      onShopGenerationEnd('道具', id);
      onTaskGenerationEnd(id);
    });
    eventOn(tavern_events.GENERATION_STOPPED, (id?: number) => {
      onShopGenerationEnd('技能', id);
      onShopGenerationEnd('道具', id);
      onTaskGenerationEnd(id);
    });
    eventOn(tavern_events.MESSAGE_RECEIVED, scheduleWeChatLog);
    eventOn(tavern_events.MESSAGE_RECEIVED, (id?: number) => {
      scheduleShopResult('技能', id);
      scheduleShopResult('道具', id);
      scheduleTaskResult(id);
    });
    eventOn(tavern_events.MESSAGE_UPDATED, scheduleWeChatLog);
    eventOn(tavern_events.MESSAGE_UPDATED, (id?: number) => {
      scheduleShopResult('技能', id);
      scheduleShopResult('道具', id);
      scheduleTaskResult(id);
    });
    eventOn(KatEvents.kat_mvu_update_finished, scheduleWeChatLog);
    eventOn('mag_variable_update_ended', () => scheduleWeChatLog());
    scheduleWeChatLog();
    return () => {
      chatGeneration++;
      if (pollingTimer) clearInterval(pollingTimer);
      if (refreshTimer) clearTimeout(refreshTimer);
      pollingTimer = undefined;
      refreshTimer = undefined;
    };
  }

  async function replace(data: stat_data) {
    await MvuUtil.updateMvuDataByObj(data);
    refresh();
  }

  async function update(diff: object) {
    await MvuUtil.updateMvuDataByDiff(diff);
    refresh();
  }

  return {
    statData,
    unreadChatKeys,
    wechatNotification,
    markWeChatRead,
    setActiveWeChatConversation,
    dismissWeChatNotification,
    wechatLogError,
    skillRefreshError,
    skillRefreshing,
    itemRefreshError,
    itemRefreshing,
    taskRefreshError,
    taskRefreshing,
    failedWeChatMessageId,
    clearFailedWeChatLog,
    deleteWeChatFloor,
    createWeChatGroup,
    refresh,
    initialize,
    checkWorldbook,
    replace,
    update,
    saveProfileBaseInfo,
    changeRuntimeMinorRole,
    unlockCharacterInfo,
    transferInventory,
    refreshSkillShop,
    cancelSkillRefresh,
    purchaseSkill,
    sellOwnedSkill,
    refreshItemShop,
    cancelItemRefresh,
    purchaseItem,
    sellOwnedItem,
    refreshTaskBoard,
    cancelTaskRefresh,
    acceptTask,
    abandonTask,
    claimTask,
    sendWeChatMessage,
    confirmWeChatSend,
    discardWeChatDraft,
    retryWeChatSend,
    requestWeChatFriend,
    ensureNearbyAccount,
    respondWeChatFriend,
    performWeChatOperation,
    updateWeChatProfile,
    addWeChatSticker,
  };
});
