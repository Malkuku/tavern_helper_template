<template>
  <main class="connectivity-app">
    <div class="connectivity-content">
      <div class="connectivity-heading">
        <div class="connectivity-wifi" aria-hidden="true">ᯤ</div>
        <div>
          <span class="connectivity-eyebrow">连接诊断</span>
          <h1>准备就绪了吗？</h1>
          <p>检查运行前需要的连接与插件。</p>
        </div>
      </div>

      <div class="connectivity-summary" role="status">
        <strong>{{ summary }}</strong>
        <span>{{ lastChecked ? `上次检查 ${lastChecked}` : '打开后自动开始检查' }}</span>
        <button type="button" :disabled="checking" @click="runChecks">{{ checking ? '检查中…' : '重新检查' }}</button>
      </div>

      <section class="connectivity-section" aria-label="连接项目">
        <div v-for="item in items" :key="item.key" class="connectivity-row">
          <span class="connectivity-row-icon" :class="`icon-${item.key}`" aria-hidden="true">{{ item.icon }}</span>
          <div class="connectivity-row-copy">
            <strong>{{ item.title }}</strong>
            <small>{{ results[item.key].detail }}</small>
          </div>
          <span class="connectivity-badge" :class="`state-${results[item.key].state}`">
            {{ statusLabel(results[item.key].state) }}
          </span>
        </div>
      </section>

      <section class="connectivity-image-setting">
        <label for="connectivity-image-url">图床测试图片</label>
        <p>使用实际图片加载结果检查读取连通性。</p>
        <input id="connectivity-image-url" v-model="imageUrl" type="url" inputmode="url" spellcheck="false" />
        <button type="button" :disabled="checking" @click="runImageCheck">测试此地址</button>
        <small v-if="saveError" role="alert">{{ saveError }}</small>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';
import { checkImage, checkPromptTemplate, checkTavern, DEFAULT_IMAGE_URL, normalizeImageUrl } from './checks';
import type { CheckState } from './checks';

const emit = defineEmits<{ checked: [] }>();
type CheckKey = 'tavern' | 'template' | 'image';
type ViewResult = { state: CheckState; detail: string };
const items: { key: CheckKey; title: string; icon: string }[] = [
  { key: 'tavern', title: '酒馆宿主', icon: '⌁' },
  { key: 'template', title: '提示词模板', icon: '✦' },
  { key: 'image', title: '图床图片', icon: '▧' },
];
const results = reactive<Record<CheckKey, ViewResult>>({
  tavern: { state: 'idle', detail: '等待检查' },
  template: { state: 'idle', detail: '等待检查' },
  image: { state: 'idle', detail: '等待检查' },
});
const imageUrl = ref(DEFAULT_IMAGE_URL);
const saveError = ref('');
const lastChecked = ref('');
const checking = ref(false);
let runId = 0;

const summary = computed(() => {
  if (checking.value) return '正在检查连接';
  const passed = items.filter(item => results[item.key].state === 'ok').length;
  return lastChecked.value ? `${passed} / ${items.length} 项可用` : '等待首次检查';
});

function statusLabel(state: CheckState): string {
  return { idle: '待检查', checking: '检查中', ok: '可用', error: '异常' }[state];
}

async function saveImageUrl(url: string) {
  try {
    await Promise.resolve(
      updateVariablesWith(variables => ({ ...variables, magicGirlConnectivityImageUrl: url }), {
        type: 'script',
        script_id: getScriptId(),
      }),
    );
    saveError.value = '';
  } catch (error) {
    console.error('图床测试地址保存失败', error);
    saveError.value = '图片地址未保存，下次打开需要重新输入';
  }
}

async function runImageCheck() {
  const id = ++runId;
  checking.value = true;
  results.image = { state: 'checking', detail: '正在加载测试图片…' };
  try {
    const url = normalizeImageUrl(imageUrl.value);
    await saveImageUrl(url);
    const result = await checkImage(url);
    if (id === runId) results.image = result;
  } catch {
    if (id === runId) results.image = { state: 'error', detail: '请输入有效的 http 或 https 图片地址' };
  } finally {
    if (id === runId) {
      checking.value = false;
      lastChecked.value = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }
  }
}

async function runChecks() {
  const id = ++runId;
  checking.value = true;
  saveError.value = '';
  results.tavern = { state: 'checking', detail: '正在检查宿主接口…' };
  results.template = { state: 'checking', detail: '正在执行测试模板…' };
  results.image = { state: 'checking', detail: '正在加载测试图片…' };
  const imageResult = (() => {
    try {
      const url = normalizeImageUrl(imageUrl.value);
      return checkImage(url);
    } catch {
      return Promise.resolve({ state: 'error' as const, detail: '请输入有效的 http 或 https 图片地址' });
    }
  })();
  const [tavern, template, image] = await Promise.all([
    Promise.resolve(checkTavern()),
    checkPromptTemplate(),
    imageResult,
  ]);
  if (id !== runId) return;
  results.tavern = tavern;
  results.template = template;
  results.image = image;
  checking.value = false;
  lastChecked.value = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  emit('checked');
}

