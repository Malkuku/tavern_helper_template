<template>
  <div class="workshop-root" :class="{ expanded: !collapsed }">
    <button v-if="collapsed" ref="launcher" class="launcher" title="打开尘史创意工坊（可拖拽）" @click="openWorkshop">
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path d="M15 48c9-3 14-10 17-21 3 11 8 18 17 21M20 19c7-5 17-5 24 0l-5 25H25l-5-25Z" />
        <path d="M25 26h14M27 33h10M29 40h6" />
      </svg>
      <span class="sr-only">打开尘史创意工坊</span>
    </button>
    <main v-else class="shell">
      <header>
        <div>
          <p class="eyebrow">DUST-LADEN WORKSHOP</p>
          <h1>尘史创意工坊</h1>
        </div>
        <nav>
          <button :class="{ active: workspace === 'user' }" @click="switchWorkspace('user')">用户工作区</button
          ><button :class="{ active: workspace === 'developer' }" @click="switchWorkspace('developer')">
            开发者工作区
          </button>
        </nav>
        <div class="row">
          <span class="connection">● {{ source ? '主世界书已连接' : '等待连接' }}</span
          ><button :disabled="busy" @click="requestLoss('重新读取', load)">重新读取</button
          ><button @click="requestLoss('收起工作坊', () => (collapsed = true))">收起</button>
        </div>
      </header>
      <section v-if="busy && !source" class="state">
        <h2>正在读取主世界书</h2>
        <p>正在准备创意工坊数据……</p>
      </section>
      <section v-else-if="loadError && !source" class="state error" role="alert">
        <h2>无法打开工作区</h2>
        <p>{{ loadError }}</p>
        <button @click="load">重试</button>
      </section>
      <p v-if="message" class="notice" :class="{ error }" :role="error ? 'alert' : 'status'">{{ message }}</p>
      <template v-if="source && draft"
        ><UserWorkspace
          v-if="workspace === 'user'"
          :source="source"
          @changed="load"
          @message="showMessage" /><DeveloperWorkspace
          v-else
          :source="source"
          :draft="draft"
          @save="save"
          @request-reload="requestLoss('放弃草稿', load)"
      /></template>
    </main>
    <AppDialog :open="!!lossAction" title="未保存更改" cancel-label="继续编辑" @cancel="lossAction = undefined"
      ><p>{{ lossAction?.label }}将放弃 {{ dirtyCount }} 项未保存资产。此操作不可恢复。</p>
      <template #actions><button class="danger" @click="confirmLoss">放弃并继续</button></template></AppDialog
    >
  </div>
</template>
<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { cloneSource, validateDraft } from './assets/model';
import { diffSources } from './assets/presentation';
import { saveScenarioSource, serializeScenarioSource } from './assets/repository';
import AppDialog from './components/AppDialog.vue';
import DeveloperWorkspace from './components/DeveloperWorkspace.vue';
import UserWorkspace from './components/UserWorkspace.vue';
import type { ScenarioSourceBundle } from './scenario/types';
import { loadScenarioSourceFromWorldbook } from './scenario/worldbookSource';
const workspace = ref<'user' | 'developer'>('user'),
  source = ref<ScenarioSourceBundle>(),
  draft = ref<ScenarioSourceBundle>(),
  busy = ref(false),
  collapsed = ref(true),
  launcher = ref<HTMLElement>(),
  launcherDragging = ref(false),
  message = ref(''),
  error = ref(false),
  loadError = ref(''),
  lossAction = ref<{ label: string; run: () => void | Promise<void> }>();
