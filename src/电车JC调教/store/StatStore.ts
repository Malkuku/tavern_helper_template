// stores/statStore.js
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { getOldStatData } from '../util/messageUtil';
import { StatData } from '../types/StatData';

export const useStatStore = defineStore('stat', () => {
  // 状态数据
  const stat_data = ref<StatData>();
  const initData = ()=>{
    if(getCurrentMessageId() < getLastMessageId()-10){
      console.log(`正在加载位于第${getCurrentMessageId()}楼层的旧数据`);
      console.log('楼层过深,停止加载');
      return;
    }
    if(getCurrentMessageId() < getLastMessageId()-1){
      getOldStatData();
    }else{
      stat_data.value = getVariables({ type: 'chat' }).stat_data as StatData;
    }
    console.log(`loading stat_data at #${getCurrentMessageId()}`,stat_data.value)
  }

  // 处理统计数据的函数
  const processStatData = (detail: { stat: StatData }) => {
    if(getCurrentMessageId() >= getLastMessageId()-1){
      stat_data.value = detail.stat;
      toastr.success('已获取最新数据');
      console.log(`Stat data updated at ${getCurrentMessageId()}: `, stat_data.value);
    }
  };

  // 处理统计数据的函数
  const queryResult = (detail:{ result:{stat: StatData }}) => {
    if(getCurrentMessageId() < getLastMessageId()-1){
      stat_data.value = detail.result.stat;
      console.log(`Stat data loaded at ${getCurrentMessageId()}:`, stat_data.value);
    }
  };

  // 注册事件监听器
  const registerListener = () => {
    eventOn('era:writeDone', processStatData);
    eventOn('era:queryResult',queryResult)
  };

  return {
    stat_data,
    initData,
    registerListener,
  };
});
