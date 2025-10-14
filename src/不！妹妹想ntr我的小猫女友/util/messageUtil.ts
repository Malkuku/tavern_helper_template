export const getCurrentMessage = () => {
  const message_id = getCurrentMessageId();
  const chat_messages = getChatMessages(message_id);

  if (!chat_messages || chat_messages.length === 0) {
    return '';
  }
  return String(chat_messages[0].message);
}
