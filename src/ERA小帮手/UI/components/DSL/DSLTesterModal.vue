<template>
  <div v-if="visible" class="dsl-tester-modal" @click.self="handleClose">
    <div class="dsl-tester-content">
      <div class="tester-header">
        <h3>{{ modalTitle }}</h3>
        <button class="btn small" @click="handleClose">×</button>
      </div>

      <div class="tester-body">
        <div class="tester-inputs">
          <div v-if="testMode === 'single'" class="field">
            <label>条件表达式 (if):</label>
            <input v-model="localIfExpr" placeholder="<<if> $[路径] ?[>=] &[{num}40]>" />
          </div>
          <div v-if="testMode === 'single'" class="field">
            <label>操作表达式 (op):</label>
            <input v-model="localOpExpr" placeholder="<<op> $[路径] #[+] &[{num}10]>" />
          </div>
          <div v-if="testMode === 'single'" class="field">
            <label>测试路径:</label>
            <input v-model="localPath" placeholder="角色.角色A.特殊状态.好感度" />
          </div>

          <div v-if="testMode === 'rule'" class="field">
            <label>规则名称:</label>
            <input v-model="localRuleName" disabled />
          </div>
          <div v-if="testMode === 'rule'" class="field">
            <label>规则路径:</label>
            <input v-model="localRulePath" disabled />
          </div>

          <div v-if="testMode === 'all'" class="field">
            <label>测试类型:</label>
            <input value="所有规则测试" disabled />
          </div>

          <div class="tester-actions">
            <button class="btn primary" @click="handleRunTest">运行测试</button>
            <button class="btn" @click="handleClose">关闭</button>
          </div>
        </div>

        <div class="tester-output">
          <h4>测试结果</h4>
          <pre v-if="localResultText">{{ localResultText }}</pre>
          <div v-else class="empty-result">
            测试结果将显示在这里
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { DSLHandler } from '../../../../Utils/DSLHandler/DSLHandler';
import { eraLogger } from '../../../utils/EraHelperLogger';

interface RuleHandle {
  key: string;
  order: number;
  ifExpr: string;
  opExpr: string;
}

interface SingleRuleData {
  name: string;
  path: string;
  handles: RuleHandle[];
}

interface Props {
  visible: boolean;
  ifExpr?: string;
  opExpr?: string;
  path?: string;
  rulesData?: Array<{name: string, rule: any}> | null;
  resultText?: string;
  statData?: any;
}

interface Emits {
  (e: 'update:visible', value: boolean): void;
  (e: 'close'): void;
  (e: 'update:if-expr', value: string): void;
  (e: 'update:op-expr', value: string): void;
  (e: 'update:path', value: string): void;
}

const props = withDefaults(defineProps<Props>(), {
  ifExpr: '',
  opExpr: '',
  path: '',
  rulesData: null,
  resultText: '',
  statData: () => ({})
});

const emit = defineEmits<Emits>();

// 创建本地响应式变量
const localIfExpr = ref(props.ifExpr);
const localOpExpr = ref(props.opExpr);
const localPath = ref(props.path);
const localResultText = ref(props.resultText);
const localRuleName = ref(props.rulesData && props.rulesData.length > 0 ? props.rulesData[0].name : '');
const localRulePath = ref(props.rulesData && props.rulesData.length > 0 ? props.rulesData[0].rule.path : '');

// 确定测试模式
const testMode = computed(() => {
  if (props.rulesData && props.rulesData.length > 1) return 'all';
  if (props.rulesData && props.rulesData.length === 1) return 'rule';
  return 'single';
});

// 计算标题
const modalTitle = computed(() => {
  switch (testMode.value) {
    case 'all': return 'DSL 表达式测试器 - 所有规则';
    case 'rule': return 'DSL 表达式测试器 - 规则测试';
    default: return 'DSL 表达式测试器';
  }
});

// 监听props变化并更新本地变量
watch(() => props.ifExpr, (value) => {
  localIfExpr.value = value;
});

watch(() => props.opExpr, (value) => {
  localOpExpr.value = value;
});

watch(() => props.path, (value) => {
  localPath.value = value;
});

watch(() => props.resultText, (value) => {
  localResultText.value = value;
});

watch(() => props.rulesData, (value) => {
  if (value && value.length > 0) {
    localRuleName.value = value[0].name;
    localRulePath.value = value[0].rule.path;
  }
});

// 监听本地变量变化并更新父组件
watch(localIfExpr, (value) => {
  emit('update:if-expr', value);
});

watch(localOpExpr, (value) => {
  emit('update:op-expr', value);
});

watch(localPath, (value) => {
  emit('update:path', value);
});

function handleClose() {
  emit('update:visible', false);
  emit('close');
}

function handleRunTest() {
  // 在发出事件之前，先打印调试信息，适用于所有情况
  eraLogger.log('测试模式:', testMode.value);
  eraLogger.log('发送测试信息:', {
    ifExpr: localIfExpr.value,
    opExpr: localOpExpr.value,
    path: localPath.value,
    rulesData: props.rulesData
  });

  switch (testMode.value) {
    case 'all':
    case 'rule':
      runRulesTest(props.rulesData || []);
      break;
    default:
      runSingleTest({
        ifExpr: localIfExpr.value,
        opExpr: localOpExpr.value,
        path: localPath.value
      });
  }
}

