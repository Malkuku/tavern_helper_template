import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { stat_data } from '@/手机界面/types';
import { KatEvents } from '@/Constants/KatEvent';

export const useMessageStore = defineStore('message', () => {
  const message = ref('');
  const messageId = ref(-1);
  const statData = ref<stat_data | null>(null);
  const getMessage = () => {
    const message_id = getLastMessageId();
    const chat_messages = message_id >= 0 ? getChatMessages(message_id) : [];
    messageId.value = message_id;
    message.value = chat_messages?.[0]?.message ?? '';
    const data = getVariables({ type: 'message', message_id: -1 })?.stat_data;
    statData.value = data && typeof data === 'object' ? (data as stat_data) : null;
  };
  // 注册事件监听器
  const registerListener = () => {
    eventOn('mag_variable_update_ended', getMessage);
    eventOn(KatEvents.kat_mvu_update_finished, getMessage);
    eventOn(tavern_events.CHAT_CHANGED, getMessage);
    eventOn(tavern_events.MESSAGE_RECEIVED, getMessage);
    eventOn(tavern_events.MESSAGE_UPDATED, getMessage);
    eventOn(tavern_events.MESSAGE_DELETED, getMessage);
    eventOn(tavern_events.GENERATION_ENDED, getMessage);
  };
  return {
    message,
    messageId,
    statData,
    getMessage,
    registerListener,
  };
});
