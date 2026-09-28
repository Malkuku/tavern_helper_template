<template>
  <div class="data-app">
    <div class="data-scroll">
      <div v-if="!statStore.statData" class="data-empty">
        <span class="data-empty-mark">✧</span>
        <strong>暂无角色变量</strong>
        <p>暂无可展示的角色资料。</p>
      </div>
      <CharacterObservation
        v-else-if="app === '主要角色' || app === '次要角色'"
        :data="statStore.statData"
        :target-key="targetKey"
        @first-target-chosen="emit('firstTargetChosen')"
      />
      <Profile v-else-if="app === '我的档案'" :data="statStore.statData" />
      <Skills v-else-if="app === '技能'" :data="statStore.statData" />
      <Items v-else-if="app === '随身物品'" :data="statStore.statData" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useMagicGirlStatStore } from '../../store/StatStore';
import type { DataAppName } from '../../desktopApps';
import CharacterObservation from './CharacterObservation.vue';
import Profile from './Profile.vue';
import Skills from './Skills.vue';
import Items from './Items.vue';

defineProps<{ app: DataAppName; targetKey?: string | null }>();
const emit = defineEmits<{ firstTargetChosen: [] }>();
const statStore = useMagicGirlStatStore();
</script>
