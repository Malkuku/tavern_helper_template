// stores/statStore.js
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useStatStore = defineStore('stat', () => {
  // 状态数据
  const stat_data = ref<StatData>();

  const initData = ()=>{
    const variables = getVariables({ type: 'chat' })
    stat_data.value = variables.stat_data;
    console.log('loading stat_data',stat_data.value)
  }

  // 处理统计数据的函数
  const processStatData = (detail: { stat: StatData }) => {
    //如果stat为空，不更新
    if (!detail.stat.version) return;
    stat_data.value = detail.stat;
    console.log('Stat data updated:', stat_data.value);
  };

  // 注册事件监听器
  const registerListener = () => {
    eventOn('era:writeDone', processStatData);
  };

  return {
    stat_data,
    initData,
    registerListener,
  };
});
