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
          <json-tree :data="statData" @send-path="usePathForRule" />
        </div>
      </section>

      <!-- 2. 查看规则（默认折叠） -->
      <section v-show="activeTab === 'list'">
        <h2>规则列表</h2>
        <div class="import-export-buttons">
          <button class="btn small" @click="exportRules">导出规则</button>
          <button class="btn small" @click="importRules">导入规则</button>
          <button class="btn small primary" @click="testAllDslExpressions">测试所有 DSL 表达式</button>
        </div>

        <!-- 空状态提示 -->
        <div v-if="Object.keys(rules).length === 0" class="empty-state">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z"
            />
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
              <button class="btn small" @click.stop="testRuleDsl(key)">测试 DSL</button>
              <span class="fold-indicator">{{ folded[key] ? '›' : '⌄' }}</span>
            </div>
          </div>

          <div v-show="!folded[key]" class="rule-body">
            <div class="rule-content">
              <div class="rule-details">
                <div><strong>路径:</strong> {{ rule.path }}</div>
                <div><strong>顺序:</strong> {{ rule.order }}</div>
                <div v-if="rule.range"><strong>范围:</strong> [{{ rule.range[0] }}, {{ rule.range[1] }}]</div>
                <div v-if="rule.limit"><strong>限制:</strong> [{{ rule.limit[0] }}, {{ rule.limit[1] }}]</div>
              </div>

              <!-- handle 列表 -->
              <div v-if="rule.handle && Object.keys(rule.handle).length > 0" class="handle-list">
                <div v-for="(handleItem, handleKey) in rule.handle" :key="handleKey" class="handle-item">
                  <div class="handle-header">
                    <strong>{{ handleKey }}</strong> (顺序: {{ handleItem.order }})
                  </div>
                  <div v-if="handleItem.if" class="handle-expression">
                    <strong>条件:</strong> {{ handleItem.if }}
                  </div>
                  <div class="handle-expression">
                    <strong>操作:</strong> {{ handleItem.op }}
                  </div>
                </div>
              </div>

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
            <input id="enableToggle" v-model="draft.enable" type="checkbox" :true-value="true" :false-value="false" />
            <label for="enableToggle" class="toggle-label"></label>
          </div>
        </div>

        <!-- 基本字段 -->
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
          <div class="range-limit-inputs">
            <div class="input-group">
              <input v-model.number="draftRangeMin" type="number" placeholder="最小值" />
            </div>
            <div class="input-group">
              <input v-model.number="draftRangeMax" type="number" placeholder="最大值" />
            </div>
          </div>
        </div>
        <div class="field">
          <label>变化值限制:</label>
          <div class="range-limit-inputs">
            <div class="input-group">
              <input v-model.number="draftLimitNeg" type="number" placeholder="负向最大" />
            </div>
            <div class="input-group">
              <input v-model.number="draftLimitPos" type="number" placeholder="正向最大" />
            </div>
          </div>
        </div>

        <!-- handle 区域 -->
        <div class="handle-area">
          <div class="handle-area-header">
            <span>handle 运算配置:</span>
            <button class="btn small primary" @click="addHandle">+ 添加 handle</button>
          </div>

          <div v-for="(handleItem, handleKey) in draft.handle" :key="handleKey" class="handle-editor">
            <div class="handle-header">
              <strong>{{ handleKey }}</strong>
              <button class="btn small danger" @click="delHandle(handleKey)">删除</button>
            </div>

            <div class="field">
              <label>处理顺序:</label>
              <input v-model.number="handleItem.order" type="number" min="0" placeholder="0" />
            </div>

            <!-- 条件表达式构建器 -->
            <div class="dsl-builder">
              <div class="dsl-header">
                <label>条件表达式 (if):</label>
                <div class="dsl-actions">
                  <button class="btn small" @click="openDslBuilder('if', handleKey)">构建</button>
                  <button v-if="handleItem.if" class="btn small danger" @click="clearDsl('if', handleKey)">清空</button>
                </div>
              </div>
              <div class="dsl-preview">
                <input
                  v-model="handleItem.if"
                  readonly
                  placeholder="点击'构建'按钮创建条件表达式"
                  @click="openDslBuilder('if', handleKey)"
                />
              </div>
            </div>

            <!-- 操作表达式构建器 -->
            <div class="dsl-builder">
              <div class="dsl-header">
                <label>操作表达式 (op):</label>
                <div class="dsl-actions">
                  <button class="btn small" @click="openDslBuilder('op', handleKey)">构建</button>
                  <button v-if="handleItem.op" class="btn small danger" @click="clearDsl('op', handleKey)">清空</button>
                </div>
              </div>
              <div class="dsl-preview">
                <input
                  v-model="handleItem.op"
                  readonly
                  placeholder="点击'构建'按钮创建操作表达式"
                  @click="openDslBuilder('op', handleKey)"
                />
              </div>
            </div>
          </div>
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
        <div class="test-controls">
          <button class="btn primary" @click="runTest">模拟更新（不保存）</button>
          <button class="btn" @click="openDslTester">打开 DSL 测试器</button>
        </div>
        <div class="json-tree-box">
          <json-tree :data="testResult" />
        </div>
      </section>
    </div>

    <!-- DSL 构建器模态框 -->
    <DslBuilderModal
      v-model:visible="showDslBuilder"
      v-model:expression="currentDslExpression"
      :type="dslBuilderType"
      :selected-path="draft.path || ''"
      @apply="applyDslExpression"
      @add-component="addDslComponent"
      @select-path="showDslPathSelector"
      @validate="validateDslExpression"
      @close="closeDslBuilder"
    />

    <!-- DSL 测试器模态框 -->
    <DslTesterModal
      v-model:visible="showDslTester"
      v-model:if-expr="testIfExpr"
      v-model:op-expr="testOpExpr"
      v-model:path="testPath"
      :result-text="testResultText"
      @run-test="runDslTest"
      @close="closeDslTester"
    />

    <!-- 自定义弹窗组件 -->
    <EraConfirmModal
      v-model:visible="showDeleteConfirm"
      title="确认删除"
      content="确定要删除该规则吗？此操作不可恢复"
      type="confirm"
      confirm-text="确认删除"
      cancel-text="取消"
      @confirm="executeDelete"
      @cancel="cancelDelete"
    />

    <EraConfirmModal
      v-model:visible="showImportConfirm"
      title="导入规则"
      content="导入新规则将覆盖当前所有规则，确定要继续吗？"
      type="confirm"
      confirm-text="确认导入"
      cancel-text="取消"
      @confirm="executeImport"
      @cancel="cancelImport"
    />

    <!-- 文件导入输入 -->
    <input ref="fileInputRef" type="file" accept=".json" style="display: none" @change="handleFileImport" />

    <!-- 消息提示 -->
    <div v-if="message" class="status-message" :class="message.type">
      {{ message.text }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useEraDataStore } from '../../stores/EraDataStore';
