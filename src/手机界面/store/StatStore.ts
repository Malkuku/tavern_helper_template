import { MvuUtil } from '@/Utils/MvuUtil';
import { KatEvents } from '@/Constants/KatEvent';
import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { stat_data } from '../types';
import { reconcileWorldbookStatData } from './worldbookInit';

export const useMagicGirlStatStore = defineStore('magic-girl-stat', () => {
  const statData = ref<stat_data | null>(null);
  let pollingTimer: ReturnType<typeof setInterval> | undefined;
  let refreshTimer: ReturnType<typeof setTimeout> | undefined;
  let chatGeneration = 0;

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
      const { data, changed } = reconcileWorldbookStatData(previous.stat_data, entries);
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
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = undefined;
    scheduleRefresh();
    startPolling();
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

  return { statData, refresh, initialize, checkWorldbook, replace, update };
});
