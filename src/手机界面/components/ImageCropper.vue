<template>
  <div class="image-crop-backdrop" role="presentation">
    <section class="image-crop-dialog" role="dialog" aria-modal="true" aria-label="裁剪图片">
      <header>
        <strong>裁剪图片</strong
        ><button type="button" aria-label="取消裁剪" :disabled="busy" @click="finishImageCrop(null)">×</button>
      </header>
      <p>拖动图片调整位置，滑动缩放{{ request.squareAvatar ? '。' : '；也可以直接使用原图。' }}</p>
      <div v-if="!request.squareAvatar" class="image-crop-aspects" aria-label="裁剪比例">
        <button
          v-for="option in aspects"
          :key="option.value"
          type="button"
          :aria-pressed="aspect === option.value"
          :disabled="busy"
          @click="setAspect(option.value)"
        >
          {{ option.label }}
        </button>
      </div>
      <div
        class="image-crop-frame"
        :style="{ width: `${frameWidth}px`, height: `${frameHeight}px` }"
        @pointerdown="startMove"
        @pointermove="moveImage"
        @pointerup="stopMove"
        @pointercancel="stopMove"
        @wheel.prevent="changeZoom($event.deltaY)"
      >
        <img
          :src="source"
          alt="待裁剪图片"
          draggable="false"
          :style="imageStyle"
          @load="loadImage"
          @error="error = '图片无法读取。'"
        />
      </div>
      <label class="image-crop-zoom"
        >缩放 <input v-model.number="zoom" type="range" min="1" max="4" step="0.01" :disabled="busy"
      /></label>
      <p v-if="error" class="image-crop-error" role="alert">{{ error }}</p>
      <footer>
        <button type="button" :disabled="busy" @click="finishImageCrop(null)">取消</button>
        <button
          v-if="!request.squareAvatar"
          type="button"
          :disabled="!imageWidth || busy"
          @click="finishImageCrop(request.file)"
        >
          使用原图
        </button>
        <button type="button" :disabled="!imageWidth || busy" @click="confirmCrop">
          {{ busy ? '处理中…' : '应用裁剪' }}
        </button>
      </footer>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue';
import { cropGeometry, finishImageCrop, type CropAspect, type ImageCropRequest } from '../imageCrop';

