<template>
  <div class="era-rule-panel">
    <!-- 页签导航 -->
    <div class="sticky-tabs">
      <div class="tabs-container">
        <button v-for="t of tabs" :key="t.key" :class="{ active: activeTab === t.key }" @click="activeTab = t.key">
          {{ t.label }}
        </button>
      </div>
    </div>

    <div class="content-wrapper">
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

        <!-- 空状态提示 -->
        <div v-if="Object.keys(rules).length === 0" class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z" />
          </svg>
          <p>暂无规则，从规则编辑添加或从数据面板中选择路径</p>
        </div>

        <!-- 规则列表 -->
        <div v-for="(rule, key) in rules" :key="key" class="rule-card">
          <div class="rule-header" @click="toggleFold(key)">
            <div class="rule-name-container">
              <span class="rule-name">{{ key }}</span>
              <span class="rule-status">
                <span class="status-indicator" :class="{ enabled: rule.enable !== false }"></span>
                {{ rule.enable !== false ? '启用' : '禁用' }}
              </span>
            </div>
            <div class="rule-actions">
              <span class="fold-indicator">{{ folded[key] ? '›' : '⌄' }}</span>
            </div>
          </div>

          <div v-show="!folded[key]" class="rule-body">
            <div class="rule-content">
              <pre>{{ JSON.stringify(rule, null, 2) }}</pre>
              <div class="rule-operations">
                <button class="btn primary" @click="editRule(key)">编辑</button>
                <button class="btn danger" @click="confirmDelete(key)">删除</button>
              </div>
            </div>
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

        <!-- 启用开关 -->
        <div class="field">
          <label>启用:</label>
          <div class="toggle-switch">
            <input v-model="draft.enable" type="checkbox" :true-value="true" :false-value="false" id="enableToggle" />
            <label for="enableToggle" class="toggle-label"></label>
          </div>
        </div>

        <!-- 其余字段与原来一致 -->
        <div class="field">
          <label>路径:</label>
          <input v-model="draft.path" placeholder="角色.*.特殊状态.好感度" />
        </div>
        <div class="field">
          <label>排序:</label>
          <input v-model.number="draft.order" type="number" min="0" />
        </div>
        <div class="field">
          <label>范围限制:</label>
          <input v-model="draftRange" placeholder="[0,100]" />
        </div>
        <div class="field">
          <label>变化值限制:</label>
          <input v-model="draftLimit" placeholder="[-5,10]" />
        </div>

        <!-- setIf 区域 -->
        <div class="setIf-area">
          <div class="setIf-header">
            <span>setIf 条件设置:</span>
            <button v-if="draft.setIf" class="btn small danger" @click="draft.setIf = null">删除条件</button>
          </div>
          <div v-if="draft.setIf" class="setIf-content">
            <div class="setIf-row">
              <label>判断路径:</label>
              <input v-model="draft.setIf.path" placeholder="如: 角色.张三.状态" />
            </div>
            <div class="setIf-row">
              <label>条件操作符:</label>
              <select v-model="draft.setIf.if">
                <option value="==">等于 (==)</option>
                <option value=">">大于 (&gt;)</option>
                <option value="<">小于 (&lt;)</option>
                <option value=">=">大于等于 (&ge;)</option>
                <option value="<=">小于等于 (&le;)</option>
              </select>
            </div>
            <div class="setIf-row">
              <label>比较值:</label>
              <input v-model="draft.setIf.ifValue" placeholder="如: 10" @input="parseSetIfValue" />
            </div>
            <div class="setIf-row">
              <label>设置的值:</label>
              <input v-model="draft.setIf.keyValue" placeholder="要设置的值，如: 100" @input="parseSetIfKeyValue" />
            </div>
          </div>
          <button v-else class="btn" @click="addSetIf">+ 添加 setIf 条件</button>
        </div>

        <!-- handle 区域 -->
        <div class="handle-area">
          <div>handle 运算:</div>
          <div v-for="(h, k) in draft.handle" :key="k" class="handle-item">
            <select v-model="h.op">
              <option value="add">增</option>
              <option value="subtract">减</option>
              <option value="multiply">乘</option>
              <option value="divide">除</option>
            </select>
            <input v-model="h.path" placeholder="源路径: handle.path[op]this.path" />
            <button class="btn danger" @click="delHandle(k as any)">删除</button>
          </div>
          <button class="btn" @click="addHandle">+ 添加 handle</button>
        </div>

        <hr />
        <div class="button-group">
          <button class="btn primary" @click="confirmSave">保存</button>
          <button class="btn" @click="cancelEdit">取消</button>
        </div>
      </section>

      <!-- 4. 测试模拟 -->
      <section v-show="activeTab === 'test'">
        <h2>测试模拟</h2>
        <button class="btn primary" @click="runTest">模拟更新（不保存）</button>
        <div class="json-tree-box">
          <json-tree :data="testResult" />
        </div>
      </section>
    </div>

    <!-- 删除确认对话框 -->
    <div v-if="showDeleteConfirm" class="modal-overlay">
      <div class="modal">
        <h3>确认删除</h3>
        <p>确定要删除规则 "{{ deletingKey }}" 吗？此操作不可恢复。</p>
        <div class="modal-actions">
          <button class="btn danger" @click="executeDelete">确认删除</button>
          <button class="btn" @click="cancelDelete">取消</button>
        </div>
      </div>
    </div>
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
const draft = ref<any>({
  enable: true, // 默认启用
  path: '',
  order: 0,
  handle: {},
  setIf: null // 默认无setIf条件
}); // 当前表单草稿
const draftRange = ref('');
const draftLimit = ref('');
const activeTab = ref<'data' | 'rule' | 'test' | 'list'>('data');
const showDeleteConfirm = ref(false); // 删除确认对话框显示状态
const deletingKey = ref<string>(''); // 待删除的规则 key
const message = ref<{text: string, type: 'success' | 'error' | 'warning'} | null>(null); // 消息提示

