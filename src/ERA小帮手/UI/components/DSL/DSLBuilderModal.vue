<template>
  <div v-if="visible" class="dsl-builder-modal" @click.self="handleClose">
    <div class="dsl-builder-content">
      <div class="dsl-header">
        <h3>{{ title }}</h3>
        <button class="btn small" @click="handleClose">×</button>
      </div>

      <div class="dsl-builder-body">
        <!-- 左侧：构建组件 -->
        <div class="dsl-components">
          <div class="component-section">
            <h4>路径选择</h4>
            <button class="btn small" @click="addComponent('$[$this]')">当前路径 ($[$this])</button>
            <button class="btn small" @click="$emit('select-path')">选择其他路径...</button>
            <div v-if="selectedPath" class="selected-path">
              已选择: {{ selectedPath }}
            </div>
          </div>

          <div v-if="type === 'if'" class="component-section">
            <h4>比较运算符</h4>
            <div class="operator-grid">
              <button class="btn small" @click="addComponent('?[==]')">等于 (==)</button>
              <button class="btn small" @click="addComponent('?[>]')">大于 (>)</button>
              <button class="btn small" @click="addComponent('?[<]')">小于 (&lt;)</button>
              <button class="btn small" @click="addComponent('?[>=]')">大于等于 (>=)</button>
              <button class="btn small" @click="addComponent('?[<=]')">小于等于 (&ge;)</button>
            </div>
          </div>

          <div v-if="type === 'op'" class="component-section">
            <h4>算术运算符</h4>
            <div class="operator-grid">
              <button class="btn small" @click="addComponent('#[+]')">加 (+)</button>
              <button class="btn small" @click="addComponent('#[-]')">减 (-)</button>
              <button class="btn small" @click="addComponent('#[*]')">乘 (*)</button>
              <button class="btn small" @click="addComponent('#[/]')">除 (/)</button>
              <button class="btn small" @click="addComponent('#[%]')">取余 (%)</button>
              <button class="btn small" @click="addComponent('#[**]')">幂 (**)</button>
            </div>

            <h4>函数运算符</h4>
            <div class="operator-grid">
              <button class="btn small" @click="addComponent('#[{ln}]')">自然对数 (ln)</button>
              <button class="btn small" @click="addComponent('#[{log2}]')">对数 (log2)</button>
              <button class="btn small" @click="addComponent('#[{sqrt}]')">平方根 (sqrt)</button>
              <button class="btn small" @click="addComponent('#[{abs}]')">绝对值 (abs)</button>
              <button class="btn small" @click="addComponent('#[{floor}]')">向下取整 (floor)</button>
              <button class="btn small" @click="addComponent('#[{ceil}]')">向上取整 (ceil)</button>
            </div>
          </div>

          <div class="component-section">
            <h4>逻辑运算符</h4>
            <div class="operator-grid">
              <button class="btn small" @click="addComponent('?[&&]')">与 (&&)</button>
              <button class="btn small" @click="addComponent('?[||]')">或 (||)</button>
              <button class="btn small" @click="addParentheses">添加括号 ()</button>
            </div>
          </div>

          <div class="component-section">
            <h4>值</h4>
            <div class="value-input">
              <input v-model="customValue" placeholder="输入值" @keyup.enter="addCustomValue" />
              <select v-model="valueType">
                <option value="num">数字</option>
                <option value="str">字符串</option>
                <option value="bool">布尔值</option>
              </select>
              <button class="btn small primary" @click="addCustomValue">添加值</button>
            </div>
          </div>
        </div>

        <!-- 右侧：表达式预览和编辑 -->
        <div class="dsl-preview-area">
          <div class="expression-preview">
            <h4>表达式预览</h4>
            <div class="expression-display">
              <code>{{ previewExpression }}</code>
            </div>
            <div class="expression-raw">
              <strong>原始表达式:</strong>
              <pre>{{ rawExpression }}</pre>
            </div>
          </div>

          <div class="expression-editor">
            <h4>手动编辑</h4>
            <textarea
              v-model="localExpression"
              rows="4"
              placeholder="可以在此处手动编辑表达式..."
            ></textarea>
            <div class="editor-actions">
              <button class="btn small danger" @click="clearExpression">清空</button>
              <button class="btn small" @click="$emit('validate')">验证</button>
            </div>
          </div>

          <div class="dsl-actions">
            <button class="btn primary" @click="handleApply">应用表达式</button>
            <button class="btn" @click="handleClose">取消</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

