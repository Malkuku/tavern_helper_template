<template>
  <div class="workshop-root">
    <button v-if="collapsed" class="workshop-launcher" @click="collapsed = false">打开尘史创意工坊</button>
    <main v-else class="workshop-shell">
    <header class="workshop-header">
      <div>
        <p class="eyebrow">DUST-LADEN WORKSHOP</p>
        <h1>尘史创意工坊</h1>
        <p class="lead">从当前角色世界书读取资源，校验并组装一份完整剧本。</p>
      </div>
      <div class="header-actions">
        <button class="quiet-button" :disabled="loading || applying" @click="loadSource">重新读取</button>
        <button class="quiet-button" :disabled="applying" @click="collapsed = true">收起</button>
      </div>
    </header>

    <div v-if="loading" class="notice">正在读取世界书配置……</div>
    <div v-else-if="loadError" class="notice error" role="alert">
      <strong>配置读取失败</strong>
      <pre>{{ loadError }}</pre>
    </div>

    <template v-else-if="source">
      <section class="scenario-grid" aria-label="开场白列表">
        <button
          v-for="item in scenarioList"
          :key="item.id"
          class="scenario-card"
          :class="{ selected: selectedId === item.id, unavailable: !item.data.可用 }"
          :disabled="!item.data.可用 || applying"
          @click="selectScenario(item.id)"
        >
          <span class="card-topline">
            <span>{{ item.data.author }}</span>
            <span class="availability">{{ item.data.可用 ? '可组装' : '暂不可用' }}</span>
          </span>
          <strong>{{ item.data.key }}</strong>
          <span class="description">{{ item.data.desc }}</span>
          <span v-if="item.data.自定义主角" class="custom-tag">需后续设置主角</span>
        </button>
      </section>

      <section v-if="selectedScenario" class="assembly-panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">ASSEMBLY PREVIEW</p>
            <h2>{{ selectedScenario.key }}</h2>
          </div>
          <span class="status-pill" :class="previewError ? 'failed' : 'ready'">
            {{ previewError ? '校验失败' : preview ? '组装就绪' : '等待组装' }}
          </span>
        </div>

        <div v-if="preview" class="metrics">
          <div><span>主要角色</span><strong>{{ previewMetrics.mainRoles }}</strong></div>
          <div><span>次要角色</span><strong>{{ previewMetrics.minorRoles }}</strong></div>
          <div><span>地图节点</span><strong>{{ previewMetrics.mapNodes }}</strong></div>
          <div><span>资源分类</span><strong>{{ previewMetrics.populatedCategories }}</strong></div>
        </div>

        <div v-if="previewError" class="notice error" role="alert">
          <strong>无法组装所选剧本</strong>
          <pre>{{ previewError }}</pre>
        </div>

        <div class="actions">
          <button class="quiet-button" :disabled="!preview || applying" @click="downloadPreview">导出 JSON</button>
          <button class="primary-button" :disabled="!preview || applying" @click="applyPreview">
            {{ applying ? '正在应用……' : '应用到当前聊天' }}
          </button>
        </div>

        <p v-if="applyMessage" class="apply-message" role="status">{{ applyMessage }}</p>
      </section>
    </template>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import { assembleScenario } from './scenario/assembler';
import { formatScenarioError } from './scenario/errors';
import { applyScenarioToLatestMessage, exportScenario } from './scenario/hostAdapter';
import type { AssemblyResult, JsonObject, ScenarioSourceBundle } from './scenario/types';
import { loadScenarioSourceFromWorldbook } from './scenario/worldbookSource';

const source = ref<ScenarioSourceBundle>();
const selectedId = ref('');
const preview = ref<AssemblyResult>();
const loading = ref(false);
const applying = ref(false);
const collapsed = ref(false);
const loadError = ref('');
const previewError = ref('');
const applyMessage = ref('');

const scenarioList = computed(() =>
  Object.entries(source.value?.scenarios ?? {}).map(([id, data]) => ({ id, data })),
);
const selectedScenario = computed(() => source.value?.scenarios[selectedId.value]);

function countMapNodes(map: JsonObject): number {
  return Object.values(map).reduce((total, value) => {
    const node = value as JsonObject;
    const children = (node.子地图 ?? {}) as JsonObject;
    return total + 1 + countMapNodes(children);
  }, 0);
}

const previewMetrics = computed(() => {
  const statData = preview.value?.statData;
  if (!statData) return { mainRoles: 0, minorRoles: 0, mapNodes: 0, populatedCategories: 0 };
  const categories = ['世界经济', '季节与节日', '势力', '种族', '主线', '任务', '事件'] as const;
  return {
    mainRoles: Object.keys(statData.角色.主要角色).length,
    minorRoles: Object.keys(statData.角色.次要角色).length,
    mapNodes: countMapNodes(statData.地图),
    populatedCategories: categories.filter(category => Object.keys(statData[category]).length > 0).length,
  };
});

function selectScenario(id: string): void {
  selectedId.value = id;
  preview.value = undefined;
  previewError.value = '';
  applyMessage.value = '';
  try {
    preview.value = assembleScenario(source.value as ScenarioSourceBundle, id);
  } catch (error) {
    previewError.value = formatScenarioError(error);
  }
}

async function loadSource(): Promise<void> {
  loading.value = true;
  loadError.value = '';
  previewError.value = '';
  applyMessage.value = '';
  try {
    source.value = await loadScenarioSourceFromWorldbook();
    const firstAvailable = Object.entries(source.value.scenarios).find(([, item]) => item.可用);
    if (!firstAvailable) {
      throw new Error('世界书中没有可用的开场白。');
    }
    selectScenario(firstAvailable[0]);
  } catch (error) {
    source.value = undefined;
    preview.value = undefined;
    loadError.value = formatScenarioError(error);
  } finally {
    loading.value = false;
  }
}

