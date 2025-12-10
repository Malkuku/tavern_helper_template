<template>
  <div class="simulation-test">
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

    <!-- 路径收集框 -->
    <PathCollection
      :paths="collectedPaths"
      :is-expanded="isPathCollectionExpanded"
      @update:is-expanded="isPathCollectionExpanded = $event"
      @remove-path="removePath"
      @clear-all="clearAllPaths"
    />

    <div class="json-tree-box">
      <json-tree :data="testResult || statData" @send-path="collectPath" />
    </div>

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
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import JsonTree from '../components/JsonNode/JsonTree.vue';
import DslTesterModal from '../components/DSL/DSLTesterModal.vue';
import FileImportExport from '../components/FileImportExport.vue';
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
const testResult = ref<any>();

// DSL 测试器相关
const showDslTester = ref(false);
const testIfExpr = ref<string>('');
const testOpExpr = ref<string>('');
const testPath = ref<string>('');
const testRulesData = ref<Array<{name: string, rule: any}> | null>(null);
const testResultText = ref<string>('');

// 路径收集相关
const collectedPaths = ref<string[]>([]);
const isPathCollectionExpanded = ref(false);

const collectPath = (path: string) => {
  // 添加路径到收集列表
  if (!collectedPaths.value.includes(path)) {
    collectedPaths.value.push(path);
    toastr.success('路径已复制到收集箱', '');
  } else {
    toastr.warning('路径已在收集箱中', '');
  }
};

const removePath = (index: number) => {
  collectedPaths.value.splice(index, 1);
};

const clearAllPaths = () => {
  collectedPaths.value = [];
};

const hasCustomTestData = computed(() => {
  const original = getVariables({ type: 'chat' }).stat_data;
  return JSON.stringify(props.statData) !== JSON.stringify(original);
});

const runTest = () => {
  try {
    const snap = JSON.parse(JSON.stringify(props.statData));
    const clone = JSON.parse(JSON.stringify(props.statData));
    testResult.value = EraDataHandler.applyRule(clone, snap, props.rules);
    toastr.success('测试运行成功', '');
  } catch (error) {
    toastr.error('测试运行失败: ' + error, '');
  }
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

const handleTestDataLoaded = (content: string, _file: File) => {
  try {
    const testData = JSON.parse(content);

    // 验证数据结构
    if (typeof testData !== 'object' || testData === null) {
      toastr.error('无效的 JSON 数据', '');
      return;
    }

    // 将导入的数据设为当前测试数据
    emit('update-stat-data', testData);
    toastr.success('测试数据导入成功', '');
  } catch (error) {
    toastr.error('文件读取失败: ' + error, '');
  }
};

const exportTestResults = () => {
  try {
    // 导出当前测试结果或原始数据
    const dataToExport = testResult.value || props.statData;
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
    toastr.success('测试数据导出成功', '');
  } catch (error) {
    toastr.error('导出失败: ' + error, '');
  }
};

const resetToOriginalData = () => {
  // 重置为原始数据
  const { stat_data } = getVariables({ type: 'chat' });
  emit('update-stat-data', stat_data || {});
  toastr.success('已恢复原始数据', '');
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
  gap: 8px;
  margin-bottom: 12px;
}

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
