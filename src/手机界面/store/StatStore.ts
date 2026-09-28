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
  normalizeWeChatIds,
  parseWeChatLogs,
  privateChatKey,
  sendFriendRequest,
  unappliedWeChatLogs,
} from '../apps/wechat/wechatData';
import {
  addWechatAccount,
  applyNewChatMediaSnapshot,
  mediaSnapshot,
  restoreMissingStickers,
  saveWechatAccount,
  type AccountMediaSnapshot,
} from '../apps/wechat/accountManagement';
import {
  hasWechatImage,
  isImageDataUrl,
  refreshWechatImageLibrary,
  storeWechatImage,
  WECHAT_MEDIA_SNAPSHOT_KEY,
} from '../apps/wechat/imageLibrary';
import type { OperationEvent } from '../apps/wechat/wechatData';
import { parseLocationShare } from '../apps/map/locationShare';
import { findPhoneMapPath } from '../apps/map/phoneMap';
import {
  InvalidGeneratedResultError,
  isNewGenerationResult,
  latestGeneratedTag,
  removeGeneratedTag,
} from '../apps/generationResult';
import { applyCharacterUnlock, type CharacterKind } from '../apps/data/profileUnlock';
import { applyProfileEdit, type ProfileField } from '../apps/data/profileEdit';
import { assignFirstTarget, firstTargetSystemLog } from '../apps/data/firstTarget';
import { applyInventoryTransfers, type InventorySide, type InventoryTransfer } from '../apps/data/inventoryTransfer';
import {
  initialReadCursors,
  latestNotifiableMessage,
  reconcileReadCursors,
  unreadConversationKeys,
  type ReadCursors,
} from '../apps/wechat/wechatNotifications';
import { reconcileWorldbookStatData } from './worldbookInit';
import { settleCharacterStages } from './stageProgression';
import { settleUserRating } from './userRating';
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

const generationResultWaitMs = 5000;

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

function escapeSystemLogText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function phoneSystemLog(detail: string): string {
  return `\n<systemLog>\n<user>${detail}\n</systemLog>\n`;
}

