import { defineStore } from 'pinia';

export const useUiStore = defineStore('KatUI', () => {
  //是否显示UI
  const showUI = ref(false);

  // 收集的路径列表
  const collectedPaths = ref<string[]>([]);

  return {
    showUI,
    collectedPaths,
  };
});
