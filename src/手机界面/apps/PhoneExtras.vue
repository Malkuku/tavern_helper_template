<template>
  <main class="app-screen utility-screen">
    <h1>{{ app }}</h1>
    <template v-if="app === '信息'">
      <p>草稿</p>
      <input v-model="recipient" class="utility-input" placeholder="收件人" aria-label="收件人" />
      <textarea v-model="message" class="utility-input" placeholder="输入内容" aria-label="短信内容"></textarea>
      <button class="utility-action" type="button" @click="saveDraft">保存草稿</button>
      <p v-if="notice" role="status">{{ notice }}</p>
    </template>
    <template v-else-if="app === '地图'">
      <div class="map-preview">
        <span>⌖</span><strong>{{ world?.地图索引 || '未知区域' }}</strong>
      </div>
      <p>当前位置：{{ world?.地点 || '未设置' }}</p>
    </template>
    <template v-else-if="app === '照片' || app === '相机'">
      <label class="utility-action file-picker"
        >{{ app === '相机' ? '拍照或选取图片' : '添加照片'
        }}<input type="file" accept="image/*" :capture="app === '相机' ? 'environment' : undefined" @change="addPhoto"
      /></label>
      <p v-if="notice" role="status">{{ notice }}</p>
      <div class="photo-grid">
        <button v-for="photo in photos" :key="photo.id" type="button" @click="selectedPhoto = photo">
          <img :src="photo.data" :alt="photo.name" />
        </button>
      </div>
      <p v-if="!photos.length">相册中还没有照片</p>
      <div v-if="selectedPhoto" class="photo-detail">
        <img :src="selectedPhoto.data" :alt="selectedPhoto.name" />
        <p>{{ selectedPhoto.name }}</p>
        <button type="button" @click="deletePhoto(selectedPhoto.id)">删除照片</button
        ><button type="button" @click="selectedPhoto = null">关闭</button>
      </div>
    </template>
    <template v-else-if="app === '浏览器'">
      <form @submit.prevent="visit">
        <input
          v-model="address"
          class="utility-input"
          aria-label="网址"
          placeholder="输入网址，例如 example.com"
        /><button class="utility-action" type="submit">打开网页</button>
      </form>
      <p v-if="notice" role="status">{{ notice }}</p>
    </template>
    <template v-else-if="app === '音乐'">
      <label class="utility-action file-picker"
        >选择歌曲<input type="file" accept="audio/*" @change="chooseAudio"
      /></label>
      <p v-if="audioName">{{ audioName }}</p>
      <audio v-if="audioUrl" :src="audioUrl" controls></audio>
    </template>
    <template v-else-if="app === '文件'">
      <h2>本机内容</h2>
      <p>备忘录：{{ noteCount }} 条</p>
      <p>照片：{{ photos.length }} 张</p>
    </template>
    <template v-else-if="app === '设置'">
      <h2>关于这部手机</h2>
      <p>时间：{{ world?.时间 || '未设置' }}</p>
      <p>当前地点：{{ world?.地点 || '未设置' }}</p>
      <p>亮度和连接开关可在控制中心调整。</p>
      <h2>桌面壁纸</h2>
      <div class="wallpaper-setting-preview" :style="wallpaper ? { backgroundImage: `url('${wallpaper}')` } : {}"></div>
      <label class="utility-action file-picker"
        >选择图片
        <input type="file" accept="image/*" :disabled="wallpaperBusy" @change="changeWallpaper" />
      </label>
      <button v-if="wallpaper" class="utility-action" type="button" :disabled="wallpaperBusy" @click="resetWallpaper">
        恢复默认壁纸
      </button>
      <p v-if="notice" role="status">{{ notice }}</p>
    </template>
  </main>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue';
import { useMagicGirlStatStore } from '../store/StatStore';
import { readPhoneWallpaper, savePhoneWallpaper, uploadPhoneWallpaper } from '../wallpaper';