const tabs = [
  { key: 'data', label: '查看数据' },
  { key: 'list', label: '查看规则' },
  { key: 'rule', label: '编辑规则' },
  { key: 'test', label: '测试模拟' },
] as const;

const eraStore = useEraDataStore();

/* ---------- 生命周期 ---------- */
onMounted(async () => {
  const { stat_data } = getVariables({ type: 'chat' });
  statData.value = stat_data || {};
  await loadRules();
  initStr();
  // 默认全部折叠
  Object.keys(rules.value).forEach(k => (folded.value[k] = true));
});

/* ---------- 工具 ---------- */
async function loadRules() {
  try {
    await eraStore.getEraDataRules();
    rules.value = eraStore.eraDataRule || {};
    showMessage('规则加载成功', 'success');
  } catch (error) {
    showMessage('规则加载失败: ' + error, 'error');
  }
}

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

  // 确保enable字段存在（兼容旧规则）
  if (draft.value.enable === undefined) {
    draft.value.enable = true;
  }

  draftRange.value = JSON.stringify(draft.value.range || []);
  draftLimit.value = JSON.stringify(draft.value.limit || []);
  activeTab.value = 'rule';
}

function confirmSave() {
  // 简单校验
  if (!editingKey.value) {
    showMessage('请输入规则名称', 'error');
    return;
  }

  try {
    draft.value.range = draftRange.value ? JSON.parse(draftRange.value) : [];
  } catch {
    showMessage('range 格式错误', 'error');
    return;
  }

  try {
    draft.value.limit = draftLimit.value ? JSON.parse(draftLimit.value) : [];
  } catch {
    showMessage('limit 格式错误', 'error');
    return;
  }

  // 处理setIf中的数值类型
  if (draft.value.setIf) {
    // 确保setIf.ifValue和setIf.keyValue是正确类型
    const ifValue = draft.value.setIf.ifValue;
    const keyValue = draft.value.setIf.keyValue;

    if (!isNaN(ifValue) && ifValue !== '') {
      draft.value.setIf.ifValue = Number(ifValue);
    }

    if (!isNaN(keyValue) && keyValue !== '') {
      draft.value.setIf.keyValue = Number(keyValue);
    }
  }

  // 新增 or 覆盖
  rules.value[editingKey.value] = JSON.parse(JSON.stringify(draft.value));
  folded.value[editingKey.value] = true; // 默认折叠

  // 保存到 store
  saveRules();

  showMessage(`规则 "${editingKey.value}" ${editKeyLocked.value ? '更新' : '添加'}成功`, 'success');
  cancelEdit();
}

async function saveRules() {
  try {
    // 更新 store 中的规则
    eraStore.eraDataRule = { ...rules.value };
    // 如果有保存到后端的逻辑，可以在这里调用
    // await eraStore.saveEraDataRules();
  } catch (error) {
    showMessage('保存失败: ' + error, 'error');
  }
}

function cancelEdit() {
  editingKey.value = '';
  editKeyLocked.value = false;
  draft.value = {
    enable: true,
    path: '',
    order: 0,
    handle: {},
    setIf: null
  };
  draftRange.value = '';
  draftLimit.value = '';
  activeTab.value = 'list'; // 返回查看列表
}

function addSetIf() {
  draft.value.setIf = {
    path: '',
    if: '==',
    ifValue: '',
    keyValue: ''
  };
}

function parseSetIfValue() {
  const value = draft.value.setIf?.ifValue;
  if (value && !isNaN(value) && value !== '') {
    draft.value.setIf.ifValue = Number(value);
  }
}

function parseSetIfKeyValue() {
  const value = draft.value.setIf?.keyValue;
  if (value && !isNaN(value) && value !== '') {
    draft.value.setIf.keyValue = Number(value);
  }
}

