import { defineStore } from 'pinia';

export const useUiStore = defineStore('ui', () => {
  //是否显示UI
  const showUI = ref(false);
  //是否为分布计算
  const isAsync = ref(false);
  //是否为分析模式
  const isUpdateEra = ref(false);

  return {
    showUI,
    isAsync,
    isUpdateEra,
  };
});
