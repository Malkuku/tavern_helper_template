import { defineStore } from 'pinia';
import { ERAUtil } from '../../Utils/ERAUtil';
import { ERAEvents } from '../../Constants/ERAEvent';
import { EraDataHandler } from '../EraDataHandler/EraDataHandler';

export const useEraEditStore = defineStore('KatEraEdit', () => {
  /**
   * 尝试从变量中获取stat_data
   */
  const getStatData = async () => {
    const { stat_data } = getVariables({type: 'chat'});
    console.log('获取stat_data内容: ',stat_data);
    return stat_data || {};
  }

  /**
   * 保存ERA设置
   * 1. 先取出当前快照 snap
   * 2. 与入参 object 做三路对比：删除 / 更新 / 插入
   * 3. 按“先删再更新再插入”顺序写回
   */
  const saveEraEdit = async (object: Record<string, any>) => {
    if (!object || typeof object !== 'object') return;

    /* 1. 取快照 */
    const snap = await getStatData();

    /* 2. 三路对比 */
    const toDelete: Record<string, any> = {};
    const toUpdate: Record<string, any> = {};
    const toInsert: Record<string, any> = {};

    const walk = (
      snapNode: any,
      objNode: any,
      deleteNode: any,
      updateNode: any,
      insertNode: any,
      path: string[] = []
    ) => {
      /* 收集所有 key */
      const snapKeys = new Set(
        snapNode && typeof snapNode === 'object' && !Array.isArray(snapNode)
          ? Object.keys(snapNode)
          : []
      );
      const objKeys = new Set(
        objNode && typeof objNode === 'object' && !Array.isArray(objNode)
          ? Object.keys(objNode)
          : []
      );

      /* 删除：只在 snap 里出现 */
      snapKeys.forEach(k => {
        if (!objKeys.has(k)) {
          const val = snapNode[k];
          EraDataHandler.setByPathArray(deleteNode, [...path, k], val);
        }
      });

      /* 插入：只在 object 里出现 */
      objKeys.forEach(k => {
        if (!snapKeys.has(k)) {
          const val = objNode[k];
          EraDataHandler.setByPathArray(insertNode, [...path, k], val);
        }
      });

      /* 更新：两边都有，值不同 */
      objKeys.forEach(k => {
        if (snapKeys.has(k)) {
          const sVal = snapNode[k];
          const oVal = objNode[k];
          const bothObject =
            sVal &&
            oVal &&
            typeof sVal === 'object' &&
            typeof oVal === 'object' &&
            !Array.isArray(sVal) &&
            !Array.isArray(oVal);

          if (bothObject) {
            /* 递归对比子树 */
            walk(sVal, oVal, deleteNode, updateNode, insertNode, [...path, k]);
          } else if (!EraDataHandler.deepEqual(sVal, oVal)) {
            EraDataHandler.setByPathArray(updateNode, [...path, k], oVal);
          }
        }
      });
    };

    walk(snap, object, toDelete, toUpdate, toInsert);

    /* 3. 按顺序写回 */
    if (Object.keys(toDelete).length)   await ERAUtil.DeleteByObject(toDelete);
    if (Object.keys(toUpdate).length)   await ERAUtil.UpdateByObject(toUpdate);
    if (Object.keys(toInsert).length)   await ERAUtil.InsertByObject(toInsert);

    /* 4. 强制同步 */
    await ERAUtil.ForceSync(ERAEvents.SYNC_MODE.LATEST);
  };

  return {
    getStatData,
    saveEraEdit
  };
});
