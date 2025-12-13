import { defineStore } from 'pinia';

export const useUiStore = defineStore('ui', () => {
  //是否显示UI
  const showUI = ref(false);
  //是否为分布计算
  const isAsync = ref(false);
  //是否为分析模式
  const isUpdateEra = ref(false);
  const modelSource = ref('sample'); //sample | external | profile
  const customModelSettings = ref({
    baseURL :  '',
    apiKey : '',
    modelName :  '',
    temperature: 0.7,
    frequencyPenalty: 0,
    presencePenalty: 0,
    maxTokens: 20000
  })
  //预设模型设置
  const profileSetting = ref('');

  /**
   * 尝试从变量中获取模型设置
   */
  const getModelSettings = async () => {
    const variables = getVariables({type: 'script', script_id: getScriptId()});
    const era_data = variables.era_data;
    if (era_data) {
      modelSource.value = era_data.modelSource;
      customModelSettings.value = era_data.customModelSettings;
      isAsync.value = era_data.isAsync;
      profileSetting.value = era_data.profileSetting;
    }
    console.log('获取模型设置: ',era_data);
  }

  /**
   * 保存模型设置
   */
  const saveModelSettings = async () => {
    const saveVariables = {
        isAsync : isAsync.value,
        modelSource: modelSource.value,
        customModelSettings: customModelSettings.value,
        profileSetting: profileSetting.value
    };
    const cleaned = JSON.parse(JSON.stringify(saveVariables));
    await updateVariablesWith(
      vars => ({
        ...vars,
        era_data: cleaned
      }),
      {type: 'script', script_id: getScriptId()}
    )
  }

  /**
   * 清空模型设置
   */
  const clearModelSettings = async () => {
    modelSource.value = 'sample';
    customModelSettings.value = {
      baseURL :  '',
      apiKey : '',
      modelName :  '',
      temperature: 0.7,
      frequencyPenalty: 0,
      presencePenalty: 0,
      maxTokens: 20000
    }
    profileSetting.value = '';
    await saveModelSettings();
  }


  return {
    showUI,
    isAsync,
    isUpdateEra,
    modelSource,
    customModelSettings,
    profileSetting,
    getModelSettings,
    saveModelSettings,
    clearModelSettings
  };
});