const dirtyCount = computed(() => (source.value && draft.value ? diffSources(source.value, draft.value).length : 0));
function showMessage(v: { text: string; error?: boolean }) {
  message.value = v.text;
  error.value = !!v.error;
}
function initLauncherDrag() {
  if (!launcher.value) return;
  const button = $(launcher.value);
  if (button.data('ui-draggable')) button.draggable('destroy');
  button.draggable({
    containment: 'window',
    scroll: false,
    start: () => (launcherDragging.value = true),
    stop: () => window.setTimeout(() => (launcherDragging.value = false), 100),
  });
}
function openWorkshop() {
  if (!launcherDragging.value) collapsed.value = false;
}
async function load() {
  busy.value = true;
  message.value = '';
  loadError.value = '';
  try {
    source.value = await loadScenarioSourceFromWorldbook();
    draft.value = cloneSource(source.value);
    return true;
  } catch (c) {
    loadError.value = c instanceof Error ? c.message : String(c);
    return false;
  } finally {
    busy.value = false;
  }
}
async function save() {
  if (!draft.value) return;
  busy.value = true;
  try {
    const checked = serializeScenarioSource(cloneSource(draft.value)),
      issues = validateDraft(checked);
    await saveScenarioSource(checked);
    source.value = checked;
    draft.value = cloneSource(checked);
    showMessage({
      text: issues.length ? `已保存；${issues.length} 处缺失引用使相关剧本保持禁用。` : '资产已原子保存到主世界书。',
    });
  } catch (c) {
    showMessage({ text: c instanceof Error ? c.message : String(c), error: true });
  } finally {
    busy.value = false;
  }
}
function requestLoss(label: string, run: () => void | Promise<void>) {
  if (dirtyCount.value) lossAction.value = { label, run };
  else void run();
}
function switchWorkspace(target: 'user' | 'developer') {
  if (target === workspace.value) return;
  if (workspace.value === 'developer' && target === 'user') {
    requestLoss('切换到用户工作区', async () => {
      if (await load()) workspace.value = target;
    });
    return;
  }
  workspace.value = target;
}
async function confirmLoss() {
  const action = lossAction.value;
  lossAction.value = undefined;
  await action?.run();
}
function beforeUnload(e: BeforeUnloadEvent) {
  if (dirtyCount.value) {
    e.preventDefault();
    e.returnValue = '';
  }
}
function pageHide(e: PageTransitionEvent) {
  if (dirtyCount.value && !e.persisted) showMessage({ text: '页面正在离开，存在未保存草稿。', error: true });
}
onMounted(() => {
  void load();
  void nextTick(initLauncherDrag);
  window.addEventListener('beforeunload', beforeUnload);
  window.addEventListener('pagehide', pageHide);
});
watch(collapsed, value => {
  if (value) void nextTick(initLauncherDrag);
});
onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', beforeUnload);
  window.removeEventListener('pagehide', pageHide);
});
</script>
<style scoped lang="scss">
.workshop-root,
.workshop-root * {
  box-sizing: border-box;
}
.workshop-root {
  --bg: #0d0f10;
  --panel: #15181a;
  --raised: #1d2123;
  --text: #eee7d8;
  --muted: #b8b09f;
  --gold: #cbb477;
  --success: #72b58a;
  --warning: #d8a95d;
  --danger: #d47569;
}
.expanded {
  position: fixed;
  inset: 0;
  z-index: 10000;
  width: 100%;
  height: 100%;
}
.shell {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
  padding: 18px 18px 70px;
  color: var(--text) !important;
  font:
    14px Arial,
    sans-serif;
  background:
    radial-gradient(circle at 14% -12%, rgba(203, 180, 119, 0.13), transparent 32%),
    radial-gradient(circle at 92% 18%, rgba(78, 96, 94, 0.1), transparent 28%), var(--bg) !important;
}
.shell > header {
  padding: 10px 12px 14px;
  border-bottom: 1px solid rgba(203, 180, 119, 0.24);
}
.shell > :deep(.studio),
.shell > :deep(.workspace) {
  flex: 1;
  min-height: 0;
}
.shell > :deep(.studio) {
  overflow: hidden;
}
.shell > :deep(.workspace) {
  overflow: auto;
}
.workshop-root :deep(button),
.workshop-root :deep(input),
.workshop-root :deep(textarea),
.workshop-root :deep(select),
.workshop-root :deep(.file) {
  min-height: 36px;
  padding: 8px;
  color: var(--text) !important;
  background: var(--raised) !important;
  border: 1px solid #565a5b !important;
  border-radius: 3px;
}
.workshop-root :deep(input),
.workshop-root :deep(textarea),
.workshop-root :deep(select) {
  width: 100%;
}
.workshop-root :deep(button) {
  cursor: pointer;
  transition:
    color 0.16s ease,
    background 0.16s ease,
    border-color 0.16s ease,
    transform 0.16s ease;
}
.workshop-root :deep(button:not(:disabled):hover) {
  border-color: var(--gold) !important;
  transform: translateY(-1px);
}
.workshop-root :deep(button:focus-visible),
.workshop-root :deep(input:focus-visible),
.workshop-root :deep(textarea:focus-visible),
.workshop-root :deep(select:focus-visible) {
  outline: 2px solid #e2c987;
  outline-offset: 2px;
}
.workshop-root :deep(button.primary),
header button.active {
  color: #17130c !important;
  background: var(--gold) !important;
  border-color: var(--gold) !important;
}
.launcher {
  color: var(--gold) !important;
  background: radial-gradient(circle at 35% 28%, #343027, #090a0c 72%) !important;
  border-color: #8a7953 !important;
}
.launcher {
  width: 58px;
  height: 58px;
  min-height: 58px !important;
  padding: 10px !important;
  border-radius: 50% !important;
  box-shadow:
    0 0 0 3px #0d0f12,
    0 0 20px rgba(201, 180, 133, 0.3);
  touch-action: none;
}
.launcher svg {
  width: 100%;
  height: 100%;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
.workshop-root :deep(button:disabled) {
  opacity: 0.45;
  cursor: not-allowed;
}
.workshop-root :deep(option) {
  color: var(--text) !important;
  background: #111 !important;
}
header,
.row,
nav {
  display: flex;
  align-items: center;
  gap: 10px;
}
header {
  justify-content: space-between;
  flex-wrap: wrap;
}
h1,
p {
  margin: 0;
}
h1 {
  font:
    500 27px Georgia,
    serif;
}
.eyebrow {
  color: var(--gold);
  font-size: 10px;
  letter-spacing: 0.2em;
}
.connection {
  color: var(--success);
  font-size: 12px;
}
.notice,
.state {
  margin-top: 14px;
  padding: 14px;
  background: var(--raised);
  border-left: 3px solid var(--gold);
}
.state {
  margin: 50px auto;
  max-width: 560px;
}
.error {
  color: #f1c2bc !important;
  border-color: var(--danger) !important;
}
.danger {
  color: #f1c2bc !important;
  border-color: var(--danger) !important;
}
@media (max-width: 700px) {
  header {
    align-items: flex-start;
  }
  .shell {
    padding: 8px;
    padding-bottom: env(safe-area-inset-bottom);
  }
  .shell > header {
    padding: 4px 2px 8px;
  }
  h1 {
    font-size: 21px;
  }
  .eyebrow {
    display: none;
  }
  .connection {
    width: 10px;
    overflow: hidden;
    white-space: nowrap;
  }
}
</style>
