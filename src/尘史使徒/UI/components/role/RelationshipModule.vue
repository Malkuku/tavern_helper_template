<template>
  <div class="relationship-module">
    <RelationshipTargetSelector
      v-if="isEditing"
      v-model="activeTarget"
      :targets="Object.keys(editableData)"
      :options="targetOptions"
      editable
      @add="addRelationship"
      @remove="removeRelationship"
    />
    <div
      v-for="(rel, name) in isEditing ? visibleEditableData : data"
      :key="name"
      class="rel-card"
      :class="{ expanded: expandedState[name] || isEditing }"
    >
      <div class="rel-header" @click="!isEditing && toggleExpand(name)">
        <div class="header-main">
          <span class="rel-name">{{ formatName(name) }}</span>
          <span v-if="!isEditing" class="rel-summary">{{ getSummary(rel) }}</span>
        </div>
        <div v-if="!isEditing" class="toggle-icon">
          {{ expandedState[name] ? '−' : '+' }}
        </div>
      </div>

      <div v-show="expandedState[name] || isEditing" class="rel-details">
        <div class="details-grid">
          <div v-if="rel['认知了解'] || isEditing" class="detail-item">
            <h4 class="detail-title">认知了解</h4>
            <p
              v-if="!isEditing || editingField !== `${name}:认知了解`"
              class="detail-text editable-copy"
              @click="startField(name, '认知了解')"
            >
              {{ rel['认知了解'] || '点击填写认知了解' }}
            </p>
            <textarea
              v-else
              v-model="rel['认知了解']"
              class="edit-textarea"
              autofocus
              @input="updateField"
              @blur="editingField = ''"
            ></textarea>
          </div>

          <div v-if="rel['情感羁绊'] || isEditing" class="detail-item">
            <h4 class="detail-title">情感羁绊</h4>
            <p
              v-if="!isEditing || editingField !== `${name}:情感羁绊`"
              class="detail-text editable-copy"
              @click="startField(name, '情感羁绊')"
            >
              {{ rel['情感羁绊'] || '点击填写情感羁绊' }}
            </p>
            <textarea
              v-else
              v-model="rel['情感羁绊']"
              class="edit-textarea"
              autofocus
              @input="updateField"
              @blur="editingField = ''"
            ></textarea>
          </div>

          <div v-if="rel['利益纽带'] || isEditing" class="detail-item">
            <h4 class="detail-title">利益纽带</h4>
            <p
              v-if="!isEditing || editingField !== `${name}:利益纽带`"
              class="detail-text editable-copy"
              @click="startField(name, '利益纽带')"
            >
              {{ rel['利益纽带'] || '点击填写利益纽带' }}
            </p>
            <textarea
              v-else
              v-model="rel['利益纽带']"
              class="edit-textarea"
              autofocus
              @input="updateField"
              @blur="editingField = ''"
            ></textarea>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import RelationshipTargetSelector from './RelationshipTargetSelector.vue';

const props = defineProps({
  data: { type: Object, default: () => ({}) },
  isEditing: { type: Boolean, default: false },
  targetOptions: { type: Array, default: () => [] },
});
const emit = defineEmits(['update:data']);

const expandedState = ref({});
const editableData = ref({});
const activeTarget = ref('');
const editingField = ref('');
const visibleEditableData = computed(() =>
  activeTarget.value && editableData.value[activeTarget.value]
    ? { [activeTarget.value]: editableData.value[activeTarget.value] }
    : editableData.value,
);

watch(
  () => props.data,
  newVal => {
    editableData.value = JSON.parse(JSON.stringify(newVal || {}));
    if (!activeTarget.value || !(activeTarget.value in editableData.value))
      activeTarget.value = Object.keys(editableData.value)[0] || '';
  },
  { deep: true, immediate: true },
);

const updateField = () => {
  emit('update:data', editableData.value);
};
const startField = (name, field) => {
  if (!props.isEditing) return;
  editingField.value = `${name}:${field}`;
};
const addRelationship = name => {
  editableData.value = { ...editableData.value, [name]: { 认知了解: '', 情感羁绊: '', 利益纽带: '' } };
  activeTarget.value = name;
  updateField();
};
const removeRelationship = name => {
  const next = { ...editableData.value };
  delete next[name];
  editableData.value = next;
  activeTarget.value = Object.keys(next)[0] || '';
  updateField();
};

const toggleExpand = name => {
  expandedState.value[name] = !expandedState.value[name];
};

const getSummary = rel => {
  if (rel['情感羁绊']) return rel['情感羁绊'].length > 25 ? rel['情感羁绊'].slice(0, 25) + '...' : rel['情感羁绊'];
  return '暂无详细描述';
};

const formatName = name => {
  if (name === 'user') {
    try {
      return typeof substitudeMacros === 'function' ? substitudeMacros('{{user}}') : '{{user}}';
    } catch (e) {
      return '你';
    }
  }
  return name;
};
</script>

<style scoped>
.relationship-module {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.rel-card {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
  transition: all 0.3s ease;
}
.rel-card.expanded {
  border-color: var(--c-gold, #d4af37);
  background: rgba(0, 0, 0, 0.5);
}

.rel-header {
  padding: 12px 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.02);
}
.rel-header:hover {
  background: rgba(255, 255, 255, 0.05);
}
.header-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.rel-name {
  font-family: var(--font-title, serif);
  color: var(--c-gold, #d4af37);
  font-size: 1.1rem;
  font-weight: bold;
}
.rel-summary {
  font-size: 0.9rem;
  color: #ccc;
  font-style: italic;
  line-height: 1.4;
}
.toggle-icon {
  color: var(--c-gold, #d4af37);
  font-size: 1.2rem;
  font-weight: bold;
  opacity: 0.7;
}

.rel-details {
  padding: 15px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  animation: slideDown 0.3s ease-out;
}
@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.details-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.detail-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.detail-title {
  margin: 0;
  font-size: 0.95rem;
  color: var(--c-text-dim, #a0a0a0);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 5px;
}
.detail-text {
  margin: 0;
  font-size: 0.85rem;
  color: #ddd;
  line-height: 1.6;
  white-space: pre-wrap;
}
.editable-copy {
  min-height: 28px;
  padding: 6px 8px;
  border: 1px solid transparent;
  cursor: text;
}
.editable-copy:hover {
  background: rgba(255, 255, 255, 0.025);
  border-color: rgba(212, 175, 55, 0.22);
}

.edit-textarea {
  width: 100%;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid var(--c-gold, #d4af37);
  color: #e0e0e0;
  padding: 8px;
  font-family: 'EB Garamond', serif;
  border-radius: 4px;
  resize: vertical;
  min-height: 60px;
}
</style>
