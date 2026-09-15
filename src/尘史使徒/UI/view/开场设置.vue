<template>
  <div class="scenario-layout" :class="currentTheme">
    <header class="scenario-header">
      <h1 class="title">剧本选择</h1>
      <div class="subtitle">CHOOSE YOUR DESTINY</div>
    </header>

    <div class="scenario-list">
      <div
        v-for="item in scenarios"
        :key="item.id"
        class="scenario-card"
        :class="[item.theme, { active: selectedScenario === item.id }]"
        @click="selectScenario(item.id)"
      >
        <!-- 背景特效层 -->
        <div class="art-bg-effect"></div>

        <div class="card-content">
          <!-- SVG 图标 -->
          <div class="scenario-icon-wrapper">
            <!-- 图标只来自本地 ScenarioIconPaths 白名单。 -->
            <!-- eslint-disable-next-line vue/no-v-html -->
            <svg viewBox="0 0 64 64" class="scenario-svg" v-html="item.iconPath"></svg>
          </div>

          <!-- 标题 -->
          <h2 class="scenario-title art-name">{{ item.name }}</h2>
          <div class="scenario-tags">
            <span v-if="item.customProtagonist" class="tag">自定义主角</span>
          </div>

          <!-- 详情区域 (点击选中后显示) -->
          <div v-show="selectedScenario === item.id" class="scenario-details">
            <p class="scenario-desc">{{ item.desc }}</p>

            <!-- 启程按钮 / 开发中按钮 -->
            <button
              class="action-btn start-btn"
              :class="{ 'btn-disabled': !item.isReady }"
              :disabled="loading || !item.isReady"
              @click.stop="confirmStart(item)"
            >
              <!-- 状态 1: 加载中 -->
              <span v-if="loading && loadingId === item.id">
                <i class="loading-spinner"></i> 读取中...
              </span>

              <!-- 状态 2: 开发中 (预留接口) -->
              <span v-else-if="!item.isReady">
                开发中，敬请期待
              </span>

              <!-- 状态 3: 正常启程 -->
              <span v-else>
                启程
              </span>
            </button>
          </div>
        </div>
      </div>
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
import { DefaultScenarioIconPath, ScenarioIconPaths } from '@/尘史使徒/UI/types/剧本数据';
import QuickCharacterSetup from '@/尘史使徒/UI/components/start/QuickCharacterSetup.vue';
import { assembleScenario } from '../../../创意工坊/scenario/assembler';
import { formatScenarioError } from '../../../创意工坊/scenario/errors';
import { applyScenarioToLatestMessage } from '../../../创意工坊/scenario/hostAdapter';
import type { ScenarioSourceBundle } from '../../../创意工坊/scenario/types';
import { loadScenarioSourceFromWorldbook } from '../../../创意工坊/scenario/worldbookSource';

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
  theme: string;
  desc: string;
  iconPath: string;
  customProtagonist: boolean;
}
const scenarios = computed(() =>
  Object.entries(source.value?.scenarios ?? {}).map(([id, scenario]) => ({
    id,
    name: scenario.key,
    isReady: scenario.可用,
    theme: scenario.主题,
    desc: scenario.desc,
    iconPath: ScenarioIconPaths[scenario.图标] ?? DefaultScenarioIconPath,
    customProtagonist: scenario.自定义主角,
  })),
);

