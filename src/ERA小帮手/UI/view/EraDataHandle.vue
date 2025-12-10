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

    <!-- 路径收集框 -->
    <PathCollection
      v-if="activeTab === 'rule'"
      :paths="collectedPaths"
      :is-expanded="isPathCollectionExpanded"
      @update:is-expanded="isPathCollectionExpanded = $event"
      @remove-path="removePath"
      @clear-all="clearAllPaths"
    />

    <div class="content-wrapper">
      <!-- 1.查看数据 -->
      <section v-show="activeTab === 'data'">
        <h2>当前 stat_data（只读）</h2>
        <div class="json-tree-box">
          <json-tree :data="statData" @send-path="collectPath" />
        </div>
      </section>

      <!-- 2. 查看规则（默认折叠） -->
      <section v-show="activeTab === 'list'">
        <h2>规则列表</h2>
        <div class="import-export-buttons">
          <FileImportExport
            import-text="导入规则"
            export-text="导出规则"
            confirm-title="导入规则"
            confirm-content="导入新规则将覆盖当前所有规则，确定要继续吗？"
            @export-data="exportRules"
            @import-confirmed="handleImportConfirmed"
            @error="handleImportError"
          />
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
              <button class="btn small" @click.stop="testDslExpressions(key)">测试 DSL</button>
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
              <input v-model="handleNames[handleKey]" placeholder="handle名称" class="handle-name-input" />
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
        <div class="section-header">
          <h2>测试模拟</h2>
          <div class="test-controls">
            <FileImportExport
              ref="testDataImportExportRef"
              import-text="导入测试数据"
              export-text="导出测试结果"
              :require-confirm="false"
              @file-loaded="handleTestDataLoaded"
              @export-data="exportTestResults"
            />
            <button v-if="hasCustomTestData" class="btn small" @click="resetToOriginalData">恢复原始数据</button>
            <button class="btn small primary" @click="runTest">模拟更新（不保存）</button>
            <button class="btn small" @click="openDslTester">打开 DSL 测试器</button>
          </div>
        </div>

        <!-- 显示当前数据来源 -->
        <div v-if="hasCustomTestData" class="data-source-indicator">
          <span class="indicator-icon">📁</span>
          <span>当前使用自定义测试数据</span>
        </div>

        <div class="json-tree-box">
          <json-tree :data="testResult || statData" />
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
      :rules-data="testRulesData"
      :stat-data="statData"
      :result-text="testResultText"
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
      v-model:visible="showDuplicateRuleConfirm"
      title="规则名称重复"
      content="已存在同名规则，是否覆盖？"
      type="confirm"
      confirm-text="覆盖"
      cancel-text="取消"
      @confirm="saveRuleWithOverwrite"
      @cancel="cancelRuleSave"
    />

    <EraConfirmModal
      v-model:visible="showDuplicateHandleConfirm"
      title="Handle名称重复"
      content="已存在同名Handle，是否覆盖？"
       type="confirm"
      confirm-text="覆盖"
      cancel-text="取消"
      @confirm="saveRuleWithOverwrite"
      @cancel="cancelRuleSave"
    />

    <!-- 消息提示 -->
    <div v-if="message" class="status-message" :class="message.type">
      {{ message.text }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useEraDataStore } from '../../stores/EraDataStore';
import { EraDataHandler } from '../../EraDataHandler/EraDataHandler';
import JsonTree from '../components/JsonNode/JsonTree.vue';
import { exportRulesToJson, importRulesFromJson } from '../../utils/ExportRulesUtil';
import EraConfirmModal from '../components/EraConfirmModal.vue';
import DslBuilderModal from '../components/DSL/DSLBuilderModal.vue';
import DslTesterModal from '../components/DSL/DSLTesterModal.vue';
import FileImportExport from '../components/FileImportExport.vue';
import PathCollection from '../components/PathCollection.vue';

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
const handleNames = ref<Record<string, string>>({});

// 路径收集相关
const collectedPaths = ref<string[]>([]);
const isPathCollectionExpanded = ref(false);

const draftRangeMin = ref<number | null>(null);
const draftRangeMax = ref<number | null>(null);
const draftLimitNeg = ref<number | null>(null);
const draftLimitPos = ref<number | null>(null);

