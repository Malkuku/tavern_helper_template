import { reactive, ref } from 'vue';

// 控制中心会随手机壳卸载，演示设置在脚本生命周期内保留。
export const volume = ref(50);
export const controls = reactive({
  wifi: true,
  bluetooth: true,
  airplane: false,
  cellular: true,
  focus: false,
  rotation: false,
  flashlight: false,
});
