<template>
  <div class="workshop-root" :class="{ expanded: !collapsed }">
    <button v-if="collapsed" class="launcher" @click="collapsed = false">打开尘史创意工坊</button>
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
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
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
  collapsed = ref(false),
  message = ref(''),
  error = ref(false),
  loadError = ref(''),
  lossAction = ref<{ label: string; run: () => void | Promise<void> }>();
const dirtyCount = computed(() => (source.value && draft.value ? diffSources(source.value, draft.value).length : 0));
function showMessage(v: { text: string; error?: boolean }) {
  message.value = v.text;
  error.value = !!v.error;
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
  window.addEventListener('beforeunload', beforeUnload);
  window.addEventListener('pagehide', pageHide);
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
  width: 100vw;
  height: 100vh;
}
.shell {
  width: 100%;
  height: 100%;
  overflow: auto;
  padding: 18px 18px 70px;
  color: var(--text) !important;
  font:
    14px Arial,
    sans-serif;
  background: var(--bg) !important;
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
}
.workshop-root :deep(button:focus-visible),
.workshop-root :deep(input:focus-visible),
.workshop-root :deep(textarea:focus-visible),
.workshop-root :deep(select:focus-visible) {
  outline: 2px solid #e2c987;
  outline-offset: 2px;
}
.workshop-root :deep(button.primary),
header button.active,
.launcher {
  color: #17130c !important;
  background: var(--gold) !important;
  border-color: var(--gold) !important;
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
    padding: 10px 10px 70px;
  }
  h1 {
    font-size: 21px;
  }
  .connection {
    display: none;
  }
}
</style>