interface Props {
  visible: boolean;
  type: 'if' | 'op';
  expression: string;
  selectedPath?: string;
}

interface Emits {
  (e: 'update:visible', value: boolean): void;
  (e: 'update:expression', value: string): void;
  (e: 'close'): void;
  (e: 'apply', expression: string): void;
  (e: 'add-component', component: string): void;
  (e: 'select-path'): void;
  (e: 'validate'): void;
}

const props = withDefaults(defineProps<Props>(), {
  selectedPath: ''
});

const emit = defineEmits<Emits>();

const customValue = ref('');
const valueType = ref<'num' | 'str' | 'bool'>('num');
const localExpression = ref(props.expression);

// 同步prop到本地ref
watch(() => props.expression, (newVal) => {
  localExpression.value = newVal;
});

// 同步本地ref到prop
watch(localExpression, (newVal) => {
  emit('update:expression', newVal);
});

const title = computed(() => {
  return props.type === 'if' ? '条件表达式构建器' : '操作表达式构建器';
});

const previewExpression = computed(() => {
  if (!localExpression.value) return '';
  return props.type === 'if'
    ? `<<if> ${localExpression.value}>`
    : `<<op> ${localExpression.value}>`;
});

const rawExpression = computed(() => localExpression.value);

function handleClose() {
  emit('update:visible', false);
  emit('close');
  customValue.value = '';
}

function handleApply() {
  if (!localExpression.value.trim()) {
    return;
  }
  emit('apply', localExpression.value.trim());
  handleClose();
}

function addComponent(component: string) {
  emit('add-component', component);
}

function addParentheses() {
  emit('add-component', '()');
}

function addCustomValue() {
  if (!customValue.value.trim()) {
    return;
  }

  let valueString = '';
  switch (valueType.value) {
    case 'num':
      valueString = `&[{num}${customValue.value}]`;
      break;
    case 'str':
      valueString = `&[{str}${customValue.value}]`;
      break;
    case 'bool':
      valueString = `&[{bool}${customValue.value}]`;
      break;
  }

  emit('add-component', valueString);
  customValue.value = '';
}

function clearExpression() {
  localExpression.value = '';
  emit('update:expression', '');
}

// 监听visible变化，清空自定义值
watch(() => props.visible, (newVal) => {
  if (!newVal) {
    customValue.value = '';
  }
});
</script>

<style scoped lang="scss">
.dsl-builder-modal {
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

.dsl-builder-content {
  background: white;
  width: 90%;
  max-width: 1000px;
  height: 80vh;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dsl-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.dsl-builder-body {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.dsl-components {
  flex: 0 0 40%;
  padding: 16px;
  overflow-y: auto;
  border-right: 1px solid #e2e8f0;
  background: #f9fafb;
}

.component-section {
  margin-bottom: 20px;
}

.component-section h4 {
  margin: 0 0 8px 0;
  font-size: 13px;
  color: #4b5563;
}

.operator-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
  margin-bottom: 8px;
}

.value-input {
  display: flex;
  gap: 6px;
  align-items: center;
}

.value-input input,
.value-input select {
  flex: 1;
  padding: 4px 6px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  font-size: 12px;
}

.selected-path {
  margin-top: 8px;
  padding: 6px;
  background: #e8f4fd;
  border: 1px solid #b3d4fc;
  border-radius: 4px;
  font-size: 11px;
  color: #0369a1;
}

.dsl-preview-area {
  flex: 0 0 60%;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
}

.expression-preview,
.expression-editor {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 12px;
}

.expression-display {
  margin: 8px 0;
  padding: 10px;
  background: #f8fafc;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
  overflow-x: auto;
}

.expression-raw {
  margin-top: 10px;
  font-size: 11px;
}

.expression-raw pre {
  margin: 4px 0 0 0;
  padding: 6px;
  background: #f3f4f6;
  border-radius: 4px;
  overflow-x: auto;
}

.expression-editor textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
  resize: vertical;
}

.editor-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.dsl-actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
  justify-content: flex-end;
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

.btn.danger {
  background: #ef4444;
  color: #fff;
}

.btn.danger:hover {
  background: #dc2626;
}

@media (max-width: 768px) {
  .dsl-builder-body {
    flex-direction: column;
  }

  .dsl-components,
  .dsl-preview-area {
    flex: none;
    width: 100%;
    height: auto;
    max-height: 50%;
    overflow-y: auto;
  }

  .dsl-components {
    border-right: none;
    border-bottom: 1px solid #e2e8f0;
  }

  .operator-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>
