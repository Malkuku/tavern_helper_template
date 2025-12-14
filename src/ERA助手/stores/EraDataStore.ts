import { defineStore } from 'pinia';
import { EraDataRule } from '../EraDataHandler/types/EraDataRule';
import { eraLogger } from '../utils/EraHelperLogger';

export const useEraDataStore = defineStore('KatEraData', () => {
  // 储存的EraData规则
  const eraDataRule = ref<EraDataRule>({});

  /**
   * 尝试从变量中获取EraData规则
   */
  const getEraDataRules = async () => {
    const variables = getVariables({ type: 'script', script_id: getScriptId() });
    const era_data_rule = variables.era_data_rule;
    eraDataRule.value = era_data_rule || {};
    eraLogger.log('获取更新规则设置: ', eraDataRule.value);
  };

  /**
   * 保存模型设置
   */
  const saveEraDataRules = async () => {
    const saveVariables = eraDataRule.value;
    const cleaned = JSON.parse(JSON.stringify(saveVariables));
    await updateVariablesWith(
      vars => ({
        ...vars,
        era_data_rule: cleaned,
      }),
      { type: 'script', script_id: getScriptId() },
    );
  };

  /**
   * 清空模型设置
   */
  const clearEraDataRules = async () => {
    eraDataRule.value = {};
    await saveEraDataRules();
  };

  return {
    eraDataRule,
    getEraDataRules,
    saveEraDataRules,
    clearEraDataRules,
  };
});
