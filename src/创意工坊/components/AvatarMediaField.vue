<template>
  <div class="media-field">
    <label>头像地址<input v-model="model" placeholder="URL、/user/files/… 或上传图片" /></label>
    <div class="media-actions">
      <button type="button" @click="fileInput?.click()">上传图片</button>
      <button type="button" @click="captureScreen">截取屏幕</button>
      <button type="button" :disabled="!model" @click="previewOpen = true">预览</button>
      <button v-if="model" type="button" @click="model = ''">清除</button>
    </div>
    <input ref="fileInput" class="file-input" type="file" accept="image/*" @change="readFile" />
    <small>{{ status || '支持图片文件、网络地址、SillyTavern 本地资源路径；上传与截图会保存为内嵌图片。' }}</small>
    <AppDialog :open="previewOpen" title="头像预览" @cancel="previewOpen = false">
      <div class="preview">
        <img v-if="model" :src="model" alt="头像预览" @error="status = '当前地址无法加载，请检查路径或权限。'" />
      </div>
    </AppDialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import AppDialog from './AppDialog.vue';

const model = defineModel<string>({ required: true });
const fileInput = ref<HTMLInputElement>();
const previewOpen = ref(false);
const status = ref('');

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
    model.value = await fileToDataUrl(file);
    status.value = `已载入 ${file.name}，保存角色后写入资产。`;
    previewOpen.value = true;
  } catch (cause) {
    status.value = cause instanceof Error ? cause.message : String(cause);
  } finally {
    input.value = '';
  }
}

async function captureScreen() {
  let stream: MediaStream | undefined;
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    const video = document.createElement('video');
    video.srcObject = stream;
    video.muted = true;
    await video.play();
    await new Promise<void>(resolve => {
      if (video.readyState >= 2) resolve();
      else video.onloadeddata = () => resolve();
    });
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    model.value = canvas.toDataURL('image/png');
    status.value = '屏幕截图已载入；可先预览，再保存角色。';
    previewOpen.value = true;
  } catch (cause) {
    status.value =
      cause instanceof Error && cause.name === 'NotAllowedError'
        ? '已取消屏幕截图。'
        : `截图失败：${cause instanceof Error ? cause.message : String(cause)}`;
  } finally {
    stream?.getTracks().forEach(track => track.stop());
  }
}
</script>

<style scoped>
.media-field {
  display: grid;
  gap: 7px;
}
.media-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
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
small {
  color: #9d9689;
}
</style>