import { EraDataHandler } from '../../EraDataHandler/EraDataHandler';
import JsonTree from '../components/JsonTree.vue';
import { exportRulesToJson, importRulesFromJson } from '../../utils/ExportRulesUtil';
import EraConfirmModal from '../components/EraConfirmModal.vue';
import DslBuilderModal from '../components/DSL/DSLBuilderModal.vue';
import DslTesterModal from '../components/DSL/DSLTesterModal.vue';
import { DSLHandler } from '../../../Utils/DSLHandler/DSLHandler';

/* ---------- 数据 ---------- */
const statData = ref<any>({});
const rules = ref<Record<string, any>>({});
const testResult = ref<any>();
const folded = ref<Record<string, boolean>>({});
const editingKey = ref<string>('');
const editKeyLocked = ref<boolean>(false);
const draft = ref<any>({
  enable: true,
  path: '',
  order: 0,
  handle: {},
  range: [],
  limit: [],
});

const draftRangeMin = ref<number | null>(null);
const draftRangeMax = ref<number | null>(null);
const draftLimitNeg = ref<number | null>(null);
const draftLimitPos = ref<number | null>(null);

const activeTab = ref<'data' | 'rule' | 'test' | 'list'>('data');
const showDeleteConfirm = ref(false);
const deletingKey = ref<string>('');
const showImportConfirm = ref(false);
const fileInputRef = ref<HTMLInputElement>();
const message = ref<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null);

// DSL 构建器相关
const showDslBuilder = ref(false);
const dslBuilderType = ref<'if' | 'op'>('if');
const currentDslHandleKey = ref<string>('');
const currentDslExpression = ref<string>(''); // DSL构建器的表达式

// DSL 测试器相关
const showDslTester = ref(false);
const testIfExpr = ref<string>('');
const testOpExpr = ref<string>('');
const testPath = ref<string>('');
const testResultText = ref<string>('');

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
  Object.keys(rules.value).forEach(k => (folded.value[k] = true));
});

