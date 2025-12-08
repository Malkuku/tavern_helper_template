import { defineStore } from 'pinia';

export const useUiStore = defineStore('KatUI', () => {
  //是否显示UI
  const showUI = ref(false);

  return {
    showUI,
  };
});
