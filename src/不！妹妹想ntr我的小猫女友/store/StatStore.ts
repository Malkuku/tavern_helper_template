// stores/statStore.js
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { getOldStatData } from '../util/messageUtil';

export const useStatStore = defineStore('stat', () => {
  // 状态数据
  const stat_data = ref<StatData>();

  const initData = ()=>{
    if(getCurrentMessageId() < getLastMessageId()-1){
      stat_data.value = stat_data.value = getOldStatData() as StatData;
    }else{
      stat_data.value = getVariables({ type: 'chat' }).stat_data as StatData;
    }
    console.log(`loading stat_data at #${getCurrentMessageId()}`,stat_data.value)
  }

  // 处理统计数据的函数
  const processStatData = (detail: { stat: StatData }) => {
    if(getCurrentMessageId() < getLastMessageId()-1){
      return;
    }else{
      stat_data.value = detail.stat;
    }
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
