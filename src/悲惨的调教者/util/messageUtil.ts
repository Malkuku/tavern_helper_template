export const getCurrentMessage = () => {
  const message_id = getCurrentMessageId();
  const chat_messages = getChatMessages(message_id);

  if (!chat_messages || chat_messages.length === 0) {
    return '';
  }
  return String(chat_messages[0].message);
};

export const getOldStatData = () => {
  const variables = getVariables({ type: 'chat' });
  const editLogs = variables.ERAMetaData.EditLogs;
  const message = getCurrentMessage();
  const match = message.match(/"era-message-key"="([^"]+)"/);
  if (match) {
    const key = match[1];
    if (key && editLogs[key]) {
      console.log(`正在加载位于第${getCurrentMessageId()}楼层的旧数据`);
      const res = editLogsToJson(JSON.parse(editLogs[key]) as EditLog[]);
      console.log(`旧数据`, res);
      return res;
    }
  }
  console.error(`未找到位于第${getCurrentMessageId()}楼层的旧数据`);
  return null;
};
type EditLog = {
  op: 'update';
  path: string;
  value_old: any;
  value_new: any;
};

function editLogsToJson(logs: EditLog[]): Record<string, any> {
  if (!Array.isArray(logs)) return {};

  const result: Record<string, any> = {};

  for (const log of logs) {
    const keys = log.path.split('.');
    let target = result;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!target[key] || typeof target[key] !== 'object') {
        target[key] = {};
      }
      target = target[key];
    }

    target[keys[keys.length - 1]] = log.value_new;
  }

  return result;
}