// 计算当前选中的主题类名
const currentTheme = computed(() => {
  const active = scenarios.value.find(s => s.id === selectedScenario.value);
  return active ? active.theme : '';
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
  transition: color 0.5s, text-shadow 0.5s;
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

.scenario-card {
  position: relative;
  background: var(--c-bg-card);
  border: 1px solid var(--c-gold-dim);
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
  min-height: 220px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.scenario-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  border-color: var(--theme-color, var(--c-gold));
}

.scenario-card.active {
  border-color: var(--theme-color, var(--c-gold));
  box-shadow: 0 0 20px var(--theme-glow, var(--c-gold-dim));
  min-height: 400px;
  background: rgba(0, 0, 0, 0.8);
}

.card-content {
  position: relative;
  z-index: 2;
  padding: 30px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  height: 100%;
}

.scenario-icon-wrapper {
  width: 80px;
  height: 80px;
  margin-bottom: 15px;
  color: var(--theme-color, var(--c-gold));
  filter: drop-shadow(0 0 5px var(--theme-glow, rgba(0,0,0,0)));
  transition: transform 0.3s ease;
}

.scenario-card:hover .scenario-icon-wrapper {
  transform: scale(1.1);
}

.scenario-title {
  font-family: var(--font-title);
  font-size: 1.6rem;
  margin: 0 0 10px 0;
  transition: color 0.3s;
}

.scenario-details {
  margin-top: 20px;
  animation: fadeIn 0.5s ease-in-out;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.scenario-tags {
  display: flex;
  gap: 8px;
  margin-bottom: 15px;
  flex-wrap: wrap;
  justify-content: center;
}

.tag {
  font-size: 0.75rem;
  padding: 2px 8px;
  border: 1px solid var(--c-text-dim);
  color: var(--c-text-dim);
  border-radius: 2px;
  background: rgba(0,0,0,0.3);
}

.scenario-desc {
  font-size: 1rem;
  line-height: 1.6;
  color: var(--c-text-dim);
  margin-bottom: 25px;
  max-width: 90%;
  white-space: pre-line;
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
  background: rgba(0,0,0,0.2);
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
@keyframes spin { to { transform: rotate(360deg); } }

/* =========================================
   特效样式 (重构：支持全局变量 + 局部样式隔离)
   ========================================= */
.art-bg-effect { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 0; pointer-events: none; overflow: hidden; }

/* 灯 (Lamp) */
.theme-lamp { --theme-color: #FFD700; --theme-glow: rgba(255, 215, 0, 0.3); }
/* 仅当卡片本身具有该主题时，才应用内部样式，防止全局主题覆盖其他卡片 */
.scenario-card.theme-lamp .art-name { color: var(--theme-color); text-shadow: 0 0 10px var(--theme-color); }
.scenario-card.theme-lamp .art-bg-effect { background: radial-gradient(circle, var(--theme-color) 0%, transparent 70%); opacity: 0.15; }

/* 冬 (Winter) */
.theme-winter { --theme-color: #A3D5D5; --theme-glow: rgba(163, 213, 213, 0.3); }
.scenario-card.theme-winter .art-name { color: var(--theme-color); }
.scenario-card.theme-winter .art-bg-effect { background: radial-gradient(circle, #fff 5%, transparent 6%), radial-gradient(circle, #fff 3%, transparent 4%); background-size: 30px 30px, 50px 50px; background-position: 0 0, 25px 25px; animation: snow 10s linear infinite; opacity: 0.3; }
@keyframes snow { 0% {background-position: 0 0, 25px 25px;} 100% {background-position: 0 300px, 25px 325px;} }

/* 杯 (Cup) */
.theme-cup { --theme-color: #8B0000; --theme-glow: rgba(139, 0, 0, 0.4); }
.scenario-card.theme-cup .art-name { color: var(--theme-color); text-shadow: 0 0 5px rgba(0,0,0,0.5); }
.scenario-card.theme-cup .art-bg-effect { background-image: linear-gradient(to bottom, var(--theme-color) 30%, transparent 100%), linear-gradient(to bottom, var(--theme-color) 30%, transparent 100%), linear-gradient(to bottom, var(--theme-color) 30%, transparent 100%); background-repeat: no-repeat; background-size: 2px 150%, 3px 200%, 1px 220%; background-position: 10% 0, 50% 0, 90% 0; animation: art-cup-drip-y 6s linear infinite; opacity: 0.4; }
@keyframes art-cup-drip-y { from { background-position-y: -250%; } to { background-position-y: 100%; } }

/* 蛾 (Moth) */
.theme-moth { --theme-color: #a8a8a8; --theme-glow: rgba(168, 168, 168, 0.3); }
.scenario-card.theme-moth .art-name { color: var(--theme-color); text-shadow: 1px 1px 1px rgba(0,0,0,0.5); animation: art-moth-glitch-strong 2s infinite steps(1); }
.scenario-card.theme-moth .art-bg-effect { background: repeating-linear-gradient(45deg, #0001, #0001 1px, transparent 1px, transparent 5px); opacity: 0.2; }
/* 特殊：当选中蛾主题时，全局标题也应用故障效果 */
.theme-moth .title { animation: art-moth-glitch-strong 2s infinite steps(1); }
@keyframes art-moth-glitch-strong { 0% { transform: translate(0, 0) skew(0); } 5% { transform: translate(-2px, 1px) skew(-2deg); } 10% { transform: translate(2px, -1px) skew(2deg); } 15% { transform: translate(0, 0) skew(0); } 100% { transform: translate(0, 0) skew(0); } }

/* 被遗忘者 (Forgotten) */
.theme-broken-mirror { --theme-color: #C5A059; --theme-glow: rgba(197, 160, 89, 0.2); }
.scenario-card.theme-broken-mirror .art-name { color: var(--theme-color); text-shadow: 0 0 5px rgba(0,0,0,0.8); opacity: 0.8; }
.scenario-card.theme-broken-mirror .art-bg-effect {
  background: linear-gradient(135deg, transparent 40%, rgba(197, 160, 89, 0.1) 40%, rgba(197, 160, 89, 0.1) 60%, transparent 60%);
  background-size: 20px 20px;
  opacity: 0.3;
}
.theme-broken-mirror.active .scenario-svg {
  animation: broken-shake 5s infinite;
}
@keyframes broken-shake {
  0%, 100% { transform: rotate(0deg); }
  90% { transform: rotate(0deg); }
  92% { transform: rotate(2deg); }
  94% { transform: rotate(-2deg); }
  96% { transform: rotate(1deg); }
  98% { transform: rotate(-1deg); }
}
</style>
