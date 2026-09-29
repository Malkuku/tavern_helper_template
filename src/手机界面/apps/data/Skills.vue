<template>
  <div class="data-intro">
    <span>能力记录</span>
    <h1>技能</h1>
    <p>当前持有的完整技能效果 · 已启用 {{ enabledCount }} / {{ slots }} · 持有 {{ skillEntries.length }}</p>
  </div>
  <div v-if="skillEntries.length" class="data-sections">
    <OwnedAssetCard
      v-for="[name, skill] in skillEntries"
      :key="name"
      :name="name"
      :entry="skill"
      kind="技能"
      :expanded="expandedName === name"
      :class="{ 'skill-disabled': !isSkillEnabled(skill) }"
      @toggle="expandedName = expandedName === name ? '' : name"
    >
      <template #control>
        <label class="skill-enabled-checkbox">
          <input
            type="checkbox"
            :checked="isSkillEnabled(skill)"
            :disabled="saving"
            :aria-label="`${isSkillEnabled(skill) ? '关闭' : '启用'}技能${name}`"
            @click.prevent="toggleSkill(name, !isSkillEnabled(skill))"
          />
          <span>启用</span>
        </label>
      </template>
    </OwnedAssetCard>
  </div>
  <div v-else class="data-empty">
    <strong>暂无技能</strong>
    <p>已习得的技能会显示在这里。</p>
  </div>
  <p v-if="error" class="data-error" role="alert">{{ error }}</p>
</template>

<script setup lang="ts">
import type { 技能, stat_data } from '../../types';
import { computed, ref } from 'vue';
import OwnedAssetCard from './OwnedAssetCard.vue';
import { enabledSkillCount, isSkillEnabled, skillSlotCount } from '../skillShop/skillShop';
import { useMagicGirlStatStore } from '../../store/StatStore';

const props = defineProps<{ data: stat_data }>();
const store = useMagicGirlStatStore();
const skillEntries = computed(() => Object.entries(props.data.角色?.user?.技能 ?? {}) as [string, 技能][]);
const slots = computed(() => skillSlotCount(props.data));
const enabledCount = computed(() => enabledSkillCount(props.data));
const expandedName = ref('');
const saving = ref(false);
const error = ref('');

async function toggleSkill(name: string, enabled: boolean) {
  if (saving.value) return;
  saving.value = true;
  error.value = '';
  try {
    await store.setOwnedSkillEnabled(name, enabled);
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '技能状态保存失败。';
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.skill-enabled-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #f8eef4;
  cursor: pointer;
  font-size: 11px;
}
.skill-enabled-checkbox input {
  accent-color: #dc8eb2;
}
</style>
