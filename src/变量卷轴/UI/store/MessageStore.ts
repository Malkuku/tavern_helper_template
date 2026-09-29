import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useMessageStore = defineStore('message', () => {
  const message = ref('');
  const messageId = ref(-1);
  const getMessage = () => {
    const message_id = getLastMessageId();
    const chat_messages = message_id >= 0 ? getChatMessages(message_id) : [];
    messageId.value = message_id;
    message.value = chat_messages?.[0]?.message ?? '';
  };
  // 注册事件监听器
  const registerListener = () => {
    eventOn('mag_variable_update_ended', getMessage);
    eventOn(tavern_events.CHAT_CHANGED, getMessage);
    eventOn(tavern_events.MESSAGE_RECEIVED, getMessage);
    eventOn(tavern_events.MESSAGE_UPDATED, getMessage);
    eventOn(tavern_events.MESSAGE_DELETED, getMessage);
    eventOn(tavern_events.GENERATION_ENDED, getMessage);
  };
  return {
    message,
    messageId,
    getMessage,
    registerListener,
  };
});