const activeTab = ref<'data' | 'rule' | 'test' | 'list'>('data');
const showDeleteConfirm = ref(false);
const deletingKey = ref<string>('');
const showDuplicateRuleConfirm = ref(false);
const showDuplicateHandleConfirm = ref(false);
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
const testRulesData = ref<Array<{name: string, rule: any}> | null>(null);
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
  deletingKey.value = key; // 记录原始键名
  draft.value = JSON.parse(JSON.stringify(rules.value[key]));

  // 初始化handleNames
  handleNames.value = {};
  if (draft.value.handle) {
    Object.keys(draft.value.handle).forEach(handleKey => {
      handleNames.value[handleKey] = handleKey;
    });
  }

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

  // 检查规则是否重名
  if ((!editKeyLocked.value || (editKeyLocked.value && editingKey.value !== deletingKey.value))
      && rules.value[editingKey.value]) {
    // 新增规则或重命名规则时检查是否与现有规则重名
    showDuplicateRuleConfirm.value = true;
    return;
  }

  // 检查handle是否重名
  const handleKeys = Object.values(handleNames.value);
  const uniqueHandles = new Set(handleKeys);
  if (uniqueHandles.size !== handleKeys.length) {
    showDuplicateHandleConfirm.value = true;
    return;
  }

  saveRule();
}

function saveRule() {
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

  // 处理handle重命名
  const updatedHandle: Record<string, any> = {};
  Object.keys(draft.value.handle).forEach(oldKey => {
    const newKey = handleNames.value[oldKey] || oldKey;
    updatedHandle[newKey] = draft.value.handle[oldKey];
  });
  draft.value.handle = updatedHandle;

  // 如果是重命名规则，删除旧规则
  if (editKeyLocked.value && editingKey.value !== deletingKey.value) {
    delete rules.value[deletingKey.value];
    delete folded.value[deletingKey.value];
  }

  rules.value[editingKey.value] = JSON.parse(JSON.stringify(draft.value));
  folded.value[editingKey.value] = true;

  saveRules();
  showMessage(`规则 "${editingKey.value}" ${editKeyLocked.value ? '更新' : '添加'}成功`, 'success');
  cancelEdit();
}

function saveRuleWithOverwrite() {
  showDuplicateRuleConfirm.value = false;
  showDuplicateHandleConfirm.value = false;
  saveRule();
}

function cancelRuleSave() {
  showDuplicateRuleConfirm.value = false;
  showDuplicateHandleConfirm.value = false;
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
  handleNames.value = {};
  draftRangeMin.value = null;
  draftRangeMax.value = null;
  draftLimitNeg.value = null;
  draftLimitPos.value = null;
  activeTab.value = 'list';
}

function addHandle() {
  let k = `handle_${Date.now()}`;
  // 确保初始名称唯一
  while (handleNames.value[k]) {
    k = `handle_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  }

  if (!draft.value.handle) {
    draft.value.handle = {};
  }
  draft.value.handle[k] = {
    order: 0,
    if: '',
    op: ''
  };
  // 初始化handle名称
  handleNames.value[k] = k;
}

function delHandle(k: string | number) {
  delete draft.value.handle[k];
  delete handleNames.value[k];
}

function collectPath(path: string) {
  // 添加路径到收集列表
  if (!collectedPaths.value.includes(path)) {
    collectedPaths.value.push(path);
    toastr.success('路径已复制到收集箱', '');
  } else {
    toastr.warning('路径已在收集箱中', '');
  }
}

function removePath(index: number) {
  collectedPaths.value.splice(index, 1);
}

function clearAllPaths() {
  collectedPaths.value = [];
}

// 保留collectPath方法供JsonTree组件调用，其他方法已移到PathCollection组件中

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
  testRulesData.value = null;
  testResultText.value = '';
}

function closeDslTester() {
  showDslTester.value = false;
}

// 统一的DSL测试方法，可以测试单个规则或所有规则
function testDslExpressions(ruleKey?: string) {
  // 如果提供了ruleKey，则测试单个规则，否则测试所有规则
  if (ruleKey) {
    // 构造只包含一个规则的数组
    const rule = rules.value[ruleKey];
    if (!rule) {
      showMessage('找不到指定的规则', 'warning');
      return;
    }
    testRulesData.value = [{
      name: ruleKey,
      rule: {
        path: rule.path,
        handle: rule.handle
      }
    }];
  } else {
    // 测试所有规则
    testRulesData.value = Object.entries(rules.value).map(([name, rule]) => ({
      name,
      rule: {
        path: rule.path,
        handle: rule.handle
      }
    }));
  }

  showDslTester.value = true;
  testResultText.value = '';
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

// 使用新的导入处理方法
function handleImportConfirmed(content: string, _file: File) {
  try {
    const importedRules = importRulesFromJson(content);

    if (!importedRules || typeof importedRules !== 'object') {
      showMessage('导入失败：文件格式不正确', 'error');
      return;
    }

    rules.value = importedRules;
    folded.value = {};
    Object.keys(rules.value).forEach(k => (folded.value[k] = true));
    saveRules();
    showMessage('规则导入成功', 'success');
  } catch (error) {
    showMessage('导入失败：' + error, 'error');
  }
}

function handleImportError(error: string) {
  showMessage(error, 'error');
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

/* ---------- 测试数据文件处理 ---------- */
function handleTestDataLoaded(content: string, _file: File) {
  try {
    const testData = JSON.parse(content);

    // 验证数据结构
    if (typeof testData !== 'object' || testData === null) {
      showMessage('无效的 JSON 数据', 'error');
      return;
    }

    // 将导入的数据设为当前测试数据
    statData.value = testData;
    showMessage('测试数据导入成功', 'success');

    // 自动切换到测试标签页
    activeTab.value = 'test';
  } catch (error) {
    showMessage('文件读取失败: ' + error, 'error');
  }
}

function exportTestResults() {
  try {
    // 导出当前测试结果或原始数据
    const dataToExport = testResult.value || statData.value;
    const json = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `era-test-data-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showMessage('测试数据导出成功', 'success');
  } catch (error) {
    showMessage('导出失败: ' + error, 'error');
  }
}

