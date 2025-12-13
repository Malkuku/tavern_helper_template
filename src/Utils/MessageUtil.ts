/**
 * 获取指定id的message
 * @param message_id
 */
const getMessageById = (message_id: number) => {
  const chat_messages = getChatMessages(message_id);
  if (!chat_messages || chat_messages.length === 0) {
    return '';
  }
  return String(chat_messages[0].message);
};

/**
 * 获取当前message
 */
const getCurrentMessage = () => {
  return getMessageById(getCurrentMessageId());
};

/**
 * 获取最后几楼消息
 */
const getMessagesByRange = (messageId: number, index: number) => {
  const recordMessages = getChatMessages(`${messageId - index >= 0 ? messageId - index : 0}-${messageId}`);
  let records = '';
  recordMessages.forEach(message => {
    records += message.message;
  });
  return records;
};

/**
 * 将内容合并到message中
 */
const mergeContentToMessage = async (message_id: number, content: string) => {
  console.log('正在合并消息到正文: ', message_id, content);
  const chat_message = getChatMessages(message_id)[0];
  let msg = chat_message.message;
  msg = msg.replace(/$/, content);
  await setChatMessages([{ message_id, message: msg }]);
};

/**
 * 根据正则清除正文中的内容
 */
const removeContentByRegex = async (message_id: number, regexes: RegExp[]) => {
  console.log('正在清除正文中的内容: ', message_id, regexes);
  const chat_message = getChatMessages(message_id)[0];
  let msg = chat_message.message;
  for (const regex of regexes) {
    msg = msg.replace(regex, '');
  }
  await setChatMessages([{ message_id, message: msg }]);
};

export const MessageUtil = {
  getMessageById,
  getCurrentMessage,
  getMessagesByRange,
  mergeContentToMessage,
  removeContentByRegex,
};