defineProps<{ app: string }>();
const emit = defineEmits<{ wallpaperChanged: [path: string] }>();
const store = useMagicGirlStatStore();
const world = computed(() => store.statData?.世界);
type Photo = { id: string; name: string; data: string };
function scriptValue(key: string): unknown {
  try {
    return getVariables({ type: 'script', script_id: getScriptId() })?.[key];
  } catch (error) {
    console.error('手机脚本变量读取失败', error);
    return null;
  }
}
function saveValue(key: string, value: unknown) {
  updateVariablesWith(variables => ({ ...variables, [key]: value }), { type: 'script', script_id: getScriptId() });
}
const draft = scriptValue('magicGirlPhoneMessageDraft');
const recipient = ref(typeof draft === 'object' && draft && 'recipient' in draft ? String(draft.recipient) : '');
const message = ref(typeof draft === 'object' && draft && 'message' in draft ? String(draft.message) : '');
const notice = ref('');
const wallpaper = ref('');
const wallpaperBusy = ref(false);
try {
  wallpaper.value = readPhoneWallpaper();
} catch (error) {
  console.error('壁纸读取失败', error);
  notice.value = '壁纸读取失败';
}
async function changeWallpaper(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  wallpaperBusy.value = true;
  try {
    const path = await uploadPhoneWallpaper(file);
    savePhoneWallpaper(path);
    wallpaper.value = path;
    emit('wallpaperChanged', path);
    notice.value = '壁纸已保存';
  } catch (error) {
    console.error('壁纸保存失败', error);
    notice.value = error instanceof Error ? error.message : '壁纸保存失败';
  } finally {
    wallpaperBusy.value = false;
    input.value = '';
  }
}
function resetWallpaper() {
  try {
    savePhoneWallpaper('');
    wallpaper.value = '';
    emit('wallpaperChanged', '');
    notice.value = '已恢复默认壁纸';
  } catch (error) {
    console.error('壁纸恢复失败', error);
    notice.value = '恢复默认壁纸失败';
  }
}
function saveDraft() {
  try {
    saveValue('magicGirlPhoneMessageDraft', { recipient: recipient.value, message: message.value });
    notice.value = '草稿已保存';
  } catch (error) {
    console.error('短信草稿保存失败', error);
    notice.value = '保存失败';
  }
}
const savedPhotos = scriptValue('magicGirlPhonePhotos');
const photos = ref<Photo[]>(
  Array.isArray(savedPhotos)
    ? savedPhotos.filter(
        (item): item is Photo =>
          typeof item?.id === 'string' &&
          typeof item?.name === 'string' &&
          typeof item?.data === 'string' &&
          item.data.startsWith('data:image/'),
      )
    : [],
);
const selectedPhoto = ref<Photo | null>(null);
function addPhoto(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  if (!file.type.startsWith('image/') || file.size > 2 * 1024 * 1024) {
    notice.value = '请选择不超过 2 MB 的图片';
    input.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result !== 'string') return;
    const next = [{ id: crypto.randomUUID(), name: file.name, data: reader.result }, ...photos.value];
    try {
      saveValue('magicGirlPhonePhotos', next);
      photos.value = next;
      notice.value = '照片已保存';
    } catch (error) {
      console.error('照片保存失败', error);
      notice.value = '照片保存失败';
    }
    input.value = '';
  };
  reader.onerror = () => {
    notice.value = '图片读取失败';
    input.value = '';
  };
  reader.readAsDataURL(file);
}
function deletePhoto(id: string) {
  const next = photos.value.filter(photo => photo.id !== id);
  try {
    saveValue('magicGirlPhonePhotos', next);
    photos.value = next;
    selectedPhoto.value = null;
  } catch (error) {
    console.error('照片删除失败', error);
    notice.value = '删除失败';
  }
}
const rawNotes = scriptValue('magicGirlPhoneNotes');
const noteCount = Array.isArray(rawNotes) ? rawNotes.length : 0;
const address = ref('');
function visit() {
  const input = address.value.trim();
  try {
    const url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('无效协议');
    window.open(url.href, '_blank', 'noopener,noreferrer');
    notice.value = `已尝试在新窗口打开 ${url.hostname}`;
  } catch {
    notice.value = '请输入有效网址';
  }
}
const audioName = ref('');
const audioUrl = ref('');
function chooseAudio(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file || !file.type.startsWith('audio/')) return;
  if (audioUrl.value) URL.revokeObjectURL(audioUrl.value);
  audioName.value = file.name;
  audioUrl.value = URL.createObjectURL(file);
}
onUnmounted(() => {
  if (audioUrl.value) URL.revokeObjectURL(audioUrl.value);
});
</script>
