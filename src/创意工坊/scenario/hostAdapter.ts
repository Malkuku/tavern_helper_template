import { klona } from 'klona';

import { ScenarioDataError } from './errors';
import type { AssemblyResult } from './types';

/** 尘史开局边界；创意工坊 UI 不调用此函数。 */
export async function applyScenarioToLatestMessage(result: AssemblyResult): Promise<void> {
  await waitGlobalInitialized('Mvu');
  const messageId = getLastMessageId();
  if (messageId < 0) throw new ScenarioDataError('HOST_APPLY_FAILED', '当前聊天没有可写入的消息楼层。', { category: '宿主' });
  const currentMessage = getChatMessages(messageId)[0];
  if (!currentMessage) throw new ScenarioDataError('HOST_APPLY_FAILED', `无法读取消息楼层 ${messageId}。`, { category: '宿主', resourceId: String(messageId) });
  const option = { type: 'message' as const, message_id: messageId };
  const previous = klona(Mvu.getMvuData(option));
  const next = { ...klona(previous), stat_data: klona(result.statData) };
  try {
    await Mvu.replaceMvuData(next, option);
    await setChatMessages([{ message_id: messageId, message: result.openingText }], { refresh: 'affected' });
  } catch (error) {
    const rollbackErrors: unknown[] = [];
    try { await Mvu.replaceMvuData(previous, option); } catch (cause) { rollbackErrors.push(cause); }
    try { await setChatMessages([{ message_id: messageId, message: currentMessage.message }], { refresh: 'affected' }); } catch (cause) { rollbackErrors.push(cause); }
    if (rollbackErrors.length) throw new ScenarioDataError('HOST_ROLLBACK_FAILED', '剧本应用失败，且宿主数据恢复失败。', { category: '宿主', resourceId: String(messageId), cause: new AggregateError([error, ...rollbackErrors]) });
    throw new ScenarioDataError('HOST_APPLY_FAILED', '剧本应用失败，宿主数据已恢复。', { category: '宿主', resourceId: String(messageId), cause: error });
  }
}
