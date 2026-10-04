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
      <template #actions>
        <button
          v-if="isSkillEnabled(skill)"
          type="button"
          class="asset-use-button"
          :disabled="saving"
          @click="prepareUse(name)"
        >
          使用技能
        </button>
      </template>
    </OwnedAssetCard>
  </div>
  <div v-else class="data-empty">
    <strong>暂无技能</strong>
    <p>已习得的技能会显示在这里。</p>
  </div>
  <p v-if="error" class="data-error" role="alert">{{ error }}</p>
  <p v-if="notice" class="inventory-notice" role="status">{{ notice }}</p>
</template>

<script setup lang="ts">
import type { 技能, stat_data } from '../../types';
import { computed, ref } from 'vue';
import OwnedAssetCard from './OwnedAssetCard.vue';
import { enabledSkillCount, isSkillEnabled, skillSlotCount } from '../skillShop/skillShop';
import { useMagicGirlStatStore } from '../../store/StatStore';
import { buildUsePrompt } from '@/变量卷轴/UI/usePrompt';

const props = defineProps<{ data: stat_data }>();
const store = useMagicGirlStatStore();
const skillEntries = computed(() => Object.entries(props.data.角色?.user?.技能 ?? {}) as [string, 技能][]);
const slots = computed(() => skillSlotCount(props.data));
const enabledCount = computed(() => enabledSkillCount(props.data));
const expandedName = ref('');
const saving = ref(false);
const error = ref('');
const notice = ref('');

function prepareUse(name: string) {
  error.value = '';
  notice.value = '';
  try {
    const data = getVariables({ type: 'message', message_id: -1 })?.stat_data as stat_data | undefined;
    const prompt = buildUsePrompt(data, 'skills', name, 1);
    const input = window.parent.document.querySelector<HTMLTextAreaElement>('#send_textarea');
    if (!input) throw new Error('未找到酒馆聊天输入框。');
    input.value += `${input.value && !input.value.endsWith('\n') ? '\n' : ''}${prompt}`;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.focus();
    notice.value = '使用意图已填入聊天输入框；发送后由剧情处理实际效果。';
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '填写聊天输入框失败。';
  }
}

async function toggleSkill(name: string, enabled: boolean) {
  if (saving.value) return;
  saving.value = true;
  error.value = '';
  notice.value = '';
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
