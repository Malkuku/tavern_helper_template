<template>
  <div class="settings-layout">
    <header class="settings-header">
      <h1 class="title">祈奉</h1>
      <div class="subtitle">SYSTEM SETTINGS</div>
    </header>

    <div class="settings-content">
      <!-- 版本信息 -->
      <div class="info-row">
        <span class="label">当前版本</span>
        <span class="value">Ver. {{ systemSettings?.当前版本 || '1.0.0' }}</span>
      </div>

      <!-- 当前剧本展示 -->
      <div v-if="currentScenario" class="scenario-display-section">
        <div class="section-title">当前剧本</div>
        <ScenarioVisualCard :theme-id="currentScenario.themeId" :name="currentScenario.name" active compact />
      </div>

      <div v-else class="scenario-display-section">
        <div class="section-title">当前剧本</div>
        <div class="no-scenario">
          <span>暂无进行中的剧本</span>
        </div>
      </div>

      <!-- 新增：叙事节奏配置 -->
      <div class="pace-section">
        <div class="section-title">叙事节奏</div>
        <!-- 直接使用组件，不传 modelValue 即为“非受控模式”，组件内部会自动处理 API 调用 -->
        <NarrativePaceSelector />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useStatStore } from '@/尘史使徒/UI/store/StatStore';
import NarrativePaceSelector from '@/尘史使徒/UI/components/story/NarrativePaceSelector.vue';
import ScenarioVisualCard from '@/尘史使徒/UI/components/scenario/ScenarioVisualCard.vue';
import type { ScenarioSourceBundle } from '../../../创意工坊/scenario/types';
import { loadScenarioSourceFromWorldbook } from '../../../创意工坊/scenario/worldbookSource';

const statStore = useStatStore();
const { stat_data } = storeToRefs(statStore);
const scenarioSource = ref<ScenarioSourceBundle>();

// 获取系统设置数据
const systemSettings = computed(() => stat_data.value?.system);

// 计算当前匹配的剧本信息
const currentScenario = computed(() => {
  const currentName = systemSettings.value?.当前剧本;
  if (!currentName) return null;
  const scenario = Object.values(scenarioSource.value?.scenarios ?? {}).find(item => item.key === currentName);
  return {
    name: currentName,
    themeId: scenario?.视觉方案 ?? '破镜',
  };
});

onMounted(async () => {
  try {
    scenarioSource.value = await loadScenarioSourceFromWorldbook();
  } catch (error) {
    console.warn('当前剧本展示无法读取世界书元数据：', error);
  }
});
</script>

<style scoped>
/* 引入基础变量，保持风格一致 */
.settings-layout {
  --c-gold: #a48b57;
  --c-gold-dim: rgba(164, 139, 87, 0.3);
  --c-text-main: #e0e0e0;
  --c-text-dim: #8a92a0;
  --c-bg-card: rgba(0, 0, 0, 0.6);
  --font-title: 'Cinzel', serif;
  --font-body: 'EB Garamond', serif;

  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 40px;
  color: var(--c-text-main);
  font-family: var(--font-body);
  overflow-y: auto;
}

.settings-header {
  text-align: center;
  margin-bottom: 40px;
  border-bottom: 1px solid var(--c-gold-dim);
  padding-bottom: 20px;
}

.title {
  font-family: var(--font-title);
  font-size: 2.5rem;
  color: var(--c-gold);
  margin: 0;
  text-shadow: 0 0 10px rgba(164, 139, 87, 0.3);
}

.subtitle {
  font-family: var(--font-title);
  font-size: 0.9rem;
  color: var(--c-text-dim);
  letter-spacing: 4px;
  margin-top: 10px;
}

.settings-content {
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 30px;
  padding-bottom: 40px; /* 底部留白 */
}

/* 版本信息行样式 */
.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: var(--c-bg-card);
  border: 1px solid var(--c-gold-dim);
  border-radius: 4px;
}

.label {
  font-family: var(--font-title);
  color: var(--c-gold);
  font-size: 1.1rem;
}

.value {
  font-family: var(--font-body);
  color: var(--c-text-main);
  font-size: 1.2rem;
}

.section-title {
  font-family: var(--font-title);
  color: var(--c-text-dim);
  margin-bottom: 15px;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.no-scenario {
  padding: 40px;
  text-align: center;
  border: 1px dashed var(--c-text-dim);
  color: var(--c-text-dim);
}
</style>