function addHandle() {
  const k = `target_${Date.now()}`;
  if (!draft.value.handle) {
    draft.value.handle = {};
  }
  draft.value.handle[k] = { op: 'add', path: '' };
}

function delHandle(k: string) {
  delete draft.value.handle[k];
}

function usePathForRule(path: string) {
  const key = `rule_${Date.now()}`;
  rules.value[key] = {
    enable: true,
    path,
    order: 0,
    handle: {},
    setIf: null
  };
  // 切到"编辑规则"页签方便用户继续填写
  activeTab.value = 'rule';
  editingKey.value = key;
  editKeyLocked.value = false;
  draft.value = { ...rules.value[key] };
  draftRange.value = '';
  draftLimit.value = '';
}

/* ---------- 删除功能 ---------- */
function confirmDelete(key: string) {
  deletingKey.value = key;
  showDeleteConfirm.value = true;
}

function cancelDelete() {
  showDeleteConfirm.value = false;
  deletingKey.value = '';
}

async function executeDelete() {
  if (!deletingKey.value) return;

  try {
    // 从规则对象中删除
    delete rules.value[deletingKey.value];
    // 从折叠状态中删除
    delete folded.value[deletingKey.value];
    // 从字符串缓存中删除
    delete rangeStr.value[deletingKey.value];
    delete limitStr.value[deletingKey.value];

    // 保存更新后的规则
    await saveRules();

    showMessage(`规则 "${deletingKey.value}" 删除成功`, 'success');
  } catch (error) {
    showMessage('删除失败: ' + error, 'error');
  } finally {
    cancelDelete();
  }
}

/* ---------- 测试 ---------- */
function runTest() {
  try {
    const snap = JSON.parse(JSON.stringify(statData.value));
    const clone = JSON.parse(JSON.stringify(statData.value));
    testResult.value = EraDataHandler.applyRule(clone, snap, rules.value);
    showMessage('测试运行成功', 'success');
  } catch (error) {
    showMessage('测试运行失败: ' + error, 'error');
  }
}

/* ---------- 消息提示 ---------- */
function showMessage(text: string, type: 'success' | 'error' | 'warning') {
  message.value = { text, type };
  setTimeout(() => {
    message.value = null;
  }, 3000);
}
</script>

<style scoped lang="scss">
.era-rule-panel {
  margin: 8px 0 16px;
  display: flex;
  flex-direction: column;
  height: 500px; /* 或 calc(100vh - 200px) 根据实际情况调整 */
  max-height: 80vh; /* 限制最大高度 */
  background: #f5f6fa;
  font-size: 12px;
  color: #111827;
  border-radius: 8px; /* 可选：添加圆角 */
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); /* 可选：添加阴影 */
}

/* 2. 固定的页签容器 */
.sticky-tabs {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #f5f6fa;
  border-bottom: 1px solid #e5e7eb;
}

.tabs-container {
  display: flex;
  gap: 8px;
  padding: 12px 16px 8px; /* 调整内边距 */
  background: #f5f6fa;
}

.tabs-container button {
  padding: 8px 16px;
  border: none;
  background: none;
  font-size: 13px;
  color: #4b5563;
  cursor: pointer;
  position: relative;
  transition: color 0.2s;
  border-radius: 6px;
  font-weight: 500;
}

.tabs-container button::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -9px;
  height: 2px;
  background: #6366f1;
  transform: scaleX(0);
  transition: transform 0.2s;
}

.tabs-container button.active {
  color: #6366f1;
  font-weight: 600;
}

.tabs-container button.active::after {
  transform: scaleX(1);
}

/* 悬停效果 */
.tabs-container button:hover {
  background: rgba(99, 102, 241, 0.08);
}

/* 3. 内容包装器 */
.content-wrapper {
  flex: 1;
  min-height: 0; /* 关键：允许元素收缩 */
  overflow-y: auto;
  padding: 0 16px 16px;
}

/* 4. 内容区统一卡片 */
section {
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 12px; /* 每个section顶部增加内边距 */
}

h2 {
  margin: 0 0 8px;
  font-size: 15px;
  font-weight: 600;
  color: #111827;
}

/* 5. JSON 展示区 */
.json-tree-box {
  flex: 1;
  min-height: 0;
  overflow: auto;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 8px;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

/* 6. 规则卡片 */
.rule-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}
.rule-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  background: #f9fafb;
  cursor: pointer;
  user-select: none;
  font-weight: 500;
}
.rule-header span:last-child {
  font-size: 14px;
  transition: transform 0.2s;
}
.rule-header.folded span:last-child {
  transform: rotate(-90deg);
}
.rule-body {
  padding: 10px;
  border-top: 1px solid #e5e7eb;
}
.rule-body pre {
  margin: 0 0 8px;
  font-size: 11px;
  background: #f3f4f6;
  padding: 6px;
  border-radius: 4px;
  overflow: auto;
}

