<template>
  <div v-if="visible" class="dsl-tester-modal" @click.self="handleClose">
    <div class="dsl-tester-content">
      <div class="tester-header">
        <h3>DSL 表达式测试器</h3>
        <button class="btn small" @click="handleClose">×</button>
      </div>

      <div class="tester-body">
        <div class="tester-inputs">
          <div class="field">
            <label>条件表达式 (if):</label>
            <input v-model="localIfExpr" placeholder="<<if> $[路径] ?[>=] &[{num}40]>" />
          </div>
          <div class="field">
            <label>操作表达式 (op):</label>
            <input v-model="localOpExpr" placeholder="<<op> $[路径] #[+] &[{num}10]>" />
          </div>
          <div class="field">
            <label>测试路径:</label>
            <input v-model="localPath" placeholder="角色.角色A.特殊状态.好感度" />
          </div>

          <div class="tester-actions">
            <button class="btn primary" @click="handleRunTest">运行测试</button>
            <button class="btn" @click="handleClose">关闭</button>
          </div>
        </div>

        <div class="tester-output">
          <h4>测试结果</h4>
          <pre v-if="resultText">{{ resultText }}</pre>
          <div v-else class="empty-result">
            测试结果将显示在这里
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

interface Props {
  visible: boolean;
  ifExpr?: string;
  opExpr?: string;
  path?: string;
  resultText?: string;
}

interface Emits {
  (e: 'update:visible', value: boolean): void;
  (e: 'close'): void;
  (e: 'run-test', data: { ifExpr: string; opExpr: string; path: string }): void;
  (e: 'update:if-expr', value: string): void;
  (e: 'update:op-expr', value: string): void;
  (e: 'update:path', value: string): void;
}

const props = withDefaults(defineProps<Props>(), {
  ifExpr: '',
  opExpr: '',
  path: '',
  resultText: ''
});

const emit = defineEmits<Emits>();

const localIfExpr = ref(props.ifExpr);
const localOpExpr = ref(props.opExpr);
const localPath = ref(props.path);
const resultText = ref(props.resultText);

// 同步props变化到本地refs
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
  resultText.value = value;
});

// 同步本地变化到父组件
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
  emit('run-test', {
    ifExpr: localIfExpr.value,
    opExpr: localOpExpr.value,
    path: localPath.value
  });
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
  color: #4b5563;
}

.tester-inputs input {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  font-size: 12px;
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
  color: #6b7280;
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
