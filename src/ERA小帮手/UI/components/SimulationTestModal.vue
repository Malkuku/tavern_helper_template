<template>
  <div v-if="visible" class="simulation-test-modal" @click.self="handleClose">
    <div class="simulation-test-content">
      <div class="tester-header">
        <h3>模拟测试</h3>
        <button class="btn small" @click="handleClose">×</button>
      </div>

      <div class="tester-body">
        <div class="tester-inputs">
          <div class="field">
            <label>导入的数据:</label>
            <textarea 
              v-model="localImportedDataText" 
              placeholder="导入的测试数据将显示在这里"
              readonly
            ></textarea>
          </div>

          <div class="field">
            <label>测试结果:</label>
            <textarea 
              v-model="localResultDataText" 
              placeholder="测试结果将显示在这里"
              readonly
            ></textarea>
          </div>

          <div class="field">
            <label>执行日志:</label>
            <textarea 
              v-model="localExecutionLog" 
              placeholder="执行过程日志将显示在这里"
              readonly
            ></textarea>
          </div>

          <div class="tester-actions">
            <button class="btn" @click="handleClose">关闭</button>
          </div>
        </div>

        <div class="tester-output">
          <h4>数据对比视图</h4>
          <div class="data-comparison">
            <div class="data-section">
              <h5>原始数据</h5>
              <pre>{{ localImportedDataFormatted }}</pre>
            </div>
            <div class="data-section">
              <h5>测试结果</h5>
              <pre>{{ localResultDataFormatted }}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';

interface Props {
  visible: boolean;
  importedData?: any;
  resultData?: any;
  executionLog?: string;
}

interface Emits {
  (e: 'update:visible', value: boolean): void;
  (e: 'close'): void;
}

const props = withDefaults(defineProps<Props>(), {
  importedData: () => ({}),
  resultData: () => ({}),
  executionLog: ''
});

const emit = defineEmits<Emits>();

// 创建本地响应式变量
const localImportedDataText = ref('');
const localResultDataText = ref('');
const localExecutionLog = ref('');

// 格式化显示数据
const localImportedDataFormatted = computed(() => {
  try {
    return JSON.stringify(props.importedData, null, 2);
  } catch (e) {
    return '无法格式化数据';
  }
});

const localResultDataFormatted = computed(() => {
  try {
    return JSON.stringify(props.resultData, null, 2);
  } catch (e) {
    return '无法格式化数据';
  }
});

// 监听props变化并更新本地变量
watch(() => props.importedData, (newVal) => {
  try {
    localImportedDataText.value = JSON.stringify(newVal, null, 2);
  } catch (e) {
    localImportedDataText.value = '无法序列化数据';
  }
}, { deep: true, immediate: true });

watch(() => props.resultData, (newVal) => {
  try {
    localResultDataText.value = JSON.stringify(newVal, null, 2);
  } catch (e) {
    localResultDataText.value = '无法序列化数据';
  }
}, { deep: true, immediate: true });

watch(() => props.executionLog, (newVal) => {
  localExecutionLog.value = newVal;
}, { immediate: true });

function handleClose() {
  emit('update:visible', false);
  emit('close');
}
</script>

<style scoped lang="scss">
.simulation-test-modal {
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

.simulation-test-content {
  background: white;
  width: 90%;
  max-width: 1000px;
  height: 80vh;
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
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.tester-inputs .field {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.tester-inputs .field label {
  width: auto;
  margin-bottom: 4px;
  font-size: 12px;
  color: #1f2937;
}

.tester-inputs textarea {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  font-size: 12px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  resize: none;
  min-height: 80px;
}

.tester-inputs textarea:disabled {
  background-color: #f3f4f6;
  color: #6b7280;
}

.tester-actions {
  margin-top: 10px;
  display: flex;
  gap: 8px;
  justify-content: flex-end;
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

.data-comparison {
  display: flex;
  flex-direction: column;
  gap: 15px;
  height: 100%;
}

.data-section {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.data-section h5 {
  margin: 0 0 8px 0;
  font-size: 13px;
  color: #374151;
}

.data-section pre {
  flex: 1;
  margin: 0;
  padding: 12px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 11px;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  overflow-y: auto;
  max-height: calc(50% - 20px);
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