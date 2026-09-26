import { MvuUtil } from '@/Utils/MvuUtil';
import { KatEvents } from '@/Constants/KatEvent';
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { klona } from 'klona';
import type { stat_data, 微信数据, 微信消息, 微信消息内容 } from '../types';
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
import { reconcileWorldbookStatData } from './worldbookInit';

export const useMagicGirlStatStore = defineStore('magic-girl-stat', () => {
  const statData = ref<stat_data | null>(null);
  const wechatLogError = ref('');
  const failedWeChatMessageId = ref<number | null>(null);
  const failedWeChatLogIndex = ref<number | null>(null);
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

  async function sendWeChatMessage(
    conversation: string,
    content: 微信消息内容[],
    quote?: 微信消息 & { 内容下标?: number },
  ) {
    const generation = chatGeneration;
    await updateWeChat((current, stat) => {
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
    for (let index = 0; index < logs.length; index++) {
      try {
        const prefix = logs.slice(0, index + 1);
        const pendingLogs = unappliedWeChatLogs(current, prefix);
        if (pendingLogs.length) applyWeChatLogs(current, pendingLogs);
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
    if (generation !== chatGeneration) return;
    await writeStatData(data, previous);
    wechatLogError.value = '';
    failedWeChatLogIndex.value = null;
  }

  function scheduleWeChatLog(messageId?: number) {
    const generation = chatGeneration;
    failedWeChatLogIndex.value = null;
    void queueWeChatWork(async () => {
      const id = messageId ?? getLastMessageId();
      if (id >= 0) await processWeChatMessage(id, generation);
    }).catch(error => {
      failedWeChatMessageId.value = messageId ?? getLastMessageId();
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
      const data = getVariables({ type: 'message', message_id: -1 })?.stat_data;
      statData.value = data && typeof data === 'object' ? (data as stat_data) : null;
      if (statData.value?.手机?.微信)
        statData.value = {
          ...statData.value,
          手机: { ...statData.value.手机, 微信: normalizeWeChatIds(statData.value.手机.微信) },
        };
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
    failedWeChatMessageId,
    clearFailedWeChatLog,
    deleteWeChatFloor,
    createWeChatGroup,
    refresh,
    initialize,
    checkWorldbook,
    replace,
    update,
    sendWeChatMessage,
    confirmWeChatSend,
    discardWeChatDraft,
    retryWeChatSend,
    requestWeChatFriend,
    respondWeChatFriend,
    performWeChatOperation,
    addWeChatSticker,
  };
});
