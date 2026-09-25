<template>
  <div class="control-center" @pointerdown="startSwipe" @pointerup="endSwipe">
    <button class="control-grabber" type="button" aria-label="关闭控制中心" @click="emit('close')">
      <span></span>
    </button>
    <div class="control-time">
      {{ time }}<small>{{ dateLabel }}</small>
    </div>
    <div class="control-grid">
      <div class="connectivity-card">
        <button
          v-for="toggle in connectivity"
          :key="toggle.key"
          class="round-control"
          :class="{ enabled: controls[toggle.key] }"
          type="button"
          :aria-pressed="controls[toggle.key]"
          @click="controls[toggle.key] = !controls[toggle.key]"
        >
          <span>{{ toggle.icon }}</span
          ><small>{{ toggle.label }}</small>
        </button>
      </div>
      <button
        class="control-card"
        type="button"
        :aria-pressed="controls.focus"
        @click="controls.focus = !controls.focus"
      >
        <span>☾</span><small>专注模式 {{ controls.focus ? '开' : '关' }}</small>
      </button>
      <label class="slider-card"
        ><span>☀</span
        ><input :value="brightness" type="range" min="20" max="100" aria-label="亮度" @input="updateBrightness" /><small
          >亮度 {{ brightness }}%</small
        ></label
      >
      <label class="slider-card"
        ><span>♫</span><input v-model.number="volume" type="range" min="0" max="100" aria-label="音量" /><small
          >音量 {{ volume }}%</small
        ></label
      >
      <button
        class="control-card"
        type="button"
        :aria-pressed="controls.rotation"
        @click="controls.rotation = !controls.rotation"
      >
        <span>⟳</span><small>旋转锁定 {{ controls.rotation ? '开' : '关' }}</small>
      </button>
      <button
        class="control-card"
        type="button"
        :aria-pressed="controls.flashlight"
        @click="controls.flashlight = !controls.flashlight"
      >
        <span>✦</span><small>手电筒 {{ controls.flashlight ? '开' : '关' }}</small>
      </button>
    </div>
    <button class="power-off" type="button" @click="emit('powerOff')">退出手机界面</button>
  </div>
</template>

<script setup lang="ts">
import { controls, volume } from './controlState';

defineProps<{ time: string; dateLabel: string; brightness: number }>();
const emit = defineEmits<{ close: []; powerOff: []; 'update:brightness': [value: number] }>();
const connectivity = [
  { key: 'airplane', icon: '✈', label: '飞行模式' },
  { key: 'cellular', icon: '▂', label: '蜂窝网络' },
  { key: 'wifi', icon: 'ᯤ', label: '无线网络' },
  { key: 'bluetooth', icon: 'ᛒ', label: '蓝牙' },
] as const;
let swipeStart = 0;
function startSwipe(event: PointerEvent) {
  swipeStart = event.clientY;
}
function endSwipe(event: PointerEvent) {
  if (event.clientY - swipeStart < -40) emit('close');
}
function updateBrightness(event: Event) {
  emit('update:brightness', Number((event.target as HTMLInputElement).value));
}
</script>
