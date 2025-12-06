<!-- 弹窗版本 -->
<template>
  <div v-if="visible" class="modal-overlay">
    <!-- 弹窗内容 -->
    <button @click="switchAnalyze()">切换分析模式</button>
    <button @click="emitMessageReceived()">触发酒馆的接收消息事件</button>
  </div>
</template>

<script setup lang="ts">
import { useUiStore } from './store';
import * as toastr from 'toastr';

const uiStore = useUiStore();

const visible = computed(() => uiStore.showUI);

const switchAnalyze = async () => {
  uiStore.isAsync = !uiStore.isAsync;
  if(uiStore.isAsync){
    toastr.info('已切换为分步分析模式');
  }else{
    toastr.info('已切换为同步分析模式');
  }
}

const emitMessageReceived = () => {
  eventEmit(tavern_events.MESSAGE_RECEIVED,  getLastMessageId())
}

</script>

<style scoped>
</style>
