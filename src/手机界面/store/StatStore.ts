import { MvuUtil } from '@/Utils/MvuUtil';
import { KatEvents } from '@/Constants/KatEvent';
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { klona } from 'klona';
import type { stat_data, 微信数据, 微信消息内容 } from '../types';
import {
  addSticker,
  applyWeChatOperation,
  applyWeChatLogs,
  decideFriendRequest,
  logMessagesPresent,
  logConfirmsPending,
  mergeStickerSnapshot,
  parseWeChatLogs,
  privateChatKey,
  sendFriendRequest,
} from '../apps/wechat/wechatData';
import type { OperationEvent } from '../apps/wechat/wechatData';
import { reconcileWorldbookStatData } from './worldbookInit';

export const useMagicGirlStatStore = defineStore('magic-girl-stat', () => {
  const statData = ref<stat_data | null>(null);
  const wechatLogError = ref('');
  let pollingTimer: ReturnType<typeof setInterval> | undefined;
  let refreshTimer: ReturnType<typeof setTimeout> | undefined;
  let chatGeneration = 0;
  let wechatQueue = Promise.resolve();
  let stickerSyncQueued = false;

  function queueWeChatWork<T>(work: () => Promise<T>): Promise<T> {
    const result = wechatQueue.then(work);
    wechatQueue = result.then(
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
    return queueWeChatWork(async () => {
      await waitGlobalInitialized('Mvu');
      if (generation !== chatGeneration) throw new Error('聊天已切换，微信操作已取消。');
      const previous = Mvu.getMvuData({ type: 'message', message_id: -1 });
      if (!previous?.stat_data?.手机?.微信) throw new Error('微信变量尚未初始化，请重新打开手机。');
      const data = klona(previous.stat_data) as stat_data;
      data.手机.微信 = updater(data.手机.微信, data);
      if (generation !== chatGeneration) throw new Error('聊天已切换，微信操作已取消。');
      if (beforeWrite) await beforeWrite(data);
      if (generation !== chatGeneration) throw new Error('聊天已切换，微信操作已取消。');
      await writeStatData(data, previous);
    });
  }

  async function sendWeChatMessage(conversation: string, content: 微信消息内容[]) {
    const generation = chatGeneration;
    await updateWeChat((current, stat) => {
      if (current.准备发送) throw new Error('上一条微信仍在等待生成，请先重试或等待完成。');
      const worldTime = stat.世界?.时间;
      if (!worldTime) throw new Error('世界时间尚未设置，无法发送微信。');
      const session = current.会话[conversation];
      if (session) {
        if (!session.成员.includes('user')) throw new Error('不能从 user 手机向非本人会话发送消息。');
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
      const wechat = klona(current);
      wechat.准备发送 = { 会话: conversation, 时间: worldTime, 内容: klona(content) };
      return wechat;
    });
    if (generation !== chatGeneration) throw new Error('聊天已切换，请返回原聊天重试发送。');
    await eventEmit('Chat_On_WeChat');
  }

  async function retryWeChatSend() {
    if (!statData.value?.手机?.微信?.准备发送) throw new Error('没有待生成的微信消息。');
    await eventEmit('Chat_On_WeChat');
  }

  async function requestWeChatFriend(id: string, message: string) {
    await updateWeChat(current => sendFriendRequest(current, id, message));
  }

  async function respondWeChatFriend(id: string, accept: boolean) {
    await updateWeChat(current => decideFriendRequest(current, id, accept));
  }

  async function performWeChatOperation(event: OperationEvent) {
    await updateWeChat((current, data) => {
      if (current.准备发送) throw new Error('上一条微信仍在等待正文确认。');
      if (!data.世界?.时间) throw new Error('世界时间尚未设置。');
      return applyWeChatOperation(current, { ...event, 时间: data.世界.时间 });
    });
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
    void queueWeChatWork(syncStickerSnapshot)
      .catch(error => console.error('微信表情包备份同步失败', error))
      .finally(() => {
        stickerSyncQueued = false;
      });
  }

  async function processWeChatMessage(messageId: number, generation: number) {
    if (generation !== chatGeneration) return;
    const message = getChatMessages(messageId)[0];
    if (!message || message.role !== 'assistant' || !message.message.includes('<WeChatLog>')) return;
    const logs = parseWeChatLogs(message.message);
    if (!logs.length) return;
    const signature = JSON.stringify(logs);
    const markers = getVariables({ type: 'chat' })?.magicGirlWeChatAppliedLogs ?? {};
    const key = String(messageId);
    await waitGlobalInitialized('Mvu');
    if (generation !== chatGeneration) return;
    const previous = Mvu.getMvuData({ type: 'message', message_id: -1 });
    if (!previous?.stat_data?.手机?.微信) throw new Error('微信变量尚未初始化，正文增量仍待处理。');
    if (markers[key] === signature && logMessagesPresent(previous.stat_data.手机.微信, logs)) {
      if (logs.some(log => logConfirmsPending(previous.stat_data.手机.微信, log))) {
        const data = klona(previous.stat_data) as stat_data;
        data.手机.微信.准备发送 = null;
        await writeStatData(data, previous);
      }
      return;
    }
    if (markers[key] && markers[key] !== signature) {
      const oldLogs = JSON.parse(markers[key]);
      if (logMessagesPresent(previous.stat_data.手机.微信, oldLogs))
        throw new Error(`第 ${messageId} 楼的微信日志已变更，旧增量仍在变量中，不能自动重复应用。`);
    }
    const data = klona(previous.stat_data) as stat_data;
    data.手机.微信 = applyWeChatLogs(data.手机.微信, logs);
    if (generation !== chatGeneration) return;
    await writeStatData(data, previous);
    wechatLogError.value = '';
    updateVariablesWith(
      variables => ({
        ...variables,
        magicGirlWeChatAppliedLogs: { ...(variables.magicGirlWeChatAppliedLogs ?? {}), [key]: signature },
      }),
      { type: 'chat' },
    );
  }

  function scheduleWeChatLog(messageId?: number) {
    const generation = chatGeneration;
    void queueWeChatWork(async () => {
      const id = messageId ?? getLastMessageId();
      if (id >= 0) await processWeChatMessage(id, generation);
    }).catch(error => {
      wechatLogError.value = error instanceof Error ? error.message : '微信正文增量处理失败';
      console.error('微信正文增量处理失败', error);
    });
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
      if (!current) return;
      const firstInitialization = Object.keys(current).length === 1 && current.作者 === 987;
      const { data, changed } = reconcileWorldbookStatData(firstInitialization ? undefined : current, entries);
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
      const data = getVariables({ type: 'message', message_id: -1 })?.stat_data;
      statData.value = data && typeof data === 'object' ? (data as stat_data) : null;
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
    wechatLogError.value = '';
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
    eventOn(tavern_events.MESSAGE_RECEIVED, scheduleWeChatLog);
    eventOn(tavern_events.MESSAGE_UPDATED, scheduleWeChatLog);
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
    wechatLogError,
    refresh,
    initialize,
    checkWorldbook,
    replace,
    update,
    sendWeChatMessage,
    retryWeChatSend,
    requestWeChatFriend,
    respondWeChatFriend,
    performWeChatOperation,
    addWeChatSticker,
  };
});
