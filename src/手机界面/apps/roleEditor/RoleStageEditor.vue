<template>
  <section class="pre-card pre-stage">
    <div class="pre-section-title">
      <h2>{{ kind }}</h2>
      <button v-if="optional && modelValue" type="button" @click="$emit('update:modelValue', undefined)">
        使用通用阶段
      </button>
    </div>
    <template v-if="modelValue">
      <div class="pre-stage-progress">
        <label
          >当前等级<input :value="modelValue.当前等级" type="number" step="1" @input="setNumber('当前等级', $event)"
        /></label>
        <label
          >经验余额<input :value="modelValue.累计经验" type="number" @input="setNumber('累计经验', $event)"
        /></label>
      </div>
      <p class="pre-hint">
        {{
          runtime ? '保存会修改当前剧情进度。' : '用于新角色的初始进度；替换已有角色默认保留剧情阶段。'
        }}经验余额可以为负。
      </p>
      <p class="pre-stage-preview">
        当前阶段：{{ modelValue.描述[String(modelValue.当前等级)] || '缺少当前等级描述，请补充' }}
      </p>
      <details v-for="level in levels" :key="level" class="pre-level" :open="Number(level) === modelValue.当前等级">
        <summary>{{ level }} 级{{ Number(level) === modelValue.当前等级 ? ' · 当前阶段' : '' }}</summary>
        <label
          >阶段描述<textarea :value="modelValue.描述[level]" rows="4" @input="setDescription(level, $event)"></textarea>
        </label>
        <label v-if="limits"
          >此阶段的核心能力限制<textarea
            :value="limits[level] ?? ''"
            rows="3"
            @input="$emit('update:limits', { ...limits, [level]: ($event.target as HTMLTextAreaElement).value })"
          ></textarea>
        </label>
        <button type="button" :disabled="Number(level) === modelValue.当前等级" @click="removeLevel(level)">
          删除此等级
        </button>
      </details>
      <div class="pre-list-row">
        <input v-model="newLevel" type="number" step="1" aria-label="新等级" placeholder="等级编号" />
        <button type="button" @click="addLevel">＋ 添加等级</button>
      </div>
      <p v-if="error" class="pre-notice error" role="alert">{{ error }}</p>
    </template>
    <template v-else>
      <p class="pre-hint">
        {{ runtime ? '此角色尚未配置该阶段。' : '未配置专属阶段，加入剧情时使用世界书通用模板。' }}
      </p>
      <button type="button" @click="$emit('update:modelValue', { 当前等级: 0, 累计经验: 0, 描述: { '0': '' } })">
        配置专属阶段
      </button>
    </template>
  </section>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue';
import type { 阶段状态 } from '../../types';
const props = defineProps<{
  modelValue?: 阶段状态;
  kind: string;
  optional?: boolean;
  runtime?: boolean;
  limits?: Record<string, string>;
}>();
const emit = defineEmits<{
  'update:modelValue': [value: 阶段状态 | undefined];
  'update:limits': [value: Record<string, string>];
}>();
const newLevel = ref('');
const error = ref('');
const levels = computed(() => Object.keys(props.modelValue?.描述 ?? {}).sort((a, b) => Number(a) - Number(b)));
function setNumber(field: '当前等级' | '累计经验', event: Event) {
  if (props.modelValue)
    emit('update:modelValue', { ...props.modelValue, [field]: Number((event.target as HTMLInputElement).value) });
}
function setDescription(level: string, event: Event) {
  if (props.modelValue)
    emit('update:modelValue', {
      ...props.modelValue,
      描述: { ...props.modelValue.描述, [level]: (event.target as HTMLTextAreaElement).value },
    });
}
function addLevel() {
  if (!props.modelValue) return;
  const level = Number(newLevel.value);
  if (!newLevel.value.trim() || !Number.isSafeInteger(level) || Object.hasOwn(props.modelValue.描述, String(level))) {
    error.value = '请填写尚未使用的整数等级。';
    return;
  }
  emit('update:modelValue', { ...props.modelValue, 描述: { ...props.modelValue.描述, [level]: '' } });
  newLevel.value = '';
  error.value = '';
}
function removeLevel(level: string) {
  if (!props.modelValue || Number(level) === props.modelValue.当前等级) return;
  const descriptions = { ...props.modelValue.描述 };
  delete descriptions[level];
  emit('update:modelValue', { ...props.modelValue, 描述: descriptions });
  if (props.limits) {
    const limits = { ...props.limits };
    delete limits[level];
    emit('update:limits', limits);
  }
}
</script>