/* 7. 表单字段 */
.field {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.field label {
  width: 70px;
  font-size: 12px;
  color: #4b5563;
  flex-shrink: 0;
}
.field input,
.field select {
  flex: 1;
  padding: 5px 8px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 12px;
  color: #111827;
  background: #ffffff;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.03);
  transition: border-color 0.2s, box-shadow 0.2s;
}
.field input:focus,
.field select:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15), inset 0 1px 2px rgba(0, 0, 0, 0.03);
}

/* 8. handle 区 */
.handle-area {
  margin-top: 10px;
  padding: 10px;
  background: #f9fafb;
  border-radius: 6px;
}
.handle-item {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}
.handle-item span {
  font-size: 12px;
  color: #4b5563;
}
.handle-item select,
.handle-item input {
  flex: 1;
  padding: 4px 6px;
  font-size: 11px;
}

/* 9. 按钮 */
.btn {
  padding: 5px 12px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s, color 0.2s, transform 0.15s;
  background: #f3f4f6;
  color: #111827;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}
.btn:hover {
  background: #e5e7eb;
}
.btn.primary {
  background: #6366f1;
  color: #fff;
}
.btn.primary:hover {
  background: #4f46e5;
}
.btn.danger {
  background: #ef4444;
  color: #fff;
}
.btn.danger:hover {
  background: #dc2626;
}

/* 10. 底部按钮组 */
.button-group {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  justify-content: flex-end;
}

/* 11. 分隔线 */
hr {
  border: none;
  border-top: 1px solid #e5e7eb;
  margin: 10px 0;
}

/* 12. 状态提示 */
.status-message {
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 11px;
  margin-bottom: 8px;
}
.status-message.success {
  background: #d1fae5;
  color: #065f46;
  border: 1px solid #a7f3d0;
}
.status-message.error {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fecaca;
}
.status-message.warning {
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fde68a;
}

/* 13. 加载状态 */
.loading-spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid #f3f4f6;
  border-top: 2px solid #6366f1;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 14. 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  color: #6b7280;
  font-size: 11px;
  text-align: center;
}
.empty-state svg {
  width: 24px;
  height: 24px;
  margin-bottom: 8px;
  opacity: 0.5;
}

/* 15. 滚动条美化 */
.content-wrapper::-webkit-scrollbar {
  width: 8px;
}
.content-wrapper::-webkit-scrollbar-track {
  background: transparent;
}
.content-wrapper::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}
.content-wrapper::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

.json-tree-box::-webkit-scrollbar {
  width: 6px;
}
.json-tree-box::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 3px;
}
.json-tree-box::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}
.json-tree-box::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* 16. 删除确认对话框样式 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal {
  background: #ffffff;
  border-radius: 8px;
  padding: 20px;
  min-width: 300px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.modal h3 {
  margin: 0 0 12px;
  font-size: 16px;
  color: #111827;
}

.modal p {
  margin: 0 0 20px;
  font-size: 13px;
  color: #4b5563;
}

.modal-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

/* 17. 规则操作按钮 */
.rule-operations {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

/* 启用状态指示器 */
.rule-status {
  margin-left: 8px;
  font-size: 11px;
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 4px;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ef4444;
}

.status-indicator.enabled {
  background: #10b981;
}

.rule-name-container {
  display: flex;
  align-items: center;
}

/* 启用开关 */
.toggle-switch {
  position: relative;
  width: 44px;
  height: 22px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-label {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #e5e7eb;
  transition: .3s;
  border-radius: 22px;
}

.toggle-label:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: .3s;
  border-radius: 50%;
}

input:checked + .toggle-label {
  background-color: #10b981;
}

input:checked + .toggle-label:before {
  transform: translateX(40px);
}

/* setIf 区域 */
.setIf-area {
  margin-top: 12px;
  padding: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
}

.setIf-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-weight: 500;
}

.setIf-content {
  background: #ffffff;
  padding: 10px;
  border-radius: 4px;
  border: 1px solid #e2e8f0;
}

.setIf-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.setIf-row label {
  width: 80px;
  font-size: 11px;
  color: #4b5563;
  flex-shrink: 0;
}

.setIf-row input,
.setIf-row select {
  flex: 1;
  padding: 4px 6px;
  font-size: 11px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
}

.btn.small {
  padding: 3px 8px;
  font-size: 11px;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .sticky-tabs {
    padding: 0;
  }

  .tabs-container {
    padding: 10px 12px 6px;
    gap: 4px;
  }

  .tabs-container button {
    padding: 6px 10px;
    font-size: 12px;
  }

  .content-wrapper {
    padding: 0 12px 12px;
  }
}
</style>