/* ---------- 工具函数 ---------- */
async function loadRules() {
  try {
    await eraStore.getEraDataRules();
    rules.value = eraStore.eraDataRule || {};
    showMessage('规则加载成功', 'success');
  } catch (error) {
    showMessage('规则加载失败: ' + error, 'error');
  }
}

function toggleFold(key: string) {
  folded.value[key] = !folded.value[key];
}

function editRule(key: string) {
  editingKey.value = key;
  editKeyLocked.value = true;
  draft.value = JSON.parse(JSON.stringify(rules.value[key]));

  if (draft.value.enable === undefined) {
    draft.value.enable = true;
  }

  if (draft.value.range && Array.isArray(draft.value.range) && draft.value.range.length >= 2) {
    draftRangeMin.value = draft.value.range[0];
    draftRangeMax.value = draft.value.range[1];
  } else {
    draftRangeMin.value = null;
    draftRangeMax.value = null;
  }

  if (draft.value.limit && Array.isArray(draft.value.limit) && draft.value.limit.length >= 2) {
    draftLimitNeg.value = draft.value.limit[0];
    draftLimitPos.value = draft.value.limit[1];
  } else {
    draftLimitNeg.value = null;
    draftLimitPos.value = null;
  }

  activeTab.value = 'rule';
}

function confirmSave() {
  if (!editingKey.value) {
    showMessage('请输入规则名称', 'error');
    return;
  }

  if (draftRangeMin.value !== null && draftRangeMax.value !== null) {
    draft.value.range = [draftRangeMin.value, draftRangeMax.value];
  } else {
    draft.value.range = [];
  }

  if (draftLimitNeg.value !== null && draftLimitPos.value !== null) {
    draft.value.limit = [draftLimitNeg.value, draftLimitPos.value];
  } else {
    draft.value.limit = [];
  }

  rules.value[editingKey.value] = JSON.parse(JSON.stringify(draft.value));
  folded.value[editingKey.value] = true;

  saveRules();
  showMessage(`规则 "${editingKey.value}" ${editKeyLocked.value ? '更新' : '添加'}成功`, 'success');
  cancelEdit();
}

async function saveRules() {
  try {
    eraStore.eraDataRule = { ...rules.value };
    await eraStore.saveEraDataRules();
    showMessage('规则保存成功', 'success');
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
    range: [],
    limit: [],
  };
  draftRangeMin.value = null;
  draftRangeMax.value = null;
  draftLimitNeg.value = null;
  draftLimitPos.value = null;
  activeTab.value = 'list';
}

function addHandle() {
  const k = `handle_${Date.now()}`;
  if (!draft.value.handle) {
    draft.value.handle = {};
  }
  draft.value.handle[k] = {
    order: 0,
    if: '',
    op: ''
  };
}

function delHandle(k: string | number) {
  delete draft.value.handle[k];
}

function usePathForRule(path: string) {
  const key = `rule_${Date.now()}`;
  rules.value[key] = {
    enable: true,
    path,
    order: 0,
    handle: {},
    range: [],
    limit: [],
  };
  activeTab.value = 'rule';
  editingKey.value = key;
  editKeyLocked.value = false;
  draft.value = { ...rules.value[key] };
  draftRangeMin.value = null;
  draftRangeMax.value = null;
  draftLimitNeg.value = null;
  draftLimitPos.value = null;
}

/* ---------- DSL 构建器 ---------- */
function openDslBuilder(type: 'if' | 'op', handleKey: string | number) {
  dslBuilderType.value = type;
  currentDslHandleKey.value = handleKey as string;

  const handleItem = draft.value.handle[handleKey];
  if (handleItem && handleItem[type]) {
    currentDslExpression.value = handleItem[type];
  } else {
    currentDslExpression.value = '';
  }

  showDslBuilder.value = true;
}

function closeDslBuilder() {
  showDslBuilder.value = false;
  currentDslExpression.value = '';
  currentDslHandleKey.value = '';
}

function applyDslExpression(expression: string) {
  if (!currentDslHandleKey.value) {
    showMessage('未找到对应的handle', 'error');
    return;
  }

  const handleItem = draft.value.handle[currentDslHandleKey.value];
  if (handleItem) {
    handleItem[dslBuilderType.value] = expression;
    showMessage('表达式已应用', 'success');
  }

  closeDslBuilder();
}

