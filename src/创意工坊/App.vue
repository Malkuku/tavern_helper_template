<template>
  <div class="workshop-root" :class="{ expanded: !collapsed }"><button v-if="collapsed" class="launcher" @click="collapsed=false">打开尘史创意工坊</button><main v-else class="shell">
    <header><div><p class="eyebrow">DUST-LADEN WORKSHOP</p><h1>尘史创意工坊</h1></div><nav><button :class="{active:workspace==='user'}" @click="workspace='user'">用户工作区</button><button :class="{active:workspace==='developer'}" @click="workspace='developer'">开发者工作区</button></nav><div class="row"><button :disabled="busy" @click="load">重新读取</button><button @click="collapsed=true">收起</button></div></header>
    <p v-if="busy" class="notice">正在处理……</p><p v-if="message" class="notice" :class="{error}" role="status">{{message}}</p>
    <template v-if="source&&draft"><UserWorkspace v-if="workspace==='user'" :source="source" @changed="load" @message="showMessage"/><DeveloperWorkspace v-else :source="source" :draft="draft" @save="save" @reload="load" @message="showMessage"/></template>
  </main></div>
</template>
<script setup lang="ts">
import {onMounted,ref} from 'vue'; import DeveloperWorkspace from './components/DeveloperWorkspace.vue'; import UserWorkspace from './components/UserWorkspace.vue'; import {cloneSource,validateDraft} from './assets/model'; import {saveScenarioSource,serializeScenarioSource} from './assets/repository'; import type {ScenarioSourceBundle} from './scenario/types'; import {loadScenarioSourceFromWorldbook} from './scenario/worldbookSource';
const workspace=ref<'user'|'developer'>('user'),source=ref<ScenarioSourceBundle>(),draft=ref<ScenarioSourceBundle>(),busy=ref(false),collapsed=ref(false),message=ref(''),error=ref(false);
function showMessage(v:{text:string;error?:boolean}){message.value=v.text;error.value=!!v.error} async function load(){busy.value=true;message.value='';try{source.value=await loadScenarioSourceFromWorldbook();draft.value=cloneSource(source.value)}catch(c){showMessage({text:c instanceof Error?c.message:String(c),error:true})}finally{busy.value=false}}
async function save(){if(!draft.value)return;busy.value=true;try{const checked=serializeScenarioSource(cloneSource(draft.value));const issues=validateDraft(checked);await saveScenarioSource(checked);source.value=checked;draft.value=cloneSource(checked);showMessage({text:issues.length?`已保存；${issues.length} 个缺失引用使相关剧本保持禁用。`:'资产已原子保存到当前主世界书。'})}catch(c){showMessage({text:c instanceof Error?c.message:String(c),error:true})}finally{busy.value=false}} onMounted(load);
</script>
<style scoped lang="scss">
.workshop-root,
.workshop-root * {
  box-sizing: border-box;
}

.workshop-root {
  --gold: #c7ad70;
  --ink: #e8e0ce;
  --control-bg: #222426;
  --control-border: #5a554a;
}

.workshop-root.expanded {
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
  padding: 22px;
  color: var(--ink) !important;
  font: 14px Arial, sans-serif;
  background: linear-gradient(145deg, #151719, #090a0b) !important;
  border: 1px solid #594e36 !important;
}

/* 宿主页面会注入通用表单样式，工坊控件必须保持可读的暗色配色。 */
.workshop-root :deep(button),
.workshop-root :deep(input),
.workshop-root :deep(textarea),
.workshop-root :deep(select),
.workshop-root :deep(.file) {
  color: var(--ink) !important;
  background-color: var(--control-bg) !important;
  border-color: var(--control-border) !important;
}

.workshop-root :deep(input::placeholder),
.workshop-root :deep(textarea::placeholder) {
  color: #aaa294 !important;
  opacity: 1 !important;
}

.workshop-root :deep(option) {
  color: var(--ink) !important;
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
  font: 500 28px Georgia, serif;
}

.eyebrow {
  color: var(--gold) !important;
  font-size: 10px;
  letter-spacing: 0.2em;
}

button {
  padding: 8px 12px;
  border: 1px solid var(--control-border);
  border-radius: 3px;
  cursor: pointer;
}

.workshop-root :deep(button.active),
.workshop-root :deep(button.primary),
.launcher {
  color: #17130c !important;
  background: var(--gold) !important;
  border-color: var(--gold) !important;
}

.workshop-root :deep(button:disabled) {
  opacity: 0.45 !important;
}

.notice {
  margin-top: 14px;
  padding: 10px;
  background: #222426 !important;
  border-left: 3px solid var(--gold) !important;
}

.error {
  color: #e5a197 !important;
  border-color: #b9584b !important;
}

@media (max-width: 620px) {
  header {
    align-items: flex-start;
    flex-direction: column;
  }

  .shell {
    padding: 14px;
  }
}
</style>
