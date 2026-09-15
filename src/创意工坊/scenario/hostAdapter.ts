import { klona } from 'klona';

import { ScenarioDataError } from './errors';
import type { AssemblyResult } from './types';

export async function applyScenarioToLatestMessage(result: AssemblyResult): Promise<void> {
  await waitGlobalInitialized('Mvu');
  const messageId = getLastMessageId();
  if (messageId < 0) {
    throw new ScenarioDataError('HOST_APPLY_FAILED', '当前聊天没有可写入的消息楼层。', { category: '宿主' });
  }

  const currentMessage = getChatMessages(messageId)[0];
  if (!currentMessage) {
    throw new ScenarioDataError('HOST_APPLY_FAILED', `无法读取消息楼层 ${messageId}。`, {
      category: '宿主',
      resourceId: String(messageId),
    });
  }

  const variableOption = { type: 'message' as const, message_id: messageId };
  const previousMvuData = klona(Mvu.getMvuData(variableOption));
  const nextMvuData = {
    ...klona(previousMvuData),
    stat_data: klona(result.statData),
  };

  try {
    await Mvu.replaceMvuData(nextMvuData, variableOption);
    await setChatMessages([{ message_id: messageId, message: result.openingText }], { refresh: 'affected' });
  } catch (error) {
    const rollbackErrors: unknown[] = [];
    try {
      await Mvu.replaceMvuData(previousMvuData, variableOption);
    } catch (rollbackError) {
      rollbackErrors.push(rollbackError);
    }
    try {
      await setChatMessages([{ message_id: messageId, message: currentMessage.message }], { refresh: 'affected' });
    } catch (rollbackError) {
      rollbackErrors.push(rollbackError);
    }
    if (rollbackErrors.length > 0) {
      throw new ScenarioDataError('HOST_ROLLBACK_FAILED', '剧本应用失败，且原 MVU 数据恢复失败。', {
        category: '宿主',
        resourceId: String(messageId),
        cause: new AggregateError([error, ...rollbackErrors]),
      });
    }
    throw new ScenarioDataError('HOST_APPLY_FAILED', '剧本应用失败，原 MVU 数据已恢复。', {
      category: '宿主',
      resourceId: String(messageId),
      cause: error,
    });
  }
}

export function exportScenario(result: AssemblyResult): void {
  const payload = JSON.stringify(
    {
      scenario: {
        id: result.scenarioId,
        key: result.scenario.key,
        author: result.scenario.author,
        custom_protagonist: result.scenario.自定义主角,
      },
      stat_data: result.statData,
      opening_text: result.openingText,
    },
    null,
    2,
  );
  const url = URL.createObjectURL(new Blob([payload], { type: 'application/json;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${result.scenario.key}-剧本数据.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