const props = defineProps<{ request: ImageCropRequest }>();
const aspects: { value: CropAspect; label: string }[] = [
  { value: 'original', label: '原比例' },
  { value: 'square', label: '方形' },
  { value: 'landscape', label: '横向' },
  { value: 'wallpaper', label: '壁纸' },
];
const source = URL.createObjectURL(props.request.file);
onUnmounted(() => URL.revokeObjectURL(source));
const aspect = ref<CropAspect>(props.request.aspect);
const imageWidth = ref(0);
const imageHeight = ref(0);
const zoom = ref(1);
const offsetX = ref(0);
const offsetY = ref(0);
const error = ref('');
const busy = ref(false);
const viewportWidth = ref(window.innerWidth);
const viewportHeight = ref(window.innerHeight);
function resize() {
  viewportWidth.value = window.innerWidth;
  viewportHeight.value = window.innerHeight;
}
window.addEventListener('resize', resize);
onUnmounted(() => window.removeEventListener('resize', resize));
const ratio = computed(() => {
  if (aspect.value === 'square') return 1;
  if (aspect.value === 'landscape') return 4 / 3;
  if (aspect.value === 'wallpaper') return 9 / 16;
  return imageWidth.value && imageHeight.value ? imageWidth.value / imageHeight.value : 1;
});
const frameWidth = computed(() =>
  Math.max(80, Math.min(320, viewportWidth.value - 64, viewportHeight.value * 0.42 * ratio.value)),
);
const frameHeight = computed(() => frameWidth.value / ratio.value);
const geometry = computed(() =>
  imageWidth.value && imageHeight.value
    ? cropGeometry(
        imageWidth.value,
        imageHeight.value,
        frameWidth.value,
        frameHeight.value,
        zoom.value,
        offsetX.value,
        offsetY.value,
      )
    : null,
);
const imageStyle = computed(() =>
  geometry.value
    ? {
        width: `${geometry.value.displayWidth}px`,
        height: `${geometry.value.displayHeight}px`,
        left: `${geometry.value.left}px`,
        top: `${geometry.value.top}px`,
      }
    : {},
);
function loadImage(event: Event) {
  const image = event.target as HTMLImageElement;
  imageWidth.value = image.naturalWidth;
  imageHeight.value = image.naturalHeight;
  if (!imageWidth.value || !imageHeight.value) error.value = '图片无法读取。';
}
function setAspect(next: CropAspect) {
  aspect.value = next;
  zoom.value = 1;
  offsetX.value = 0;
  offsetY.value = 0;
}
let start: { x: number; y: number; offsetX: number; offsetY: number } | null = null;
function startMove(event: PointerEvent) {
  if (!geometry.value || busy.value) return;
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  start = { x: event.clientX, y: event.clientY, offsetX: geometry.value.offsetX, offsetY: geometry.value.offsetY };
}
function moveImage(event: PointerEvent) {
  if (!start) return;
  offsetX.value = start.offsetX + event.clientX - start.x;
  offsetY.value = start.offsetY + event.clientY - start.y;
}
function stopMove() {
  start = null;
}
function changeZoom(delta: number) {
  if (busy.value) return;
  zoom.value = Math.max(1, Math.min(4, zoom.value + (delta < 0 ? 0.1 : -0.1)));
}
async function confirmCrop() {
  const rect = geometry.value;
  if (!rect || busy.value) return;
  busy.value = true;
  error.value = '';
  try {
    const image = new Image();
    image.src = source;
    await image.decode();
    const factor = Math.min(1, 2048 / Math.max(rect.sourceWidth, rect.sourceHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(rect.sourceWidth * factor));
    canvas.height = Math.max(1, Math.round(rect.sourceHeight * factor));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('无法创建裁剪画布。');
    context.drawImage(
      image,
      rect.sourceX,
      rect.sourceY,
      rect.sourceWidth,
      rect.sourceHeight,
      0,
      0,
      canvas.width,
      canvas.height,
    );
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(value => (value ? resolve(value) : reject(new Error('图片裁剪失败。'))), 'image/png'),
    );
    finishImageCrop(new File([blob], props.request.file.name.replace(/\.[^.]+$/, '') + '.png', { type: 'image/png' }));
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '图片裁剪失败。';
  } finally {
    busy.value = false;
  }
}
</script>

<style scoped>
.image-crop-backdrop {
  position: fixed;
  inset: 0;
  z-index: 10010;
  display: grid;
  place-items: center;
  padding: 12px;
  background: #101422b8;
  pointer-events: auto;
}
.image-crop-dialog {
  box-sizing: border-box;
  display: grid;
  justify-items: center;
  gap: 12px;
  width: min(420px, 100%);
  max-height: calc(100dvh - 24px);
  overflow: auto;
  padding: 16px;
  border: 1px solid #6977ad;
  border-radius: 18px;
  background: #20283e;
  color: #f7f7ff;
  box-shadow: 0 20px 60px #0008;
}
.image-crop-dialog header,
.image-crop-dialog footer,
.image-crop-aspects {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  width: 100%;
}
.image-crop-dialog header strong {
  font-size: 17px;
}
.image-crop-dialog p {
  margin: 0;
  color: #c7cee5;
  font-size: 12px;
  text-align: center;
}
.image-crop-dialog button {
  min-height: 34px;
  padding: 4px 9px;
  border: 1px solid #6977ad;
  border-radius: 9px;
  background: #303b59;
  color: #fff;
  font-size: 12px;
}
.image-crop-dialog button[aria-pressed='true'],
.image-crop-dialog footer button:last-child {
  background: #6579c9;
}
.image-crop-dialog button:disabled {
  opacity: 0.5;
}
.image-crop-dialog header button {
  min-width: 34px;
  font-size: 20px;
}
.image-crop-frame {
  position: relative;
  flex: none;
  overflow: hidden;
  border: 2px solid #b1bfff;
  border-radius: 6px;
  background: repeating-conic-gradient(#555b70 0% 25%, #777e92 0% 50%) 50% / 20px 20px;
  touch-action: none;
  cursor: grab;
}
.image-crop-frame:active {
  cursor: grabbing;
}
.image-crop-frame img {
  position: absolute;
  max-width: none;
  user-select: none;
  pointer-events: none;
}
.image-crop-zoom {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  font-size: 12px;
}
.image-crop-zoom input {
  flex: 1;
}
.image-crop-error {
  color: #ffb7c4 !important;
}
</style>
