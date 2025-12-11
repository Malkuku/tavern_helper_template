<template>
  <div v-if="visible" class="dsl-tester-modal">
    <div class="dsl-tester-content">
      <div class="tester-header">
        <h3>{{ modalTitle }}</h3>
        <button class="btn small" @click="handleClose">×</button>
      </div>

      <div class="tester-body">
        <!-- 规则信息展示区域 -->
        <div class="tester-inputs">
          <label>当前加载的规则:</label>
          <div v-if="hasRules" class="rules-list">
            <div v-for="(rule, name) in localHandlesData" :key="name" class="rule-item">
              <div class="rule-row">
                <span class="label">名称:</span>
                <span class="value">{{ name }}</span>
              </div>
              <div class="rule-row">
                <span class="label">路径:</span>
                <span class="value code">{{ rule.path }}</span>
              </div>
              <div class="rule-row">
                <span class="label">启用:</span>
                <span class="value">{{ rule.enable ? '是' : '否' }}</span>
              </div>
            </div>
          </div>
          <div v-else class="no-rules">暂无规则数据</div>
        </div>

        <div class="tester-actions">
          <!-- 新增导入组件 -->
          <FileImportExport
            ref="fileImportRef"
            import-text="导入测试数据"
            :require-confirm="false"
            @file-loaded="handleTestDataLoaded"
            @error="handleImportError"
          />

          <button class="btn primary" :disabled="!hasRules" @click="handleRunTest">运行测试</button>
          <button class="btn" @click="handleClose">关闭</button>

          <!-- 简单的状态提示，不展示具体数据 -->
          <span v-if="isUsingImportedData" class="data-status"> (已加载外部数据) </span>
        </div>

        <div class="tester-output">
          <h4>测试结果</h4>
          <pre v-if="localResultText">{{ localResultText }}</pre>
          <div v-else class="empty-result">测试结果将显示在这里</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { EraDataHandler } from '../../../EraDataHandler/EraDataHandler';
import { eraLogger } from '../../../utils/EraHelperLogger';
import { EraDataRule } from '../../../EraDataHandler/types/EraDataRule';
import FileImportExport from '../FileImportExport.vue';
import { useEraEditStore } from '../../../stores/EraEditStore';

// 引入文件导入组件

interface Props {
  visible?: boolean;
  eraDataRule?: EraDataRule;
  resultText?: string;
  statData?: any;
}

interface Emits {
  (e: 'update:visible', value: boolean): void;
  (e: 'close'): void;
}

const eraEditStore = useEraEditStore();

// 修正：默认值改为空对象，因为 EraDataRule 是一个字典对象
const props = withDefaults(defineProps<Props>(), {
  visible: false,
  eraDataRule: () => ({}),
  resultText: '',
  statData: () => ({}),
});

const emit = defineEmits<Emits>();

// 创建本地响应式变量
const localResultText = ref(props.resultText);
const localHandlesData = ref<EraDataRule>(props.eraDataRule);

// 新增：本地测试数据，默认为 props 传入的数据
const localTestData = ref<any>(props.statData);
// 新增：标记是否使用了导入的数据
const isUsingImportedData = ref(false);
const fileImportRef = ref<InstanceType<typeof FileImportExport> | null>(null);

// 计算属性：判断是否有规则
const hasRules = computed(() => {
  return localHandlesData.value && Object.keys(localHandlesData.value).length > 0;
});

// 计算标题
const modalTitle = computed(() => {
  const keys = localHandlesData.value ? Object.keys(localHandlesData.value) : [];
  if (keys.length > 1) {
    return `DSL 表达式测试器 - ${keys.length} 个规则`;
  } else if (keys.length === 1) {
    return `DSL 表达式测试器 - ${keys[0]}`;
  }
  return 'DSL 表达式测试器';
});

watch(
  () => props.resultText,
  value => {
    localResultText.value = value;
  },
);

watch(
  () => props.eraDataRule,
  value => {
    // 浅拷贝对象，避免直接引用
    localHandlesData.value = value ? { ...value } : {};
  },
  { deep: true },
);

// 监听 props.statData 变化，如果外部数据更新且没有手动导入过数据，则同步更新
watch(
  () => props.statData,
  value => {
    if (!isUsingImportedData.value) {
      localTestData.value = value ? JSON.parse(JSON.stringify(value)) : {};
    }
  },
  { deep: true, immediate: true },
);

// 新增：处理测试数据加载
function handleTestDataLoaded(content: string, file: File) {
  try {
    localTestData.value = JSON.parse(content);
    isUsingImportedData.value = true;

    toastr.success(`成功导入测试数据: ${file.name}`, '');

    // 清空之前的测试结果，提示用户重新运行
    localResultText.value = `数据已导入 (${file.name})，请点击“运行测试”查看结果。`;
  } catch (error) {
    const errorMsg = `JSON解析失败: ${error}`;
    toastr.error(errorMsg, '');
  }
}

// 新增：处理导入错误
function handleImportError(error: string) {
  if (typeof toastr !== 'undefined') {
    toastr.error(`导入失败: ${error}`, '');
  } else {
    console.error(`导入失败: ${error}`);
  }
}

function handleClose() {
  // 关闭时重置导入状态，下次打开恢复默认
  isUsingImportedData.value = false;
  localTestData.value = props.statData ? JSON.parse(JSON.stringify(props.statData)) : {};

  emit('update:visible', false);
  emit('close');
}

async function handleRunTest() {
  if (!hasRules.value) {
    localResultText.value = '没有可测试的规则数据';
    return;
  }

  eraLogger.log('开始运行 DSL 测试...');

  try {
    // 1. 准备测试数据 (深拷贝 localTestData)
    const statData = await eraEditStore.getStatData();

    const testData = JSON.parse(JSON.stringify(localTestData.value));
    const snapData = JSON.parse(JSON.stringify(statData));

    // 2. 调用 EraDataHandler
    // applyRule 签名: (data: any, snap: any, rules: EraDataRule)
    const result = await EraDataHandler.applyRule(testData, snapData, localHandlesData.value);

    // 3. 格式化输出结果
    let output = `=== 执行日志 ===\n${result.log}\n\n`;

    // 如果有数据变更，显示变更详情
    const changes = result.data; // diffObjects 的结果
    if (Object.keys(changes).length > 0) {
      output += `=== 数据变更 ===\n${JSON.stringify(changes, null, 2)}`;
    } else {
      output += `=== 数据变更 ===\n无数据变化`;
    }

    localResultText.value = output;
  } catch (error: any) {
    console.error(error);
    localResultText.value = `测试运行失败:\n${error.message || error}`;
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
  align-items: center; /* 确保按钮垂直居中 */
  flex-wrap: wrap;
}

.data-status {
  font-size: 11px;
  color: #059669;
  margin-left: 4px;
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
