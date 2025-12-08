<template>
  <div class="era-rule-panel">
    <!-- 页签导航 -->
    <div class="tabs">
      <button v-for="t of tabs" :key="t.key" :class="{ active: activeTab === t.key }" @click="activeTab = t.key">
        {{ t.label }}
      </button>
    </div>

    <!-- 1.查看数据 -->
    <section v-show="activeTab === 'data'">
      <h2>当前 stat_data（只读）</h2>
      <div class="json-tree-box">
        <!-- 监听 sendPath -->
        <json-tree :data="statData" @send-path="usePathForRule" />
      </div>
    </section>
    <!-- 2. 查看规则（默认折叠） -->
    <section v-show="activeTab === 'list'">
      <h2>规则列表</h2>
      <div v-for="(rule, key) in rules" :key="key" class="rule-card">
        <div class="rule-header" @click="toggleFold(key)">
          <span>{{ key }}</span>
          <span>{{ folded[key] ? '▶' : '▼' }}</span>
        </div>

        <div v-show="!folded[key]" class="rule-body">
          <pre>{{ JSON.stringify(rule, null, 2) }}</pre>
          <button @click="editRule(key)">编辑</button>
          <!--TODO 删除规则 -->
        </div>
      </div>
    </section>

    <!-- 3. 编辑规则（只负责新增 or 更新） -->
    <section v-show="activeTab === 'rule'">
      <h2>{{ editingKey ? '更新规则' : '新增规则' }}</h2>

      <!-- 规则名称 -->
      <div class="field">
        <label>规则名称:</label>
        <input v-model="editingKey" :disabled="!!editKeyLocked" placeholder="唯一标识，如: 好感度rule1" />
      </div>

      <!-- 其余字段与原来一致 -->
      <div class="field">
        <label>path:</label>
        <input v-model="draft.path" placeholder="角色.*.特殊状态.好感度" />
      </div>
      <div class="field">
        <label>order:</label>
        <input v-model.number="draft.order" type="number" min="0" />
      </div>
      <div class="field">
        <label>range:</label>
        <input v-model="draftRange" placeholder="[0,100]" />
      </div>
      <div class="field">
        <label>limit:</label>
        <input v-model="draftLimit" placeholder="[-5,10]" />
      </div>

      <!-- handle 区域 -->
      <div class="handle-area">
        <div>handle 运算:</div>
        <div v-for="(h, k) in draft.handle" :key="k" class="handle-item">
          <span>目标：{{ k }}</span>
          <select v-model="h.op">
            <option value="add">add</option>
            <option value="subtract">subtract</option>
            <option value="multiply">multiply</option>
            <option value="divide">divide</option>
          </select>
          <input v-model="h.path" placeholder="源路径" />
          <button @click="delHandle(k)">删</button>
        </div>
        <button @click="addHandle">+ 添加 handle</button>
      </div>

      <hr />
      <button @click="confirmSave">保存</button>
      <button @click="cancelEdit">取消</button>
    </section>

    <!-- 3. 测试模拟 -->
    <section v-show="activeTab === 'test'">
      <h2>测试模拟</h2>
      <button @click="runTest">模拟更新（不保存）</button>
      <div class="json-tree-box">
        <json-tree :data="testResult" />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useEraDataStore } from '../../stores/EraDataStore';
import { EraDataHandler } from '../../EraDataHandler/EraDataHandler';
import JsonTree from '../components/JsonTree.vue';

/* ---------- 数据 ---------- */
const statData = ref<any>({});
const rules = ref<Record<string, any>>({});
const rangeStr = ref<Record<string, string>>({});
const limitStr = ref<Record<string, string>>({});
const testResult = ref<any>();
const folded = ref<Record<string, boolean>>({}); // 折叠状态
const editingKey = ref<string>(''); // 正在编辑的规则 key
const editKeyLocked = ref<boolean>(false); // 是否锁定 key（更新时只读）
const draft = ref<any>({}); // 当前表单草稿
const draftRange = ref('');
const draftLimit = ref('');
const activeTab = ref<'data' | 'rule' | 'test' | 'list'>('data');
const tabs = [
  { key: 'data', label: '查看数据' },
  { key: 'list', label: '查看规则' }, // ← 新增
  { key: 'rule', label: '编辑规则' },
  { key: 'test', label: '测试模拟' },
] as const;

const eraStore = useEraDataStore();

/* ---------- 生命周期 ---------- */
onMounted(async () => {
  const { stat_data } = getVariables({ type: 'chat' });
  statData.value = stat_data || {};
  await eraStore.getEraDataRules();
  rules.value = eraStore.eraDataRule || {};
  initStr();
  // 默认全部折叠
  Object.keys(rules.value).forEach(k => (folded.value[k] = true));
});

