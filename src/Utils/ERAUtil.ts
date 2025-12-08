import { MessageUtil } from './MessageUtil';
import { ERAEvents } from '../Constants/ERAEvent';

/**
 * 发送删除ERA对象事件
 * 根据一个描述性的对象结构，删除一个或多个已存在的变量。
 */
const DeleteByObject = async (object: object) => {
  await eventEmit(ERAEvents.DELETE_BY_OBJECT, object);
}

/**
 * 发送更新ERA对象的事件
 * 通过对象合并的方式，修改一个或多个已存在的变量。如果路径不存在，则该路径的更新将被忽略。
 */
const UpdateByObject = async (object: object) => {
  await eventEmit(ERAEvents.UPDATE_BY_OBJECT, object);
}

/**
 * 发送写入ERA对象事件
 * 非破坏性地插入一个或多个变量。只会写入不存在的路径，绝不会覆盖任何已有数据。
 */
const InsertByObject = async (object: object) => {
  await eventEmit(ERAEvents.INSERT_BY_OBJECT, object);
}

/**
 * 触发一次强制同步
 */
const ForceSync = async (syncMode: string) => {
  await eventEmit(ERAEvents.FORCE_SYNC,{ mode: syncMode });
}
const ForceSyncByMessageId = async (messageId: number) => {
  await eventEmit(ERAEvents.FORCE_SYNC,{ mode: ERAEvents.SYNC_MODE.ROLLBACK_TO ,message_id: messageId});
}

/**
 * 发送获取ERA快照的事件
 */
const EmitEraSnapshot = async () => {
  const message = MessageUtil.getCurrentMessage();
  const match = message.match(/"era-message-key"="([^"]+)"/);
  if (match) {
    const key = match[1];
    await eventEmit(ERAEvents.GET_SNAPSHOT_AT_MK, { mk: key });
    return;
  }
  console.error(`未找到位于第${getCurrentMessageId()}楼层的旧数据`);
  return null;
}


export const ERAUtil = {
  DeleteByObject,
  UpdateByObject,
  EmitEraSnapshot,
  InsertByObject,
  ForceSync,
  ForceSyncByMessageId
}
