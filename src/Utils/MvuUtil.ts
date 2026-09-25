/**
 * 从正文中应用一次Mvu更新
 */
const updateMvuDataFromContent = async () => {
  await waitGlobalInitialized('Mvu');

  const mvu_data = Mvu.getMvuData({ type: 'message', message_id: -1 });
  const content = getChatMessages(-1)[0].message;
  const new_data = await Mvu.parseMessage(content, mvu_data);
  if (new_data) {
    await Mvu.replaceMvuData(new_data, { type: 'message', message_id: getLastMessageId() });
    await eventEmit('mag_variable_update_ended', new_data, mvu_data);
  }
};

/**
 * 从指定文本中应用一次Mvu更新
 */
const updateMvuData = async (content: string) => {
  await waitGlobalInitialized('Mvu');

  const mvu_data = Mvu.getMvuData({ type: 'message', message_id: -1 });
  const new_data = await Mvu.parseMessage(content, mvu_data);
  if (new_data) {
    await Mvu.replaceMvuData(new_data, { type: 'message', message_id: getLastMessageId() });
    await eventEmit('mag_variable_update_ended', new_data, mvu_data);
  }
};

/**
 * 将Mvu变量回滚到上一楼的
 */
const backUpMvuData = async () => {
  await waitGlobalInitialized('Mvu');
  const old_data = Mvu.getMvuData({ type: 'message', message_id: -1 });
  const mvu_data = Mvu.getMvuData({ type: 'message', message_id: Math.max(0, getLastMessageId() - 1) });
  if (mvu_data) {
    await Mvu.replaceMvuData(mvu_data, { type: 'message', message_id: getLastMessageId() });
    await eventEmit('mag_variable_update_ended', mvu_data, old_data);
  }
};

/**
 * 通过变量对象覆盖更新Mvu变量(全量)
 */
const updateMvuDataByObj = async (obj: object) => {
  await waitGlobalInitialized('Mvu');
  const oldMvuData = Mvu.getMvuData({ type: 'message', message_id: -1 });
  const newMvuData = JSON.parse(JSON.stringify(oldMvuData));
  newMvuData.stat_data = obj;
  await Mvu.replaceMvuData(newMvuData, { type: 'message', message_id: getLastMessageId() });
  await eventEmit('mag_variable_update_ended', newMvuData, oldMvuData);
};

/**
 * 辅助函数：深度合并对象
 * 1. 如果 sourceValue 为 null，则从 target 中删除该 key
 * 2. 如果是对象则递归合并
 */
const deepMerge = (target: any, source: any): any => {
  // 如果目标不是对象，直接返回源（基础类型覆盖）
  if (typeof target !== 'object' || target === null) {
    return source;
  }
  // 如果源是 null，说明上层调用意图是删除，但在递归内部通常不会直接进到这里
  // 因为我们在遍历 key 时就会处理 null
  if (source === null) return null;

  const output = Array.isArray(target) ? [...target] : { ...target };

  Object.keys(source).forEach(key => {
    const sourceValue = source[key];

    // 【核心修改】检测 null 并执行删除
    if (sourceValue === null) {
      delete output[key];
      return; // 结束当前 key 的处理
    }

    const targetValue = output[key];

    if (Array.isArray(targetValue) && Array.isArray(sourceValue)) {
      output[key] = sourceValue;
    } else if (typeof targetValue === 'object' && targetValue !== null && typeof sourceValue === 'object') {
      // 递归合并
      output[key] = deepMerge(targetValue, sourceValue);

      // 边界情况：如果递归合并后子对象变空了（所有属性都被删了），是否要删除父级？
      // 通常不需要，保留空对象 {} 即可。如果需要连带删除，可以在这里判断。
    } else {
      output[key] = sourceValue;
    }
  });

  return output;
};

/**
 * 通过Diff对象差异更新Mvu变量 (支持深层合并)
 * @param diffObj 包含需要更新字段的局部对象，例如 { status: { hp: 100 } }
 */
const updateMvuDataByDiff = async (diffObj: object) => {
  await waitGlobalInitialized('Mvu');

  // 1. 获取原始数据
  const oldMvuData = Mvu.getMvuData({ type: 'message', message_id: -1 });

  // 2. 创建新数据的深拷贝，避免直接修改引用导致 oldMvuData 也变了
  // 注意：如果 Mvu.getMvuData 返回的是引用，必须拷贝一份用于修改
  const newMvuData = JSON.parse(JSON.stringify(oldMvuData));

  // 3. 确保 stat_data 存在
  if (!newMvuData.stat_data) {
    newMvuData.stat_data = {};
  }

  // 4. 执行差异合并
  // 将 diffObj 合并进 newMvuData.stat_data
  newMvuData.stat_data = deepMerge(newMvuData.stat_data, diffObj);

  // 5. 保存并触发事件
  if (newMvuData) {
    await Mvu.replaceMvuData(newMvuData, { type: 'message', message_id: getLastMessageId() });
    // 此时 oldMvuData 保持原样，newMvuData 是更新后的，事件监听者可以对比差异
    await eventEmit('mag_variable_update_ended', newMvuData, oldMvuData);
  }
};

// 导出
export const MvuUtil = {
  updateMvuDataFromContent,
  updateMvuData,
  backUpMvuData,
  updateMvuDataByObj,
  updateMvuDataByDiff,
};