function resetToOriginalData() {
  // 重置为原始数据
  const { stat_data } = getVariables({ type: 'chat' });
  statData.value = stat_data || {};
  showMessage('已恢复原始数据', 'success');
}

const hasCustomTestData = computed(() => {
  const original = getVariables({ type: 'chat' }).stat_data;
  return JSON.stringify(statData.value) !== JSON.stringify(original);
});


</script>

<style scoped lang="scss">
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
  padding: 12px 16px 8px;
  background: #f5f6fa;
}

.tabs-container button {
  padding: 8px 16px;
  border: none;
  background: none;
  font-size: 13px;
  color: #111827;
  cursor: pointer;
  position: relative;
  transition: color 0.2s;
  border-radius: 6px;
  font-weight: 600;
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
  color: #4f46e5;
  font-weight: 700;
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
  min-height: 0;
  overflow-y: auto;
  padding: 0 16px 16px;
}

/* 4. 内容区统一卡片 */
section {
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 12px;
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
  color: #111827;
  flex-shrink: 0;
  font-weight: 500;
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
  color: #111827;
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
  font-weight: 500;
}

.btn:hover {
  background: #e5e7eb;
  color: #000000;
}

.btn.primary {
  background: #4f46e5;
  color: #ffffff;
  font-weight: 500;
}

.btn.primary:hover {
  background: #4338ca;
  color: #ffffff;
}

.btn.danger {
  background: #dc2626;
  color: #ffffff;
  font-weight: 500;
}

.btn.danger:hover {
  background: #b91c1c;
  color: #ffffff;
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

.btn.small {
  padding: 3px 8px;
  font-size: 11px;
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
  min-width: 0;
}

.input-label {
  font-size: 11px;
  color: #111827;
  min-width: 28px;
  white-space: nowrap;
  font-weight: 500;
}

.range-limit-inputs input {
  flex: 1;
  padding: 4px 6px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  font-size: 11px;
  min-width: 0;
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

.handle-name-input {
  font-weight: bold;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  padding: 4px 8px;
  width: auto;
  min-width: 120px;
}

.handle-name-input:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
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
  font-weight: 600;
  color: #111827;
}

.dsl-preview input {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  font-size: 11px;
  background: #f8fafc;
  cursor: pointer;
  color: #111827;
  font-weight: 500;
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
  color: #111827;
  overflow-x: auto;
  word-break: break-all;
}

.handle-expression strong {
  color: #000000;
  font-weight: 600;
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
  color: #111827;
}

.rule-details div {
  margin: 4px 0;
  color: #111827;
}

.data-source-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #e0f2fe;
  border: 1px solid #bae6fd;
  border-radius: 6px;
  margin-bottom: 12px;
  font-size: 12px;
  color: #0369a1;
}

.data-source-indicator .indicator-icon {
  font-size: 14px;
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
    min-width: calc(50% - 4px);
  }
}
</style>