/* ---------- 工具 ---------- */
function initStr() {
  Object.keys(rules.value).forEach(k => {
    const r = rules.value[k];
    if (r.range) rangeStr.value[k] = JSON.stringify(r.range);
    if (r.limit) limitStr.value[k] = JSON.stringify(r.limit);
  });
}
function toggleFold(key: string) {
  folded.value[key] = !folded.value[key];
}
function editRule(key: string) {
  // 把已有规则载入草稿
  editingKey.value = key;
  editKeyLocked.value = true;
  draft.value = JSON.parse(JSON.stringify(rules.value[key]));
  draftRange.value = JSON.stringify(draft.value.range || []);
  draftLimit.value = JSON.stringify(draft.value.limit || []);
  activeTab.value = 'rule';
}

function confirmSave() {
  // 简单校验
  if (!editingKey.value) return alert('请输入规则名称');
  try {
    draft.value.range = JSON.parse(draftRange.value);
  } catch {
    return alert('range 格式错误');
  }
  try {
    draft.value.limit = JSON.parse(draftLimit.value);
  } catch {
    return alert('limit 格式错误');
  }

  // 新增 or 覆盖
  rules.value[editingKey.value] = JSON.parse(JSON.stringify(draft.value));
  folded.value[editingKey.value] = true; // 默认折叠
  cancelEdit();
}
function cancelEdit() {
  editingKey.value = '';
  editKeyLocked.value = false;
  draft.value = {};
  draftRange.value = '';
  draftLimit.value = '';
  activeTab.value = 'list'; // 返回查看列表
}
function addHandle() {
  const k = `target_${Date.now()}`;
  draft.value.handle[k] = { op: 'add', path: '' };
}
function delHandle(k: string) {
  delete draft.value.handle[k];
}

function usePathForRule(path: string) {
  const key = `rule_${Date.now()}`;
  rules.value[key] = {
    path,
    order: 0,
    handle: {},
  };
  // 切到“编辑规则”页签方便用户继续填写
  activeTab.value = 'rule';
}

/* ---------- 测试 ---------- */
function runTest() {
  const snap = JSON.parse(JSON.stringify(statData.value));
  const clone = JSON.parse(JSON.stringify(statData.value));
  testResult.value = EraDataHandler.applyRule(clone, snap, rules.value);
}
</script>

<style scoped lang="scss">
/* 1. 让面板本身变成 flex 列，方便子元素自动占高 */
.era-rule-panel {
  display: flex;
  flex-direction: column;
  padding: 16px;
  background: #fafafa;
  font-family: sans-serif;
  color: #222;
  font-size: 12px;
  flex: 1; /* 新增：占满剩余空间 */
  min-height: 0; /* 新增：允许继续压缩 */
  overflow: auto; /* 原来就有，保留即可 */
  max-height: none; /* 把原来 400px 去掉，交给 flex 控制*/
}

/* 2. 页签本身不压缩 */
.tabs {
  flex-shrink: 0;
  margin-bottom: 12px;
  border-bottom: 1px solid #ccc;
}
.tabs button {
  margin-right: 6px;
  padding: 4px 10px;
  cursor: pointer;
  border: 1px solid #ccc;
  background: #fff;
  font-size: 12px;
}
.tabs button.active {
  border-bottom: 1px solid #fafafa;
  font-weight: bold;
}

/* ---------- 三块内容区 ---------- */
section {
  flex: 1;
  overflow: auto;
}

/* 3. JSON 展示框：占满剩余高度，并出自己的滚动条 */
.json-tree-box {
  flex: 1; /* 占满剩余空间 */
  min-height: 0; /* 关键：允许继续压缩 */
  overflow: auto; /* 内容超出时自己滚 */
  background: #fff;
  border: 1px solid #ccc;
  padding: 6px;
}

/* ---------- 规则卡片 ---------- */
.rule-card {
  margin-top: 8px;
  padding: 8px;
  background: #fff;
  border: 1px solid #ccc;
  border-radius: 3px;
}
.rule-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
}
.field {
  margin-bottom: 4px;
}
.field label {
  display: inline-block;
  width: 50px;
}

/* ---------- handle 区 ---------- */
.handle-area {
  margin-top: 6px;
}
.handle-item {
  margin: 3px 0;
}
.button {
  margin-right: 4px;
  font-size: 12px;
  padding: 2px 6px;
}
</style>
