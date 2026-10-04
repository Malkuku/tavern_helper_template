<template>
  <nav class="pre-tabs" aria-label="角色内容分区">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      type="button"
      :class="{ active: active === tab.id }"
      :aria-pressed="active === tab.id"
      @click="active = tab.id"
    >
      {{ tab.label }}
    </button>
  </nav>
  <section v-show="active === 'identity'" class="pre-card">
    <h2>身份与检索</h2>
    <RoleListField v-if="type === '次要角色'" v-model="data.身份" label="身份" />
    <RoleListField v-else v-model="data.基础信息.身份" label="身份" />
    <template v-if="type !== 'user'">
      <RoleListField v-model="data.名称检索词" label="名称检索词" />
      <RoleListField v-model="data.区域检索词" label="区域检索词" />
    </template>
  </section>
  <section v-if="type === '主要角色'" v-show="active === 'appearance'" class="pre-card">
    <h2>魔法少女形态</h2>
    <label>正常形态<textarea v-model="data.外貌.魔法少女形态.正常" rows="5"></textarea></label>
    <label>恶堕形态<textarea v-model="data.外貌.魔法少女形态.恶堕" rows="5"></textarea></label>
    <label>基础能力<textarea v-model="data.魔法少女能力.基础能力" rows="4"></textarea></label>
  </section>
  <section v-if="type !== 'user'" v-show="active === 'body'" class="pre-card">
    <h2>身体状态</h2>
    <RoleListField
      v-if="data.身体.特殊状态.every((value: unknown) => typeof value === 'string')"
      v-model="data.身体.特殊状态"
      label="特殊状态"
    />
    <p v-else class="pre-hint">特殊状态含结构化内容，请通过完整数据编辑；其他身体字段仍可修改。</p>
    <details v-for="part in bodyParts" :key="part" class="pre-level">
      <summary>{{ part }} · {{ data.身体[part].当前状态 || '未记录' }}</summary>
      <label v-for="field in ['当前状态', '特征', '开发程度']" :key="field"
        >{{ field }}<textarea v-model="data.身体[part][field]" rows="3"></textarea>
      </label>
    </details>
  </section>
  <div v-if="type !== 'user'" v-show="active === 'stages'">
    <RoleStageEditor
      v-for="kind in stageKinds"
      :key="kind"
      :model-value="data.人设阶段?.[kind]"
      :kind="kind"
      :optional="type === '次要角色' && !runtime"
      :runtime="runtime"
      :limits="kind === '创伤稳定度' ? data.魔法少女能力.核心能力限制 : undefined"
      @update:model-value="updateStage(kind, $event)"
      @update:limits="data.魔法少女能力.核心能力限制 = $event"
    />
  </div>
  <section v-if="type === '次要角色'" v-show="active === 'ability'" class="pre-card">
    <h2>能力</h2>
    <RoleListField v-model="data.能力描述" label="能力描述" />
  </section>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue';
import type { PhoneRoleType } from './roleAssets';
import type { 阶段状态 } from '../../types';
import RoleListField from './RoleListField.vue';
import RoleStageEditor from './RoleStageEditor.vue';
const data = defineModel<Record<string, any>>('data', { required: true });
const props = defineProps<{ type: PhoneRoleType; runtime?: boolean }>();
const active = ref('identity');
const bodyParts = ['小穴', '口穴', '菊穴', '胸部'];
const tabs = computed(() => [
  { id: 'identity', label: '身份检索' },
  ...(props.type === '主要角色' ? [{ id: 'appearance', label: '形态能力' }] : []),
  ...(props.type !== 'user'
    ? [
        { id: 'stages', label: '人设阶段' },
        { id: 'body', label: '身体状态' },
      ]
    : []),
  ...(props.type === '次要角色' ? [{ id: 'ability', label: '能力描述' }] : []),
]);
const stageKinds = computed(() =>
  props.type === '主要角色' ? ['创伤稳定度', '好感度', '恶堕度'] : ['好感度', '恶堕度'],
);
function updateStage(kind: string, value?: 阶段状态) {
  if (value) {
    data.value.人设阶段 ??= {};
    data.value.人设阶段[kind] = value;
  } else if (data.value.人设阶段) {
    delete data.value.人设阶段[kind];
  }
}
</script>