export const useMagicGirlStatStore = defineStore('magic-girl-stat', () => {
  const statData = ref<stat_data | null>(null);
  const initializationNoticePending = ref(false);
  const wechatLogError = ref('');
  const skillRefreshError = ref('');
  const skillRefreshing = ref(false);
  let skillRefreshStartMessageId = -1;
  let skillRefreshStartMessage = '';
  const itemRefreshError = ref('');
  const itemRefreshing = ref(false);
  let itemRefreshStartMessageId = -1;
  let itemRefreshStartMessage = '';
  const taskRefreshError = ref('');
  const taskRefreshing = ref(false);
  let taskRefreshStartMessageId = -1;
  let taskRefreshStartMessage = '';
  let refreshRequestSerial = 0;
  const failedGeneratedResult = ref<{ kind: '任务' | '技能' | '道具'; messageId: number; tag: string } | null>(null);
  const unreadChatKeys = ref<string[]>([]);
  const wechatNotification = ref<{ key: string; message: 微信消息 } | null>(null);
  const failedWeChatMessageId = ref<number | null>(null);
  const failedWeChatLogIndex = ref<number | null>(null);
  let pollingTimer: ReturnType<typeof setInterval> | undefined;
  let refreshTimer: ReturnType<typeof setTimeout> | undefined;
  let worldbookRetryTimer: ReturnType<typeof setTimeout> | undefined;
  let chatGeneration = 0;
  let worldbookCheckGeneration = 0;
  let worldbookReady = false;
  let phoneOpen = false;
  let statWriteQueue = Promise.resolve();
  let stageSettlementQueued = false;
  let stageSettlementRequested = false;
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
    let visiblePrevious = previous;
    const chatId = SillyTavern.getCurrentChatId();
    if (readChatId !== chatId) {
      readChatId = chatId;
      visiblePrevious = null;
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
    if (wechatNotification.value && !current.会话[wechatNotification.value.key]) wechatNotification.value = null;
    let appearance: Record<string, { muted?: boolean }> = {};
    try {
      appearance = getVariables({ type: 'script', script_id: getScriptId() })?.magicGirlWeChatAppearance || {};
    } catch (error) {
      console.error('微信会话外观读取失败', error);
    }
    const latest = latestNotifiableMessage(visiblePrevious, current, activeWeChatConversation, appearance);
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

  async function writeLoggedStatData(data: stat_data, previous: Mvu.MvuData, detail: string, generation: number) {
    const messageId = getLastMessageId();
    const message = getChatMessages(messageId)[0];
    if (!message) throw new Error('当前楼层尚未准备好，无法记录操作。');
    const originalText = message.message;
    if (generation !== chatGeneration || messageId !== getLastMessageId())
      throw new Error('聊天或楼层已切换，操作已取消。');
    await setChatMessages([{ message_id: messageId, message: originalText + phoneSystemLog(detail) }], {
      refresh: 'none',
    });
    const next = { ...previous, stat_data: data };
    try {
      if (generation !== chatGeneration || messageId !== getLastMessageId())
        throw new Error('聊天或楼层已切换，操作已取消。');
      await Mvu.replaceMvuData(next, { type: 'message', message_id: messageId });
    } catch (error) {
      try {
        await setChatMessages([{ message_id: messageId, message: originalText }], { refresh: 'none' });
      } catch (rollbackError) {
        throw new AggregateError([error, rollbackError], '操作写入失败，正文记录回滚也失败，请检查当前楼层。');
      }
      throw error;
    }
    try {
      await eventEmit('mag_variable_update_ended', next, previous);
    } catch (error) {
      console.error('操作已保存，但变量更新通知失败', error);
    } finally {
      refresh();
    }
  }

  function scheduleStageSettlement() {
    if (stageSettlementQueued) {
      stageSettlementRequested = true;
      return;
    }
    stageSettlementQueued = true;
    stageSettlementRequested = false;
    const generation = chatGeneration;
    void queueStatWork(async () => {
      await waitGlobalInitialized('Mvu');
      if (generation !== chatGeneration) return;
      const previous = Mvu.getMvuData({ type: 'message', message_id: -1 });
      if (!previous?.stat_data?.角色) return;
      const data = klona(previous.stat_data) as stat_data;
      const stagesChanged = settleCharacterStages(data);
      const ratingChanged = settleUserRating(data);
      if (!stagesChanged && !ratingChanged) return;
      if (generation !== chatGeneration) return;
      await writeStatData(data, previous);
    })
      .catch(error => console.error('人设阶段经验结算失败', error))
      .finally(() => {
        stageSettlementQueued = false;
        if (stageSettlementRequested) scheduleStageSettlement();
      });
  }

  async function updateWeChat(
    updater: (current: 微信数据, data: stat_data) => 微信数据,
    beforeWrite?: (data: stat_data) => Promise<void>,
    afterWrite?: (data: stat_data) => void,
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
      afterWrite?.(data);
      return after;
    });
  }

  async function changeCharacterData<T>(
    change: (data: stat_data) => T,
    log?: (before: stat_data, after: stat_data, result: T) => string,
  ): Promise<T> {
    const generation = chatGeneration;
    return queueStatWork(async () => {
      await waitGlobalInitialized('Mvu');
      if (generation !== chatGeneration) throw new Error('聊天已切换，操作已取消。');
      const previous = Mvu.getMvuData({ type: 'message', message_id: -1 });
      if (!previous?.stat_data?.角色?.user) throw new Error('角色变量尚未初始化。');
      const data = klona(previous.stat_data) as stat_data;
      const result = change(data);
      if (generation !== chatGeneration) throw new Error('聊天已切换，操作已取消。');
      if (log)
        await writeLoggedStatData(data, previous, log(previous.stat_data as stat_data, data, result), generation);
      else await writeStatData(data, previous);
      return result;
    });
  }

  async function saveProfileField(field: ProfileField, value: string) {
    await changeCharacterData(data => {
      applyProfileEdit(data, field, value);
    });
  }

  async function changeRuntimeMinorRole(key: string, original: 次要角色人设, next: 次要角色人设 | null) {
    await changeCharacterData(data => applyRuntimeMinorChange(data, key, original, next));
  }

  async function unlockCharacterInfo(kind: CharacterKind, key: string, field: string): Promise<boolean> {
    return changeCharacterData(data => applyCharacterUnlock(data, kind, key, field));
  }

  async function chooseFirstTarget(key: string): Promise<void> {
    const generation = chatGeneration;
    await queueStatWork(async () => {
      await waitGlobalInitialized('Mvu');
      if (generation !== chatGeneration) throw new Error('聊天已切换，目标选择已取消。');
      const messageId = getLastMessageId();
      const message = getChatMessages(messageId)[0];
      const previous = Mvu.getMvuData({ type: 'message', message_id: -1 });
      if (!message || !previous?.stat_data?.角色?.user) throw new Error('当前楼层尚未准备好，无法选择目标。');
      const data = klona(previous.stat_data) as stat_data;
      assignFirstTarget(data, key);
      const originalText = message.message;
      if (generation !== chatGeneration || messageId !== getLastMessageId())
        throw new Error('聊天或楼层已切换，目标选择已取消。');
      await setChatMessages([{ message_id: messageId, message: originalText + firstTargetSystemLog(key) }], {
        refresh: 'none',
      });
      const next = { ...previous, stat_data: data };
      try {
        if (generation !== chatGeneration || messageId !== getLastMessageId())
          throw new Error('聊天或楼层已切换，目标选择已取消。');
        await Mvu.replaceMvuData(next, { type: 'message', message_id: messageId });
      } catch (error) {
        try {
          await setChatMessages([{ message_id: messageId, message: originalText }], { refresh: 'none' });
        } catch (rollbackError) {
          throw new AggregateError([error, rollbackError], '目标选择失败，正文记录回滚也失败，请检查当前楼层。');
        }
        throw error;
      }
      try {
        await eventEmit('mag_variable_update_ended', next, previous);
      } catch (error) {
        console.error('首次目标变量通知失败', error);
      } finally {
        refresh();
      }
    });
  }

  async function transferInventory(transfers: InventoryTransfer[]): Promise<void> {
    if (!transfers.length) return;
    await changeCharacterData(
      data => applyInventoryTransfers(data, transfers),
      () =>
        `调整了随身物品与仓库：${transfers
          .map(
            ({ from, name, quantity }) =>
              `${from === '仓库' ? '从仓库取出' : '存入仓库'}${escapeSystemLogText(name)}×${quantity}`,
          )
          .join('；')}。`,
    );
  }

  async function refreshGeneratedShop(kind: '技能' | '道具') {
    if (failedGeneratedResult.value) throw new Error('请先清除本楼失败的生成结果。');
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
    const startMessageId = getLastMessageId();
    const startMessage = startMessageId >= 0 ? (getChatMessages(startMessageId)[0]?.message ?? '') : '';
    refreshError.value = '';
    refreshing.value = true;
    refreshRequestSerial++;
    if (kind === '技能') {
      skillRefreshStartMessageId = startMessageId;
      skillRefreshStartMessage = startMessage;
    } else {
      itemRefreshStartMessageId = startMessageId;
      itemRefreshStartMessage = startMessage;
    }
    console.info(`[手机${kind}商店生成] 已触发`, { startMessageId, startLength: startMessage.length });
    try {
      await eventEmit(kind === '技能' ? 'Chat_On_SkillShop' : 'Chat_On_ItemShop');
      console.info(`[手机${kind}商店生成] 事件已返回`, { lastMessageId: getLastMessageId() });
    } catch (error) {
      refreshing.value = false;
      refreshRequestSerial++;
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
    refreshRequestSerial++;
    skillRefreshError.value = '已取消等待；迟到的技能生成结果不会结算。';
  }

  function cancelItemRefresh() {
    if (!itemRefreshing.value) return;
    itemRefreshing.value = false;
    refreshRequestSerial++;
    itemRefreshError.value = '已取消等待；迟到的道具生成结果不会结算。';
  }

  async function purchaseSkill(name: string) {
    await changeCharacterData(
      data => applySkillPurchase(data, name),
      (before, after) =>
        `在组织技能商店${before.角色.user.技能[name] ? '升级' : '购买'}技能「${escapeSystemLogText(name)}」，消耗${before.角色.user.恶堕积分 - after.角色.user.恶堕积分}点恶堕积分。`,
    );
  }

  async function sellOwnedSkill(name: string): Promise<number> {
    return changeCharacterData(
      data => applySkillSale(data, name),
      (_before, _after, refund) => `在组织技能商店出售技能「${escapeSystemLogText(name)}」，获得${refund}点恶堕积分。`,
    );
  }

  async function purchaseItem(name: string, quantity: number) {
    await changeCharacterData(
      data => applyItemPurchase(data, name, quantity),
      (before, after) =>
        `在组织道具商店购买「${escapeSystemLogText(name)}」×${quantity}，消耗${before.角色.user.恶堕积分 - after.角色.user.恶堕积分}点恶堕积分。`,
    );
  }

  async function sellOwnedItem(side: InventorySide, name: string, quantity: number): Promise<number> {
    return changeCharacterData(
      data => applyItemSale(data, side, name, quantity),
      (_before, _after, refund) =>
        `从${side}出售「${escapeSystemLogText(name)}」×${quantity}，获得${refund}点恶堕积分。`,
    );
  }

  async function acceptTask(name: string) {
    await changeCharacterData(
      data => applyTaskAccept(data, name),
      () => `接取组织任务「${escapeSystemLogText(name)}」。`,
    );
  }

  async function abandonTask(name: string) {
    await changeCharacterData(
      data => applyTaskAbandon(data, name),
      () => `放弃组织任务「${escapeSystemLogText(name)}」。`,
    );
  }

  async function claimTask(name: string): Promise<number> {
    return changeCharacterData(
      data => applyTaskClaim(data, name),
      (_before, _after, reward) => `领取组织任务「${escapeSystemLogText(name)}」的奖励，获得${reward}点恶堕积分。`,
    );
  }

  async function refreshTaskBoard() {
    if (failedGeneratedResult.value) throw new Error('请先清除本楼失败的生成结果。');
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
    const startMessageId = getLastMessageId();
    const startMessage = startMessageId >= 0 ? (getChatMessages(startMessageId)[0]?.message ?? '') : '';
    taskRefreshError.value = '';
    taskRefreshing.value = true;
    refreshRequestSerial++;
    taskRefreshStartMessageId = startMessageId;
    taskRefreshStartMessage = startMessage;
    console.info('[手机任务生成] 已触发', {
      startMessageId: taskRefreshStartMessageId,
      startLength: taskRefreshStartMessage.length,
    });
    try {
      await eventEmit('Chat_On_Quest');
      console.info('[手机任务生成] 事件已返回', { lastMessageId: getLastMessageId() });
    } catch (error) {
      taskRefreshing.value = false;
      refreshRequestSerial++;
      taskRefreshError.value = error instanceof Error ? error.message : '任务刷新事件触发失败。';
      throw error;
    }
  }

  function cancelTaskRefresh() {
    if (!taskRefreshing.value) return;
    taskRefreshing.value = false;
    refreshRequestSerial++;
    taskRefreshError.value = '已取消等待；迟到的任务生成结果不会结算。';
  }

  async function clearFailedGeneratedResult(kind: '任务' | '技能' | '道具', preserveError = false) {
    const failed = failedGeneratedResult.value;
    if (!failed || failed.kind !== kind) throw new Error('没有可清除的生成结果。');
    const generation = chatGeneration;
    await queueStatWork(async () => {
      const message = getChatMessages(failed.messageId)[0];
      if (generation !== chatGeneration || !message || message.role !== 'assistant')
        throw new Error('聊天或出错楼层已切换，无法清除生成结果。');
      await setChatMessages(
        [{ message_id: failed.messageId, message: removeGeneratedTag(message.message, failed.tag) }],
        { refresh: 'affected' },
      );
      if (failedGeneratedResult.value === failed) failedGeneratedResult.value = null;
      if (!preserveError) {
        if (kind === '任务') taskRefreshError.value = '';
        else if (kind === '技能') skillRefreshError.value = '';
        else itemRefreshError.value = '';
      }
    });
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

  async function ensureWeChatAccount(id: string, name: string, avatar: string) {
    await updateWeChat((current, data) => {
      const character = data.角色.主要角色[id] || data.角色.次要角色[id];
      if (!character || id === 'user') throw new Error('角色已不存在，无法创建微信账号。');
      return addWechatAccount(current, id, name, avatar);
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
    const current = statData.value?.手机?.微信;
    if (!current?.账号.user) throw new Error('微信 user 账号不存在。');
    await updateWeChatAccount('user', name, image, current.账号.user.表情包, current.账号.user.好友);
  }

  async function updateWeChatAccount(
    id: string,
    name: string,
    image: string,
    stickers: Record<string, string>,
    friends: string[],
  ) {
    const avatarUrl = isImageDataUrl(image) ? storeWechatImage(image) : image;
    const stickerUrls = Object.fromEntries(
      Object.entries(stickers).map(([name, url]) => [name, isImageDataUrl(url) ? storeWechatImage(url) : url]),
    );
    if ((avatarUrl && !hasWechatImage(avatarUrl)) || Object.values(stickerUrls).some(url => !hasWechatImage(url)))
      throw new Error('图片库中缺少所选图片。');
    await updateWeChat(
      current => saveWechatAccount(current, id, name, avatarUrl, stickerUrls, friends),
      undefined,
      data => {
        updateVariablesWith(
          variables => ({ ...variables, [WECHAT_MEDIA_SNAPSHOT_KEY]: mediaSnapshot(data.手机.微信.账号) }),
          {
            type: 'script',
            script_id: getScriptId(),
          },
        );
      },
    );
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
    const url = isImageDataUrl(source) ? storeWechatImage(source) : source;
    if (!hasWechatImage(url)) throw new Error('图片库中缺少所选图片。');
    await updateWeChat(
      current => addSticker(current, name, url),
      undefined,
      data => {
        updateVariablesWith(
          variables => ({ ...variables, [WECHAT_MEDIA_SNAPSHOT_KEY]: mediaSnapshot(data.手机.微信.账号) }),
          {
            type: 'script',
            script_id: getScriptId(),
          },
        );
      },
    );
  }

  async function syncStickerSnapshot() {
    const generation = chatGeneration;
    await waitGlobalInitialized('Mvu');
    if (generation !== chatGeneration) return;
    const previous = Mvu.getMvuData({ type: 'message', message_id: -1 });
    const accounts = previous?.stat_data?.手机?.微信?.账号;
    if (!accounts) return;
    const scope = { type: 'script' as const, script_id: getScriptId() };
    refreshWechatImageLibrary();
    const variables = getVariables(scope);
    const legacy = variables?.magicGirlWeChatStickerSnapshot;
    const snapshot = variables?.[WECHAT_MEDIA_SNAPSHOT_KEY] as AccountMediaSnapshot | undefined;
    const data = klona(previous.stat_data) as stat_data;
    const nextAccounts = data.手机.微信.账号;
    let changed = false;
    if (legacy && typeof legacy === 'object' && !Array.isArray(legacy)) {
      for (const [name, source] of Object.entries(legacy)) {
        if (!nextAccounts.user?.表情包[name] && isImageDataUrl(source)) {
          nextAccounts.user.表情包[name] = source;
          changed = true;
        }
      }
    }
    if (snapshot && typeof snapshot === 'object') changed = restoreMissingStickers(nextAccounts, snapshot) || changed;
    for (const account of Object.values(nextAccounts)) {
      if (isImageDataUrl(account.头像)) {
        account.头像 = storeWechatImage(account.头像);
        changed = true;
      }
      for (const [name, url] of Object.entries(account.表情包)) {
        if (isImageDataUrl(url)) {
          account.表情包[name] = storeWechatImage(url);
          changed = true;
        }
      }
    }
    if (generation !== chatGeneration) return;
    if (changed) await writeStatData(data, previous);
    if (changed || legacy || !snapshot)
      updateVariablesWith(current => {
        const { magicGirlWeChatStickerSnapshot: _legacy, ...rest } = current;
        return { ...rest, [WECHAT_MEDIA_SNAPSHOT_KEY]: mediaSnapshot(nextAccounts) };
      }, scope);
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

  function scheduleShopResult(kind: '技能' | '道具', messageId?: number, source = '消息事件') {
    const refreshing = kind === '技能' ? skillRefreshing : itemRefreshing;
    const refreshError = kind === '技能' ? skillRefreshError : itemRefreshError;
    const marker = kind === '技能' ? '<skillVariable' : '<shopVariable';
    const startMessageId = kind === '技能' ? skillRefreshStartMessageId : itemRefreshStartMessageId;
    const startMessage = kind === '技能' ? skillRefreshStartMessage : itemRefreshStartMessage;
    if (!refreshing.value) return;
    const generation = chatGeneration;
    const requestSerial = refreshRequestSerial;
    let failedMessageId = -1;
    let failedTag: string | undefined;
    console.info(`[手机${kind}商店生成] 收到${source}`, { messageId, lastMessageId: getLastMessageId() });
    void queueStatWork(async () => {
      if (!refreshing.value || requestSerial !== refreshRequestSerial) {
        console.info(`[手机${kind}商店生成] 已取消或已结算，跳过${source}`);
        return;
      }
      const id = messageId ?? getLastMessageId();
      if (id < 0 || generation !== chatGeneration) return;
      const message = getChatMessages(id)[0];
      const matched = isNewGenerationResult(message, marker, startMessageId, startMessage);
      console.info(`[手机${kind}商店生成] 检查原始楼层`, {
        source,
        id,
        startMessageId,
        role: message?.role,
        length: message?.message.length ?? 0,
        hasTag: message?.message.includes(marker) ?? false,
        matched,
      });
      if (!matched) return;
      failedMessageId = id;
      failedTag = latestGeneratedTag(message.message, marker);
      await waitGlobalInitialized('Mvu');
      if (generation !== chatGeneration || requestSerial !== refreshRequestSerial) return;
      const previous = Mvu.getMvuData({ type: 'message', message_id: -1 });
      if (!previous?.stat_data?.系统 || !previous.stat_data.角色?.user) throw new Error(`${kind}商店变量尚未初始化。`);
      const data = klona(previous.stat_data) as stat_data;
      if (kind === '技能') applySkillRefresh(data, message.message);
      else applyItemRefresh(data, message.message);
      console.info(`[手机${kind}商店生成] 结果校验通过`, { id });
      if (generation !== chatGeneration || requestSerial !== refreshRequestSerial || !refreshing.value) return;
      await writeStatData(data, previous);
      refreshing.value = false;
      refreshError.value = '';
      console.info(`[手机${kind}商店生成] 变量写入成功`, { id });
    }).catch(async error => {
      if (requestSerial !== refreshRequestSerial || generation !== chatGeneration) return;
      refreshing.value = false;
      const detail = error instanceof Error ? error.message : `${kind}生成结果无效。`;
      refreshError.value = detail;
      if (failedTag) {
        failedGeneratedResult.value = { kind, messageId: failedMessageId, tag: failedTag };
        if (error instanceof InvalidGeneratedResultError) {
          try {
            await clearFailedGeneratedResult(kind, true);
            refreshError.value = `${detail}；失败标签已从本楼自动清除。`;
          } catch (cleanupError) {
            refreshError.value = `${detail}；自动清除失败，可手动清除。`;
            console.error(`${kind}商店失败标签自动清除失败`, cleanupError);
          }
        }
      }
      console.error(`${kind}商店生成结果处理失败`, error);
    });
  }

  function onShopGenerationEnd(kind: '技能' | '道具', messageId?: number, eventName = 'GENERATION_ENDED') {
    scheduleShopResult(kind, messageId, eventName);
    const refreshing = kind === '技能' ? skillRefreshing : itemRefreshing;
    const refreshError = kind === '技能' ? skillRefreshError : itemRefreshError;
    const marker = kind === '技能' ? '<skillVariable' : '<shopVariable';
    const startMessageId = kind === '技能' ? skillRefreshStartMessageId : itemRefreshStartMessageId;
    const startMessage = kind === '技能' ? skillRefreshStartMessage : itemRefreshStartMessage;
    if (!refreshing.value) return;
    const requestSerial = refreshRequestSerial;
    setTimeout(() => {
      if (!refreshing.value || requestSerial !== refreshRequestSerial) return;
      const id = messageId ?? getLastMessageId();
      const message = id >= 0 ? getChatMessages(id)[0] : null;
      const observation = {
        role: message?.role,
        length: message?.message.length ?? 0,
        hasTag: message?.message.includes(marker) ?? false,
      };
      if (!isNewGenerationResult(message, marker, startMessageId, startMessage)) {
        console.warn(`[手机${kind}商店生成] 结束后未找到本次结果`, {
          id,
          startMessageId,
          ...observation,
        });
        refreshing.value = false;
        refreshError.value = `本次生成没有返回${kind}商店结果`;
      } else {
        scheduleShopResult(kind, id, '生成结束复查');
      }
    }, generationResultWaitMs);
  }

  function scheduleTaskResult(messageId?: number, source = '消息事件') {
    if (!taskRefreshing.value) return;
    const generation = chatGeneration;
    const requestSerial = refreshRequestSerial;
    let failedMessageId = -1;
    let failedTag: string | undefined;
    console.info('[手机任务生成] 收到' + source, { messageId, lastMessageId: getLastMessageId() });
    void queueStatWork(async () => {
      if (!taskRefreshing.value || requestSerial !== refreshRequestSerial) {
        console.info('[手机任务生成] 已取消或已结算，跳过' + source);
        return;
      }
      const id = messageId ?? getLastMessageId();
      if (id < 0 || generation !== chatGeneration) return;
      const message = getChatMessages(id)[0];
      const matched = isNewGenerationResult(
        message,
        '<questVariable',
        taskRefreshStartMessageId,
        taskRefreshStartMessage,
      );
      console.info('[手机任务生成] 检查原始楼层', {
        source,
        id,
        startMessageId: taskRefreshStartMessageId,
        role: message?.role,
        length: message?.message.length ?? 0,
        hasTag: message?.message.includes('<questVariable') ?? false,
        matched,
      });
      if (!matched) return;
      failedMessageId = id;
      failedTag = latestGeneratedTag(message.message, '<questVariable');
      await waitGlobalInitialized('Mvu');
      if (generation !== chatGeneration || requestSerial !== refreshRequestSerial || !taskRefreshing.value) return;
      const previous = Mvu.getMvuData({ type: 'message', message_id: -1 });
      if (!previous?.stat_data?.系统 || !previous.stat_data.任务候选) throw new Error('任务变量尚未初始化。');
      const data = klona(previous.stat_data) as stat_data;
      applyTaskRefresh(data, message.message);
      console.info('[手机任务生成] 结果校验通过', { id });
      if (generation !== chatGeneration || requestSerial !== refreshRequestSerial || !taskRefreshing.value) return;
      await writeStatData(data, previous);
      taskRefreshing.value = false;
      taskRefreshError.value = '';
      console.info('[手机任务生成] 变量写入成功', { id });
    }).catch(async error => {
      if (requestSerial !== refreshRequestSerial || generation !== chatGeneration) return;
      taskRefreshing.value = false;
      const detail = error instanceof Error ? error.message : '任务生成结果无效。';
      taskRefreshError.value = detail;
      if (failedTag) {
        failedGeneratedResult.value = { kind: '任务', messageId: failedMessageId, tag: failedTag };
        if (error instanceof InvalidGeneratedResultError) {
          try {
            await clearFailedGeneratedResult('任务', true);
            taskRefreshError.value = `${detail}；失败标签已从本楼自动清除。`;
          } catch (cleanupError) {
            taskRefreshError.value = `${detail}；自动清除失败，可手动清除。`;
            console.error('任务失败标签自动清除失败', cleanupError);
          }
        }
      }
      console.error('任务生成结果处理失败', error);
    });
  }

  function onTaskGenerationEnd(messageId?: number, eventName = 'GENERATION_ENDED') {
    scheduleTaskResult(messageId, eventName);
    if (!taskRefreshing.value) return;
    const requestSerial = refreshRequestSerial;
    setTimeout(() => {
      if (!taskRefreshing.value || requestSerial !== refreshRequestSerial) return;
      const id = messageId ?? getLastMessageId();
      const message = id >= 0 ? getChatMessages(id)[0] : null;
      const observation = {
        role: message?.role,
        length: message?.message.length ?? 0,
        hasTag: message?.message.includes('<questVariable') ?? false,
      };
      if (!isNewGenerationResult(message, '<questVariable', taskRefreshStartMessageId, taskRefreshStartMessage)) {
        console.warn('[手机任务生成] 结束后未找到本次结果', {
          id,
          startMessageId: taskRefreshStartMessageId,
          ...observation,
        });
        taskRefreshing.value = false;
        taskRefreshError.value = '本次生成没有返回任务结果';
      } else {
        scheduleTaskResult(id, '生成结束复查');
      }
    }, generationResultWaitMs);
  }

  async function checkWorldbook() {
    if (worldbookReady) return;
    const checkGeneration = ++worldbookCheckGeneration;
    const generation = chatGeneration;
    const chatId = SillyTavern.getCurrentChatId();
    if (worldbookRetryTimer) clearTimeout(worldbookRetryTimer);
    worldbookRetryTimer = undefined;
    const isCurrent = () =>
      checkGeneration === worldbookCheckGeneration &&
      generation === chatGeneration &&
      chatId === SillyTavern.getCurrentChatId();
    const retryWhenReady = () => {
      if (!isCurrent()) return;
      worldbookRetryTimer = setTimeout(() => {
        worldbookRetryTimer = undefined;
        if (isCurrent()) void checkWorldbook();
      }, 1000);
    };
    try {
      await waitGlobalInitialized('Mvu');
      if (!isCurrent()) return;
      if (!Mvu.getMvuData({ type: 'message', message_id: -1 })?.stat_data) {
        retryWhenReady();
        return;
      }
      const { primary } = getCharWorldbookNames('current');
      if (!primary) throw new Error('当前角色没有绑定主世界书。');
      const entries = await getWorldbook(primary);
      if (!isCurrent()) return;
      const ready = await queueStatWork(async () => {
        if (!isCurrent()) return false;
        const messageId = getLastMessageId();
        const previous = Mvu.getMvuData({ type: 'message', message_id: -1 });
        if (!previous?.stat_data) {
          retryWhenReady();
          return false;
        }
        const { data, changed } = reconcileWorldbookStatData(previous.stat_data, entries);
        if (!changed) return true;
        applyNewChatMediaSnapshot(
          (data as unknown as stat_data).手机.微信.账号,
          getVariables({ type: 'script', script_id: getScriptId() })?.[WECHAT_MEDIA_SNAPSHOT_KEY],
          hasWechatImage,
        );
        if (!isCurrent() || messageId !== getLastMessageId()) {
          retryWhenReady();
          return false;
        }
        const next = { ...previous, stat_data: data };
        await Mvu.replaceMvuData(next, { type: 'message', message_id: messageId });
        if (!isCurrent()) return false;
        await eventEmit('mag_variable_update_ended', next, previous);
        refresh();
        return true;
      });
      if (!isCurrent() || !ready) return;
      worldbookReady = true;
      initializationNoticePending.value = !phoneOpen;
    } catch (error) {
      if (isCurrent()) console.error('魔法少女世界书变量初始化失败', error);
    } finally {
      if (isCurrent() && !worldbookReady && !worldbookRetryTimer) retryWhenReady();
    }
  }

  function setPhoneOpen(value: boolean) {
    phoneOpen = value;
    if (value) initializationNoticePending.value = false;
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
      if (statData.value?.角色) scheduleStageSettlement();
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
    refreshRequestSerial++;
    worldbookCheckGeneration++;
    worldbookReady = false;
    initializationNoticePending.value = false;
    if (worldbookRetryTimer) clearTimeout(worldbookRetryTimer);
    worldbookRetryTimer = undefined;
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
    skillRefreshStartMessage = '';
    itemRefreshError.value = '';
    itemRefreshing.value = false;
    itemRefreshStartMessageId = -1;
    itemRefreshStartMessage = '';
    taskRefreshError.value = '';
    taskRefreshing.value = false;
    taskRefreshStartMessageId = -1;
    taskRefreshStartMessage = '';
    failedGeneratedResult.value = null;
    failedWeChatMessageId.value = null;
    failedWeChatLogIndex.value = null;
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = undefined;
    scheduleRefresh();
    startPolling();
    scheduleWeChatLog();
    void checkWorldbook();
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
      onShopGenerationEnd('技能', id, 'GENERATION_STOPPED');
      onShopGenerationEnd('道具', id, 'GENERATION_STOPPED');
      onTaskGenerationEnd(id, 'GENERATION_STOPPED');
    });
    eventOn(tavern_events.MESSAGE_RECEIVED, scheduleWeChatLog);
    eventOn(tavern_events.MESSAGE_RECEIVED, (id?: number) => {
      scheduleShopResult('技能', id, 'MESSAGE_RECEIVED');
      scheduleShopResult('道具', id, 'MESSAGE_RECEIVED');
      scheduleTaskResult(id, 'MESSAGE_RECEIVED');
    });
    eventOn(tavern_events.MESSAGE_UPDATED, scheduleWeChatLog);
    eventOn(tavern_events.MESSAGE_UPDATED, (id?: number) => {
      scheduleShopResult('技能', id, 'MESSAGE_UPDATED');
      scheduleShopResult('道具', id, 'MESSAGE_UPDATED');
      scheduleTaskResult(id, 'MESSAGE_UPDATED');
    });
    eventOn(KatEvents.kat_mvu_update_finished, scheduleWeChatLog);
    eventOn('mag_variable_update_ended', () => scheduleWeChatLog());
    eventOn(KatEvents.kat_mvu_update_finished, () => {
      scheduleShopResult('技能', undefined, 'MVU 更新完成');
      scheduleShopResult('道具', undefined, 'MVU 更新完成');
      scheduleTaskResult(undefined, 'MVU 更新完成');
    });
    eventOn('mag_variable_update_ended', () => {
      scheduleShopResult('技能', undefined, '变量更新完成');
      scheduleShopResult('道具', undefined, '变量更新完成');
      scheduleTaskResult(undefined, '变量更新完成');
    });
    scheduleWeChatLog();
    void checkWorldbook();
    return () => {
      chatGeneration++;
      worldbookCheckGeneration++;
      if (pollingTimer) clearInterval(pollingTimer);
      if (refreshTimer) clearTimeout(refreshTimer);
      if (worldbookRetryTimer) clearTimeout(worldbookRetryTimer);
      pollingTimer = undefined;
      refreshTimer = undefined;
      worldbookRetryTimer = undefined;
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
    initializationNoticePending,
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
    failedGeneratedResult,
    clearFailedGeneratedResult,
    failedWeChatMessageId,
    clearFailedWeChatLog,
    deleteWeChatFloor,
    createWeChatGroup,
    refresh,
    initialize,
    setPhoneOpen,
    replace,
    update,
    saveProfileField,
    changeRuntimeMinorRole,
    unlockCharacterInfo,
    chooseFirstTarget,
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
    ensureWeChatAccount,
    respondWeChatFriend,
    performWeChatOperation,
    updateWeChatProfile,
    updateWeChatAccount,
    addWeChatSticker,
  };
});
