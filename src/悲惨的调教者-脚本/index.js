/**
 * 仅处理：
 * 1. 好感度 / 暴露度 / 调教经验值 / 开发经验值
 * 2. 所有受限数值 ≥ 0
 * 3. 经验值变化后自动升级（全局调教等级 & 身体开发等级）
 */
function updateStatData(currentData, updateData) {
  const result = JSON.parse(JSON.stringify(updateData));

  /* ---------- 读取限制配置 ---------- */
  const limits = currentData.数值变化限制 || {
    好感度: { 最大增值: 20, 最大减值: 0 },
    暴露度: { 最大增值: 10, 最大减值: -5 },
    经验值: { 最大增值: 30, 最大减值: 0 }
  };

  /* ---------- 角色部分 ---------- */
  if (!updateData.角色 || !currentData.角色) return result;

  Object.keys(updateData.角色).forEach(roleName => {
    const curRole = currentData.角色[roleName];
    const updRole = updateData.角色[roleName];
    if (!curRole || !updRole || !curRole.特殊状态) return;

    const curSp = curRole.特殊状态;
    const updSp = updRole.特殊状态 || {};

    /* -- 1. 好感度 -- */
    if (typeof updSp.好感度 === 'number') {
      const delta = updSp.好感度 - (curSp.好感度 || 0);
      const finalDelta = clampDelta(delta, limits.好感度);
      const next = Math.max(0, (curSp.好感度 || 0) + finalDelta);
      if (!result.角色[roleName].特殊状态) result.角色[roleName].特殊状态 = {};
      result.角色[roleName].特殊状态.好感度 = next;
    }

    /* -- 2. 暴露度 -- */
    if (typeof updSp.暴露度 === 'number') {
      const delta = updSp.暴露度 - (curSp.暴露度 || 0);
      const finalDelta = clampDelta(delta, limits.暴露度);
      const next = Math.max(0, (curSp.暴露度 || 0) + finalDelta);
      if (!result.角色[roleName].特殊状态) result.角色[roleName].特殊状态 = {};
      result.角色[roleName].特殊状态.暴露度 = next;
    }

    /* -- 3. 调教经验值（全局等级）-- */
    if (typeof updSp.调教经验值 === 'number') {
      const delta = updSp.调教经验值 - (curSp.调教经验值 || 0);
      const finalDelta = clampDelta(delta, limits.经验值);
      let nextExp = Math.max(0, (curSp.调教经验值 || 0) + finalDelta);

      // 升级计算
      let lv = currentData.调教等级 || 0;
      while (nextExp >= (lv + 1) * 4) {
        nextExp -= (lv + 1) * 4;
        lv += 1;
      }

      if (!result.角色[roleName].特殊状态) result.角色[roleName].特殊状态 = {};
      result.角色[roleName].特殊状态.调教经验值 = nextExp;
      result.调教等级 = lv;
    }

    /* -- 4. 开发经验值（胸部/小穴/口穴/菊穴）-- */
    const parts = ['胸部', '小穴', '口穴', '菊穴'];
    parts.forEach(part => {
      const curExp = curSp.开发经验值?.[part] || 0;
      const updExp = updSp.开发经验值?.[part];
      if (typeof updExp !== 'number') return;

      const delta = updExp - curExp;
      const finalDelta = clampDelta(delta, limits.经验值);
      let next = Math.max(0, curExp + finalDelta);

      // 写回经验值
      if (!result.角色[roleName].特殊状态.开发经验值) {
        result.角色[roleName].特殊状态.开发经验值 = {};
      }
      result.角色[roleName].特殊状态.开发经验值[part] = next;

      // 同步到身体开发等级
      if (!result.身体开发等级) result.身体开发等级 = {};
      if (!result.身体开发等级[roleName]) result.身体开发等级[roleName] = {};
      result.身体开发等级[roleName][part] = expToDevLv(next);
    });
  });

  return result;
}

/* ---------------- 工具函数 ---------------- */
function clampDelta(delta, rule) {
  if (delta > 0) return Math.min(delta, rule.最大增值 ?? Infinity);
  if (delta < 0) return Math.max(delta, rule.最大减值 ?? -Infinity);
  return 0;
}

function expToDevLv(exp) {
  const tbl = [0, 5, 15, 25, 35, 50, 100];
  for (let i = tbl.length - 1; i >= 0; i--) if (exp >= tbl[i]) return i;
  return 0;
}

eventOn(tavern_events.MESSAGE_RECEIVED, async message_id => {
  console.log(`正在处理第${message_id}条消息`);
  // 捕获并处理 VariableEdit 标签
  const chat_message = getChatMessages(message_id)[0];
  let msg = chat_message.message;
  const variableEditMatch = msg.match(/<VariableEdit>((?:(?!<VariableEdit>)[\s\S])*?)<\/VariableEdit>(?![\s\S]*<VariableEdit>[\s\S]*<\/VariableEdit>)/);

  if (variableEditMatch) {
    try {
      const jsonContent = variableEditMatch[1].trim();
      const variableData = JSON.parse(jsonContent);

      console.log('捕获到 VariableEdit 数据:', variableData);

      // 获取当前的 stat_data
      const currentStatData = getVariables({ type: 'chat' }).stat_data;
      console.log('最新的 stat_data :', currentStatData);
      // 只更新亲密度、好感度、进度
      const updatedData = updateStatData(currentStatData, variableData);

      // 将更新后的数据转换为 JSON 字符串
      const updatedJsonContent = JSON.stringify(updatedData, null, 2);

      // 用更新后的内容替换原来的 VariableEdit 标签内容
      msg = msg.replace(
        /<VariableEdit>[\s\S]*?<\/VariableEdit>/,
        `<VariableEdit>\n${updatedJsonContent}\n</VariableEdit>`
      );

      console.log('数据更新完成',updatedData);

    } catch (error) {
      toastr.error('VariableEdit JSON 解析错误');
      console.error('VariableEdit JSON 解析错误:', error);
    }
  }

  await setChatMessages([{ message_id, message: msg }]);

});