onMounted(() => {
  try {
    const saved: unknown = getVariables({ type: 'script', script_id: getScriptId() })?.magicGirlConnectivityImageUrl;
    if (typeof saved === 'string') imageUrl.value = normalizeImageUrl(saved);
  } catch (error) {
    console.warn('图床测试地址读取失败，使用项目默认图片', error);
  }
  void runChecks();
});
onUnmounted(() => {
  runId++;
});
</script>

<style scoped>
.connectivity-app {
  position: relative;
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  background: #f3f7fc;
  color: #1e2b3c;
}
.connectivity-content {
  padding: 72px 20px 40px;
}
.connectivity-heading {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 25px;
}
.connectivity-wifi {
  display: grid;
  place-items: center;
  flex: none;
  width: 70px;
  height: 70px;
  border-radius: 21px;
  background: linear-gradient(145deg, #48a3ff, #2164d3);
  color: white;
  box-shadow: 0 10px 25px #3679d544;
  font-size: 47px;
  line-height: 1;
}
.connectivity-eyebrow {
  color: #4d80c2;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 1px;
}
.connectivity-heading h1 {
  margin: 3px 0 4px;
  font-size: 23px;
  line-height: 1.2;
}
.connectivity-heading p,
.connectivity-image-setting p {
  margin: 0;
  color: #708096;
  font-size: 12px;
}
.connectivity-summary {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 5px 8px;
  align-items: center;
  padding: 17px;
  border-radius: 20px;
  background: #e1edfb;
}
.connectivity-summary strong {
  font-size: 18px;
}
.connectivity-summary span {
  grid-column: 1;
  color: #5f7898;
  font-size: 11px;
}
.connectivity-summary button {
  grid-column: 2;
  grid-row: 1 / 3;
}
.connectivity-summary button,
.connectivity-image-setting button {
  border: 0;
  border-radius: 12px;
  padding: 10px 13px;
  background: #3478dd;
  color: white;
  font-size: 12px;
  font-weight: 700;
}
button:disabled {
  opacity: 0.6;
  cursor: wait;
}
.connectivity-section {
  margin-top: 22px;
  overflow: hidden;
  border-radius: 20px;
  background: white;
  box-shadow: 0 5px 20px #24456b0b;
}
.connectivity-row {
  display: flex;
  align-items: center;
  gap: 11px;
  min-height: 80px;
  padding: 13px 15px;
}
.connectivity-row + .connectivity-row {
  border-top: 1px solid #edf1f5;
}
.connectivity-row-icon {
  display: grid;
  place-items: center;
  flex: none;
  width: 39px;
  height: 39px;
  border-radius: 12px;
  font-size: 24px;
}
.icon-tavern {
  background: #e8e7fa;
  color: #7567bb;
}
.icon-template {
  background: #f7e9f1;
  color: #bf699e;
}
.icon-image {
  background: #e3f4ef;
  color: #3a9c7e;
}
.connectivity-row-copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.connectivity-row-copy strong {
  font-size: 14px;
}
.connectivity-row-copy small {
  color: #708096;
  font-size: 11px;
  line-height: 1.35;
  overflow-wrap: anywhere;
}
.connectivity-badge {
  flex: none;
  align-self: flex-start;
  padding: 4px 7px;
  border-radius: 8px;
  background: #eef1f4;
  color: #6d7988;
  font-size: 10px;
  font-weight: 700;
}
.state-ok {
  background: #e1f5e9;
  color: #208652;
}
.state-error {
  background: #ffebeb;
  color: #c34747;
}
.state-checking {
  background: #e3efff;
  color: #3478dd;
}
.connectivity-image-setting {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 9px;
  margin-top: 22px;
  padding: 17px;
  border-radius: 20px;
  background: white;
}
.connectivity-image-setting label {
  font-size: 14px;
  font-weight: 700;
}
.connectivity-image-setting input {
  width: 100%;
  min-width: 0;
  padding: 11px;
  border: 1px solid #dce5f0;
  border-radius: 10px;
  color: #24354b;
  font: inherit;
  font-size: 12px;
}
.connectivity-image-setting small {
  color: #c34747;
  font-size: 11px;
}
@media (max-width: 600px) {
  .connectivity-content {
    padding-top: calc(72px + env(safe-area-inset-top));
  }
}
</style>
