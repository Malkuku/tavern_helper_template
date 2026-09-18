<template>
  <div class="scenario-layout" :class="currentTheme">
    <header class="scenario-header">
      <h1 class="title">剧本选择</h1>
      <div class="subtitle">CHOOSE YOUR DESTINY</div>
    </header>

    <div class="scenario-list">
      <ScenarioVisualCard
        v-for="item in scenarios"
        :key="item.id"
        :theme-id="item.themeId"
        :name="item.name"
        :description="item.desc"
        :active="selectedScenario === item.id"
        :expanded="selectedScenario === item.id"
        :custom-protagonist="item.customProtagonist"
        interactive
        @click="selectScenario(item.id)"
      >
        <button
          class="action-btn start-btn"
          :class="{ 'btn-disabled': !item.isReady }"
          :disabled="loading || !item.isReady"
          @click.stop="confirmStart(item)"
        >
          <span v-if="loading && loadingId === item.id"><i class="loading-spinner"></i> 读取中...</span
          ><span v-else-if="!item.isReady">开发中，敬请期待</span><span v-else>启程</span>
        </button>
      </ScenarioVisualCard>
    </div>

    <!-- 快速基础设定弹窗 -->
    <QuickCharacterSetup
      v-model:visible="showQuickSetup"
      :initial-user="quickSetupUser"
      @complete="onQuickSetupComplete"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import QuickCharacterSetup from '@/尘史使徒/UI/components/start/QuickCharacterSetup.vue';
import ScenarioVisualCard from '@/尘史使徒/UI/components/scenario/ScenarioVisualCard.vue';
import { assembleScenario } from '../../../创意工坊/scenario/assembler';
import { formatScenarioError } from '../../../创意工坊/scenario/errors';
import { applyScenarioToLatestMessage } from '../../../创意工坊/scenario/hostAdapter';
import type { ScenarioSourceBundle, ScenarioThemeId } from '../../../创意工坊/scenario/types';
import { loadScenarioSourceFromWorldbook } from '../../../创意工坊/scenario/worldbookSource';
import { scenarioThemeById } from '../../../创意工坊/scenario/themes';

const selectedScenario = ref('');
const router = useRouter();
const loading = ref(false);
const loadingId = ref('');
const showQuickSetup = ref(false);
const quickSetupUser = ref();
const source = ref<ScenarioSourceBundle>();
interface ScenarioViewModel {
  id: string;
  name: string;
  isReady: boolean;
  themeId: ScenarioThemeId;
  desc: string;
  customProtagonist: boolean;
}
const scenarios = computed(() =>
  Object.entries(source.value?.scenarios ?? {}).map(([id, scenario]) => ({
    id,
    name: scenario.key,
    isReady: scenario.可用,
    themeId: scenario.视觉方案,
    desc: scenario.desc,
    customProtagonist: scenario.自定义主角,
  })),
);

// 计算当前选中的主题类名
const currentTheme = computed(() => {
  const active = scenarios.value.find(s => s.id === selectedScenario.value);
  return active ? scenarioThemeById[active.themeId].className : '';
});

const selectScenario = (id: string) => {
  selectedScenario.value = id;
};

const confirmStart = async (item: ScenarioViewModel) => {
  // 安全检查
  if (!item.isReady) {
    toastr.info(`剧本 [${item.name}] 正在锐意制作中...`);
    return;
  }

  loading.value = true;
  loadingId.value = item.id;

  try {
    const latestSource = await loadScenarioSourceFromWorldbook();
    source.value = latestSource;
    const result = assembleScenario(latestSource, item.id);
    await applyScenarioToLatestMessage(result);

    if (result.scenario.自定义主角) {
      await router.push('/人物创建');
    } else {
      quickSetupUser.value = result.statData.角色.user;
      showQuickSetup.value = true;
    }
  } catch (e) {
    console.error(e);
    toastr.error(`启动失败: ${formatScenarioError(e)}`);
  } finally {
    loading.value = false;
    loadingId.value = '';
  }
};

const onQuickSetupComplete = async () => {
  showQuickSetup.value = false;
  await router.push('/选项');
};

onMounted(async () => {
  try {
    source.value = await loadScenarioSourceFromWorldbook();
  } catch (error) {
    console.error(error);
    toastr.error(`剧本配置读取失败: ${formatScenarioError(error)}`);
  }
});
</script>

<style scoped>
/* 保持之前的 CSS 变量和布局样式不变，仅增加/修改按钮相关样式 */

.scenario-layout {
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
  /* 修改背景：增加径向渐变，颜色由 --theme-glow 控制，实现全局氛围切换 */
  background: radial-gradient(circle at 50% 20%, var(--theme-glow, transparent) 0%, #0a0a0a 80%);
  transition: background 0.6s ease;
}

.scenario-header {
  text-align: center;
  margin-bottom: 40px;
  border-bottom: 1px solid var(--c-gold-dim);
  padding-bottom: 20px;
  z-index: 10;
}

.title {
  font-family: var(--font-title);
  font-size: 2.5rem;
  /* 修改标题颜色：优先使用主题色，实现全局标题变色 */
  color: var(--theme-color, var(--c-gold));
  margin: 0;
  /* 修改阴影：跟随主题光晕 */
  text-shadow: 0 0 15px var(--theme-glow, var(--c-gold-dim));
  transition:
    color 0.5s,
    text-shadow 0.5s;
}

.subtitle {
  font-family: var(--font-title);
  font-size: 0.9rem;
  color: var(--c-text-dim);
  letter-spacing: 4px;
  margin-top: 10px;
}

.scenario-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
  padding-bottom: 40px;
}

/* --- 按钮样式更新 --- */
.action-btn {
  background: transparent;
  border: 1px solid var(--theme-color, var(--c-gold));
  color: var(--theme-color, var(--c-gold));
  font-family: var(--font-title);
  font-size: 1.1rem;
  padding: 10px 30px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-top: auto;
  min-width: 160px; /* 保证按钮宽度一致 */
}

.action-btn:hover:not(:disabled) {
  background: var(--theme-color, var(--c-gold));
  color: #000;
  box-shadow: 0 0 15px var(--theme-color, var(--c-gold));
}

/* 禁用/开发中状态 */
.action-btn:disabled,
.action-btn.btn-disabled {
  border-color: #555;
  color: #777;
  cursor: not-allowed;
  background: rgba(0, 0, 0, 0.2);
  box-shadow: none;
}

/* 简单的 loading 旋转动画 */
.loading-spinner {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid currentColor;
  border-radius: 50%;
  border-top-color: transparent;
  animation: spin 1s linear infinite;
  margin-right: 5px;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