function runSingleTest(data: { ifExpr: string; opExpr: string; path: string }) {
  try {
    // 打印传入的数据用于调试
    eraLogger.log('Received test data:', data);

    const snap = JSON.parse(JSON.stringify(props.statData));
    const testData = JSON.parse(JSON.stringify(props.statData));

    if (!data.path) {
      localResultText.value = '请输入测试路径';
      return;
    }

    const result = DSLHandler.testDsl(
      testData,
      snap,
      data.path,
      data.ifExpr,
      data.opExpr
    );

    localResultText.value = result;
  } catch (error) {
    localResultText.value = `测试失败: ${error}`;
  }
}

function runRulesTest(rulesData: Array<{name: string, rule: any}>) {
  try {
    let output = '';

    if (rulesData.length > 1) {
      output = '所有规则 DSL 表达式测试\n';
      output += '='.repeat(50) + '\n\n';
    } else if (rulesData.length === 1) {
      output = `规则: ${rulesData[0].name}\n`;
      output += `路径: ${rulesData[0].rule.path}\n`;
      output += '='.repeat(50) + '\n\n';
    }

    // 遍历所有规则
    for (const {name, rule} of rulesData) {
      if (!rule.handle || Object.keys(rule.handle).length === 0) {
        output += `(跳过 - 无handle)\n`;
        if (rulesData.length > 1) {
          output += '-'.repeat(40) + '\n';
        }
        continue;
      }

      // 准备规则测试数据
      const handles = Object.entries(rule.handle as Record<string, any>).map(([key, handleItem]) => ({
        key,
        order: handleItem.order || 0,
        ifExpr: handleItem.if || '',
        opExpr: handleItem.op || ''
      }));

      // 按顺序排序handles
      const sortedHandles = [...handles].sort((a, b) => a.order - b.order);

      // 初始化测试数据和快照
      const testData = JSON.parse(JSON.stringify(props.statData || {}));
      const snapshot = JSON.parse(JSON.stringify(props.statData || {}));

      // 依次执行每个handle
      for (let i = 0; i < sortedHandles.length; i++) {
        const handle = sortedHandles[i];
        output += `第 ${i+1} 步 - handle: ${handle.key} (顺序: ${handle.order})\n`;

        try {
          // 使用当前testData作为输入进行测试
          const result = DSLHandler.testDsl(
            testData,  // 直接传入testData，让testDsl内部修改它
            snapshot,
            rule.path,
            handle.ifExpr || '',
            handle.opExpr || ''
          );

          output += result.split('\n').join('\n') + '\n';
        } catch (error) {
          output += `测试执行出错: ${error}\n`;
        }

        output += '-'.repeat(25) + '\n';
      }

      if (rulesData.length > 1) {
        output += '-'.repeat(40) + '\n';
      }
    }

    localResultText.value = output;
  } catch (error) {
    localResultText.value = `测试运行失败: ${error}`;
  }
}
</script>

<style scoped lang="scss">
.dsl-tester-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dsl-tester-content {
  background: white;
  width: 90%;
  max-width: 800px;
  height: 70vh;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.tester-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.tester-body {
  flex: 1;
  display: flex;
  min-height: 0;
  overflow: hidden;
}

.tester-inputs {
  flex: 0 0 40%;
  padding: 16px;
  overflow-y: auto;
  border-right: 1px solid #e2e8f0;
}

.tester-inputs .field {
  display: flex;
  flex-direction: column;
  margin-bottom: 12px;
}

.tester-inputs .field label {
  width: auto;
  margin-bottom: 4px;
  font-size: 12px;
  color: #1f2937;
}

.tester-inputs input {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  font-size: 12px;
}

.tester-inputs input:disabled {
  background-color: #f3f4f6;
  color: #6b7280;
}

.tester-actions {
  margin-top: 20px;
  display: flex;
  gap: 8px;
}

.tester-output {
  flex: 0 0 60%;
  padding: 16px;
  overflow-y: auto;
}

.tester-output h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #111827;
}

.tester-output pre {
  margin: 0;
  padding: 12px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  max-height: calc(100% - 30px);
  overflow-y: auto;
}

.empty-result {
  padding: 20px;
  text-align: center;
  color: #374151;
  font-style: italic;
}

.btn {
  padding: 5px 12px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  background: #f3f4f6;
  color: #111827;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

.btn:hover {
  background: #e5e7eb;
}

.btn.small {
  padding: 3px 8px;
  font-size: 11px;
}

.btn.primary {
  background: #6366f1;
  color: #fff;
}

.btn.primary:hover {
  background: #4f46e5;
}

@media (max-width: 768px) {
  .tester-body {
    flex-direction: column;
  }

  .tester-inputs,
  .tester-output {
    flex: none;
    width: 100%;
    height: auto;
    max-height: 50%;
    overflow-y: auto;
  }

  .tester-inputs {
    border-right: none;
    border-bottom: 1px solid #e2e8f0;
  }
}
</style>