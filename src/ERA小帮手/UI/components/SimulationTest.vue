<template>
  <div class="simulation-test">
    <div class="section-header">
      <h2>测试模拟</h2>
    </div>
    <div class="test-controls">
      <button class="btn" @click="openSimulationTestModal">打开模拟测试</button>
      <button class="btn" @click="openDslTester">打开 DSL 测试器</button>
    </div>

    <!-- 路径收集框 -->
    <PathCollection
      :paths="collectedPaths"
      :is-expanded="isPathCollectionExpanded"
      @update:is-expanded="isPathCollectionExpanded = $event"
      @remove-path="removePath"
      @clear-all="clearAllPaths"
    />

    <!-- 模拟测试模态框 -->
    <SimulationTestModal
      :visible="showSimulationModal"
      :imported-data="statData"
      :result-data="testResultData"
      :execution-log="executionLog"
      @update:visible="showSimulationModal = $event"
      @close="closeSimulationModal"
      @run-test="handleRunTest"
    />

    <!-- DSL 测试器模态框 -->
    <DslTesterModal
      :visible="showDslTester"
      :if-expr="testIfExpr"
      :op-expr="testOpExpr"
      :path="testPath"
      :rules-data="testRulesData"
      :stat-data="statData"
      :result-text="testResultText"
      @update:visible="showDslTester = $event"
      @update:if-expr="testIfExpr = $event"
      @update:op-expr="testOpExpr = $event"
      @update:path="testPath = $event"
      @close="closeDslTester"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import DslTesterModal from '../components/DSL/DSLTesterModal.vue';
import SimulationTestModal from '../components/SimulationTestModal.vue';
import PathCollection from '../components/PathCollection.vue';
import { EraDataHandler } from '../../EraDataHandler/EraDataHandler';

const props = defineProps({
  rules: {
    type: Object,
    required: true
  },
  statData: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['update-stat-data']);

// 测试结果
const testResultData = ref<any>();
const executionLog = ref<string>('');

// 模拟测试模态框相关
const showSimulationModal = ref(false);

// DSL 测试器相关
const showDslTester = ref(false);
const testIfExpr = ref<string>('');
const testOpExpr = ref<string>('');
const testPath = ref<string>('');
const testRulesData = ref<Array<{name: string, rule: any}> | null>(null);
const testResultText = ref<string>('');

// 路径收集相关
const collectedPaths = ref<string[]>([]);
const isPathCollectionExpanded = ref(true);

const removePath = (index: number) => {
  collectedPaths.value.splice(index, 1);
};

const clearAllPaths = () => {
  collectedPaths.value = [];
};

onMounted(() => {
  // 页面加载时展开路径收集框
  isPathCollectionExpanded.value = true;
});

// 处理运行测试事件
const handleRunTest = (testData: any) => {
  try {
    const snap = JSON.parse(JSON.stringify(testData));
    const clone = JSON.parse(JSON.stringify(testData));
    const result = EraDataHandler.applyRule(clone, snap, props.rules);
    testResultData.value = result.data;
    executionLog.value = result.log;
    toastr.success('测试运行成功', '');
  } catch (error) {
    toastr.error('测试运行失败: ' + error, '');
  }
};

// 打开模拟测试模态框的方法
const openSimulationTestModal = () => {
  // 重置测试结果
  testResultData.value = null;
  executionLog.value = '';
  showSimulationModal.value = true;
};

const openDslTester = () => {
  showDslTester.value = true;
  testIfExpr.value = '';
  testOpExpr.value = '';
  testPath.value = '';
  testRulesData.value = null;
  testResultText.value = '';
};

const closeDslTester = () => {
  showDslTester.value = false;
};

const closeSimulationModal = () => {
  showSimulationModal.value = false;
};
</script>

<style scoped lang="scss">
.simulation-test {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 0 0 12px 0;
}

.test-controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 12px;
}

.test-controls .btn {
  padding: 8px 16px;
  font-size: 14px;
}

/* 按钮样式 */
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

.btn.small {
  padding: 3px 8px;
  font-size: 11px;
}
</style>
