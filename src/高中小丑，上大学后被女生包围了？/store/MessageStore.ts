import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useMessageStore = defineStore('message', () => {
  const message = ref('');
  const textarea = window.parent.document.querySelector('#send_textarea') as HTMLTextAreaElement;
  const getMessage = () => {
    const message_id = getCurrentMessageId();
    const chat_messages = getChatMessages(message_id);

    if (!chat_messages || chat_messages.length === 0) {
      message.value = '';
    }

    message.value = String(chat_messages[0].message);
  }
  // 注册事件监听器
  const registerListener = () => {
    eventOn('era:writeDone', getMessage);
  };
  return {
    message,
    textarea,
    getMessage,
    registerListener
  };
});
