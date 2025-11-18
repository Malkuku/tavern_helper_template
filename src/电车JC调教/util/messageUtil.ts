export const getCurrentMessage = () => {
  const message_id = getCurrentMessageId();
  const chat_messages = getChatMessages(message_id);

  if (!chat_messages || chat_messages.length === 0) {
    return '';
  }
  return String(chat_messages[0].message);
}


export const getOldStatData = async () => {
  const message = getCurrentMessage();
  const match = message.match(/"era-message-key"="([^"]+)"/);
  if (match) {
    const key = match[1];
    await eventEmit('era:getSnapshotAtMk', { mk: key });
    return;
  }
  console.error(`未找到位于第${getCurrentMessageId()}楼层的旧数据`);
  return null;
}
