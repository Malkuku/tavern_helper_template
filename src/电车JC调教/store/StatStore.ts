// stores/statStore.js
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { getOldStatData } from '../util/messageUtil';
import { StatData } from '../types/StatData';

export const useStatStore = defineStore('stat', () => {
  // 状态数据
  const stat_data = ref<StatData>();
  const initData = async () => {
    if (getCurrentMessageId() < getLastMessageId() - 10) {
      console.log(`正在加载位于第${getCurrentMessageId()}楼层的旧数据`);
      console.log('楼层过深,停止加载');
      return;
    }
    await getOldStatData();
  }

  // 处理统计数据的函数
  const processStatData = (detail:{ result:{message_id:number,stat: StatData }}) => {
    console.log(`Stat data updated at ${detail.result.message_id} and current messageId is ${getCurrentMessageId()}`);
    if(getCurrentMessageId() == detail.result.message_id){
      stat_data.value = detail.result.stat;
      console.log(`Stat data loaded at ${getCurrentMessageId()}:`, stat_data.value);
    }
  };

  // 注册事件监听器
  const registerListener = () => {
    eventOn('era:queryResult', processStatData);
  };

  return {
    stat_data,
    initData,
    registerListener,
  };
});
