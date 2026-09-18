<template>
  <div class="media-field">
    <label>头像地址<input v-model="model" placeholder="URL、/user/files/… 或上传图片" /></label>
    <div class="media-actions">
      <button type="button" @click="fileInput?.click()">上传图片</button>
      <button type="button" :disabled="!model" @click="previewOpen = true">预览</button>
      <button v-if="model" type="button" @click="model = ''">清除</button>
    </div>
    <input ref="fileInput" class="file-input" type="file" accept="image/*" @change="readFile" />
    <small>{{ status || '支持图片文件、网络地址、SillyTavern 本地资源路径；上传图片可先聚焦裁剪。' }}</small>
    <AppDialog :open="cropOpen" title="聚焦裁剪头像" @cancel="cancelCrop">
      <div class="crop-editor">
        <canvas
          ref="cropCanvas"
          class="crop-canvas"
          width="512"
          height="512"
          aria-label="头像裁剪预览，可拖动图片调整焦点"
          @pointerdown="startDrag"
          @pointermove="dragImage"
          @pointerup="endDrag"
          @pointercancel="endDrag"
        />
        <label>缩放<input v-model.number="zoom" type="range" min="1" max="3" step="0.01" @input="drawCrop" /></label>
        <small>拖动图片调整展示焦点；方框内就是最终头像内容。</small>
      </div>
      <template #actions><button class="primary" @click="applyCrop">使用裁剪结果</button></template>
    </AppDialog>
    <AppDialog :open="previewOpen" title="头像预览" @cancel="previewOpen = false">
      <div class="preview">
        <img v-if="model" :src="model" alt="头像预览" @error="status = '当前地址无法加载，请检查路径或权限。'" />
      </div>
    </AppDialog>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref } from 'vue';
import AppDialog from './AppDialog.vue';

const model = defineModel<string>({ required: true });
const fileInput = ref<HTMLInputElement>();
const previewOpen = ref(false);
const cropOpen = ref(false);
const cropCanvas = ref<HTMLCanvasElement>();
const status = ref('');
const zoom = ref(1);
let cropImage: HTMLImageElement | undefined;
let offsetX = 0;
let offsetY = 0;
let dragging = false;
let pointerX = 0;
let pointerY = 0;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('无法读取图片。'));
    reader.readAsDataURL(file);
  });
}

async function readFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  try {
    const source = await fileToDataUrl(file);
    cropImage = await loadImage(source);
    zoom.value = 1;
    offsetX = 0;
    offsetY = 0;
    cropOpen.value = true;
    await nextTick();
    drawCrop();
    status.value = `已载入 ${file.name}，请调整头像焦点。`;
  } catch (cause) {
    status.value = cause instanceof Error ? cause.message : String(cause);
  } finally {
    input.value = '';
  }
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('无法载入所选图片。'));
    image.src = source;
  });
}

function cropMetrics() {
  const canvas = cropCanvas.value;
  if (!canvas || !cropImage) return;
  const baseScale = Math.max(canvas.width / cropImage.naturalWidth, canvas.height / cropImage.naturalHeight);
  const scale = baseScale * zoom.value;
  const width = cropImage.naturalWidth * scale;
  const height = cropImage.naturalHeight * scale;
  const maxX = Math.max(0, (width - canvas.width) / 2);
  const maxY = Math.max(0, (height - canvas.height) / 2);
  offsetX = Math.max(-maxX, Math.min(maxX, offsetX));
  offsetY = Math.max(-maxY, Math.min(maxY, offsetY));
  return { canvas, width, height };
}

function drawCrop() {
  const metrics = cropMetrics();
  if (!metrics || !cropImage) return;
  const context = metrics.canvas.getContext('2d');
  if (!context) return;
  context.clearRect(0, 0, metrics.canvas.width, metrics.canvas.height);
  context.drawImage(
    cropImage,
    (metrics.canvas.width - metrics.width) / 2 + offsetX,
    (metrics.canvas.height - metrics.height) / 2 + offsetY,
    metrics.width,
    metrics.height,
  );
}

function startDrag(event: PointerEvent) {
  dragging = true;
  pointerX = event.clientX;
  pointerY = event.clientY;
  (event.currentTarget as HTMLCanvasElement).setPointerCapture(event.pointerId);
}

function dragImage(event: PointerEvent) {
  if (!dragging || !cropCanvas.value) return;
  const factor = cropCanvas.value.width / cropCanvas.value.getBoundingClientRect().width;
  offsetX += (event.clientX - pointerX) * factor;
  offsetY += (event.clientY - pointerY) * factor;
  pointerX = event.clientX;
  pointerY = event.clientY;
  drawCrop();
}

function endDrag() {
  dragging = false;
}

function cancelCrop() {
  cropOpen.value = false;
  cropImage = undefined;
  status.value = '已取消裁剪，头像未更改。';
}

function applyCrop() {
  if (!cropCanvas.value) return;
  model.value = cropCanvas.value.toDataURL('image/png');
  cropOpen.value = false;
  cropImage = undefined;
  status.value = '已应用聚焦裁剪；保存角色后写入资产。';
}
</script>

<style scoped>
.media-field {
  display: grid;
  gap: 7px;
  min-width: 0;
  max-width: 100%;
}
.media-field label,
.media-field small {
  min-width: 0;
  overflow-wrap: anywhere;
}
.media-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-width: 0;
}
.media-actions button {
  min-width: 0;
}
.file-input {
  display: none;
}
.preview {
  display: grid;
  min-height: 220px;
  max-height: 60vh;
  place-items: center;
  overflow: auto;
  background: #0b0d0e;
}
.preview img {
  max-width: 100%;
  max-height: 56vh;
  object-fit: contain;
}
.crop-editor {
  display: grid;
  gap: 12px;
}
.crop-editor label {
  display: grid;
  gap: 6px;
}
.crop-canvas {
  width: min(100%, 420px);
  aspect-ratio: 1;
  justify-self: center;
  background: #0b0d0e;
  border: 1px solid #756744;
  border-radius: 10px;
  cursor: grab;
  touch-action: none;
}
.crop-canvas:active {
  cursor: grabbing;
}
small {
  color: #9d9689;
}
</style>