function addDslComponent(component: string) {
  currentDslExpression.value = (currentDslExpression.value + ' ' + component).trim();
}

function showDslPathSelector() {
  // 这里可以打开路径选择器，从 statData 中选择路径
  // 暂时使用当前draft的path
  const path = draft.value.path || '$[$this]';
  addDslComponent(`$[${path}]`);
}

function clearDsl(type: 'if' | 'op', handleKey: string | number) {
  const handleItem = draft.value.handle[handleKey];
  if (handleItem) {
    handleItem[type] = '';
  }
}

function validateDslExpression() {
  if (!currentDslExpression.value) {
    showMessage('表达式为空', 'error');
    return;
  }

  try {
    if (dslBuilderType.value === 'if') {
      if (!currentDslExpression.value.includes('?[')) {
        showMessage('条件表达式应包含比较运算符 ?[...]', 'warning');
      }
    } else if (!currentDslExpression.value.includes('#')) {
      showMessage('操作表达式应包含操作符 #[...]', 'warning');
    }
    showMessage('表达式格式基本正确', 'success');
  } catch (error) {
    showMessage('表达式验证失败: ' + error, 'error');
  }
}

/* ---------- DSL 测试器 ---------- */
function openDslTester() {
  showDslTester.value = true;
  testIfExpr.value = '';
  testOpExpr.value = '';
  testPath.value = '';
  testResultText.value = '';
}

function closeDslTester() {
  showDslTester.value = false;
}

function runDslTest(data: { ifExpr: string; opExpr: string; path: string }) {
  try {
    const snap = JSON.parse(JSON.stringify(statData.value));
    const testData = JSON.parse(JSON.stringify(statData.value));

    if (!data.path) {
      showMessage('请输入测试路径', 'error');
      return;
    }

    const result = DSLHandler.testDsl(
      testData,
      snap,
      data.path,
      data.ifExpr,
      data.opExpr
    );

    testResultText.value = result;
    showMessage('DSL 测试完成', 'success');
  } catch (error) {
    testResultText.value = `测试失败: ${error}`;
    showMessage('测试失败: ' + error, 'error');
  }
}

function testRuleDsl(ruleKey: string) {
  const rule = rules.value[ruleKey];
  if (!rule || !rule.handle) {
    showMessage('该规则没有配置 handle', 'warning');
    return;
  }

  let testOutput = `规则: ${ruleKey}\n`;
  testOutput += `路径: ${rule.path}\n`;
  testOutput += '='.repeat(40) + '\n\n';

  for (const [handleKey, handleItem] of Object.entries(rule.handle as Record<string, any>)) {
    testOutput += `handle: ${handleKey}\n`;

    if (handleItem.if) {
      testOutput += `条件表达式: ${handleItem.if}\n`;
    }

    if (handleItem.op) {
      testOutput += `操作表达式: ${handleItem.op}\n`;
    }

    testOutput += '-'.repeat(30) + '\n';
  }

  showDslTester.value = true;
  testPath.value = rule.path;
  testResultText.value = testOutput;
}

function testAllDslExpressions() {
  let testOutput = '所有规则 DSL 表达式测试\n';
  testOutput += '='.repeat(50) + '\n\n';

  for (const [ruleKey, rule] of Object.entries(rules.value)) {
    if (!rule.handle || Object.keys(rule.handle).length === 0) continue;

    testOutput += `规则: ${ruleKey}\n`;
    testOutput += `路径: ${rule.path}\n`;

    for (const [handleKey, handleItem] of Object.entries(rule.handle as Record<string, any>)) {
      testOutput += `  handle: ${handleKey}\n`;

      if (handleItem.if) {
        testOutput += `    条件: ${handleItem.if}\n`;
      }

      if (handleItem.op) {
        testOutput += `    操作: ${handleItem.op}\n`;
      }
    }

    testOutput += '-'.repeat(40) + '\n';
  }

  showDslTester.value = true;
  testResultText.value = testOutput;
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
    delete rules.value[deletingKey.value];
    delete folded.value[deletingKey.value];
    await saveRules();
    showMessage(`规则 "${deletingKey.value}" 删除成功`, 'success');
  } catch (error) {
    showMessage('删除失败: ' + error, 'error');
  } finally {
    cancelDelete();
  }
}