function downloadPreview(): void {
  if (preview.value) exportScenario(preview.value);
}

async function applyPreview(): Promise<void> {
  if (!preview.value) return;
  applying.value = true;
  applyMessage.value = '';
  try {
    await applyScenarioToLatestMessage(preview.value);
    applyMessage.value = preview.value.scenario.自定义主角
      ? '剧本已应用。请继续在尘史使徒界面完成主角设置。'
      : '剧本已应用到当前聊天。';
    toastr.success('剧本数据与开场消息已应用。');
  } catch (error) {
    applyMessage.value = formatScenarioError(error);
    toastr.error('剧本应用失败，请查看工坊中的错误详情。');
  } finally {
    applying.value = false;
  }
}

onMounted(loadSource);
</script>

<style scoped>
.workshop-root,
.workshop-root * {
  box-sizing: border-box;
}

button {
  font: inherit;
}

.workshop-shell {
  --ink: #ddd8cc;
  --muted: #999386;
  --line: rgba(199, 173, 112, 0.28);
  --gold: #c7ad70;
  --panel: rgba(18, 19, 20, 0.86);
  width: min(760px, calc(100vw - 40px));
  max-height: calc(100vh - 40px);
  padding: clamp(16px, 4vw, 36px);
  overflow-y: auto;
  color: var(--ink);
  font-family: Georgia, 'Noto Serif SC', serif;
  background:
    radial-gradient(circle at 12% 8%, rgba(144, 116, 62, 0.13), transparent 32%),
    linear-gradient(145deg, #111315, #090a0b 72%);
}

.workshop-launcher {
  padding: 10px 16px;
  color: #15130e;
  font-family: Georgia, 'Noto Serif SC', serif;
  background: #c7ad70;
  border: 1px solid #e0c98f;
  border-radius: 3px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  cursor: pointer;
}

.workshop-header,
.panel-heading,
.actions,
.header-actions,
.card-topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

h1,
h2,
p {
  margin: 0;
}

h1 {
  margin-top: 4px;
  color: #f1e6ca;
  font-size: clamp(1.65rem, 5vw, 2.5rem);
  font-weight: 500;
  letter-spacing: 0.08em;
}

h2 {
  font-size: 1.35rem;
  font-weight: 500;
}

.eyebrow {
  color: var(--gold);
  font-family: Arial, sans-serif;
  font-size: 0.68rem;
  letter-spacing: 0.24em;
}

.lead {
  margin-top: 10px;
  color: var(--muted);
  font-size: 0.92rem;
}

.scenario-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(210px, 100%), 1fr));
  gap: 12px;
  margin-top: 24px;
}

.scenario-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 17px;
  color: var(--ink);
  text-align: left;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 4px;
  cursor: pointer;
  transition: border-color 160ms ease, background 160ms ease, transform 160ms ease;
}

.scenario-card:hover:not(:disabled),
.scenario-card.selected {
  background: rgba(199, 173, 112, 0.08);
  border-color: var(--gold);
  transform: translateY(-2px);
}

.scenario-card.unavailable {
  opacity: 0.48;
  cursor: not-allowed;
}

.scenario-card strong {
  color: #f2ead8;
  font-size: 1.1rem;
  font-weight: 500;
}

.card-topline,
.description,
.custom-tag {
  color: var(--muted);
  font-family: Arial, sans-serif;
  font-size: 0.76rem;
}

.availability,
.custom-tag {
  color: var(--gold);
}

.description {
  line-height: 1.55;
}

.assembly-panel {
  margin-top: 18px;
  padding: 20px;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 4px;
}

.metrics {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-top: 18px;
}

.metrics div {
  padding: 12px;
  background: rgba(255, 255, 255, 0.025);
  border-left: 2px solid var(--line);
}

.metrics span,
.metrics strong {
  display: block;
}

.metrics span {
  color: var(--muted);
  font-family: Arial, sans-serif;
  font-size: 0.72rem;
}

.metrics strong {
  margin-top: 5px;
  color: #f1e6ca;
  font-size: 1.25rem;
}

.status-pill {
  padding: 5px 9px;
  font-family: Arial, sans-serif;
  font-size: 0.72rem;
  border: 1px solid;
  border-radius: 999px;
}

.status-pill.ready {
  color: #a8c395;
  border-color: rgba(168, 195, 149, 0.45);
}

.status-pill.failed,
.notice.error {
  color: #d99a8d;
}

.notice {
  margin-top: 20px;
  padding: 15px;
  color: var(--muted);
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.notice pre {
  margin: 8px 0 0;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
  font: 0.78rem/1.55 Consolas, monospace;
}

.actions {
  justify-content: flex-end;
  margin-top: 18px;
}

.quiet-button,
.primary-button {
  padding: 9px 15px;
  border: 1px solid var(--line);
  border-radius: 3px;
  cursor: pointer;
}

.quiet-button {
  color: var(--ink);
  background: transparent;
}

.primary-button {
  color: #15130e;
  background: var(--gold);
  border-color: var(--gold);
}

button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.apply-message {
  margin-top: 12px;
  color: var(--gold);
  font-size: 0.86rem;
  text-align: right;
}

@media (max-width: 620px) {
  .workshop-header,
  .panel-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .metrics {
    grid-template-columns: repeat(2, 1fr);
  }

  .actions {
    align-items: stretch;
    flex-direction: column-reverse;
  }
}
</style>