/* ---------- 导入导出功能 ---------- */
function exportRules() {
  try {
    const exported = exportRulesToJson(rules.value);
    const blob = new Blob([exported], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `era-rules-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showMessage('规则导出成功', 'success');
  } catch (error) {
    showMessage('导出失败: ' + error, 'error');
  }
}

function importRules() {
  if (fileInputRef.value) {
    fileInputRef.value.click();
  }
}

function handleFileImport(event: Event) {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;

  const file = input.files[0];
  const reader = new FileReader();

  reader.onload = e => {
    try {
      const content = e.target?.result as string;
      const importedRules = importRulesFromJson(content);

      if (!importedRules || typeof importedRules !== 'object') {
        showMessage('导入失败：文件格式不正确', 'error');
        return;
      }

      showImportConfirm.value = true;
      (window as any)._tempImportedRules = importedRules;
    } catch (error) {
      showMessage('导入失败：' + error, 'error');
    } finally {
      if (fileInputRef.value) {
        fileInputRef.value.value = '';
      }
    }
  };

  reader.readAsText(file);
}

function cancelImport() {
  showImportConfirm.value = false;
  delete (window as any)._tempImportedRules;
}

async function executeImport() {
  try {
    const importedRules = (window as any)._tempImportedRules;
    if (!importedRules) {
      showMessage('导入失败：没有可导入的数据', 'error');
      return;
    }

    rules.value = importedRules;
    folded.value = {};
    Object.keys(rules.value).forEach(k => (folded.value[k] = true));
    await saveRules();
    showMessage('规则导入成功', 'success');
    showImportConfirm.value = false;
    delete (window as any)._tempImportedRules;
  } catch (error) {
    showMessage('导入失败：' + error, 'error');
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
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}
.field input:focus,
.field select:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow:
    0 0 0 3px rgba(99, 102, 241, 0.15),
    inset 0 1px 2px rgba(0, 0, 0, 0.03);
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
  transition:
    background 0.2s,
    color 0.2s,
    transform 0.15s;
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
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
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
  transition: 0.3s;
  border-radius: 22px;
}

.toggle-label:before {
  position: absolute;
  content: '';
  height: 16px;
  width: 16px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
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

.era-rule-panel {
  margin: 8px 0 16px;
  display: flex;
  flex-direction: column;
  height: 500px;
  max-height: 80vh;
  background: #f5f6fa;
  font-size: 12px;
  color: #111827;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: relative;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 0 0 12px 0;
}

.import-export-buttons {
  display: flex;
  gap: 8px;
}

/* 更新范围限制的样式 */
.range-limit-inputs {
  display: flex;
  gap: 8px;
  flex: 1;
}

.input-group {
  display: flex;
  align-items: center;
  flex: 1;
  gap: 4px;
  min-width: 0; /* 添加这行防止撑开 */
}

.input-label {
  font-size: 11px;
  color: #4b5563;
  min-width: 28px; /* 稍微减小 */
  white-space: nowrap;
}

.range-limit-inputs input {
  flex: 1;
  padding: 4px 6px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  font-size: 11px;
  min-width: 0; /* 添加这行 */
}

/* handle 区域样式更新 */
.handle-area {
  margin-top: 16px;
}

.handle-area-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.handle-editor {
  margin-bottom: 16px;
  padding: 12px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

.handle-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e5e7eb;
}

.dsl-builder {
  margin: 8px 0;
}

.dsl-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.dsl-header label {
  font-size: 12px;
  font-weight: 500;
}

.dsl-preview input {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  font-size: 11px;
  background: #f8fafc;
  cursor: pointer;
}

.dsl-preview input:hover {
  background: #f1f5f9;
}

/* 规则列表中的 handle 显示 */
.handle-list {
  margin: 12px 0;
}

.handle-list .handle-item {
  margin-bottom: 8px;
  padding: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
}

.handle-expression {
  margin: 4px 0;
  font-size: 11px;
  color: #4b5563;
  overflow-x: auto;
  word-break: break-all;
}

.handle-expression strong {
  color: #111827;
}

/* 测试控制按钮 */
.test-controls {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

/* 规则详情显示 */
.rule-details {
  margin-bottom: 12px;
  font-size: 12px;
}

.rule-details div {
  margin: 4px 0;
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

  .range-limit-inputs {
    flex-direction: column;
    gap: 2px;
  }

  .input-group {
    min-width: calc(50% - 4px); /* 每个占一半宽度 */
  }
}
</style>
