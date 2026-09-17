<template>
  <div class="character-stats-panel">
    <!-- ================= 1. 生命状态 (进度条) ================= -->
    <div class="stat-grid">
      <!-- 生命 (HP) -->
      <div class="stat-item">
        <span class="label">生命</span>
        <div class="bar-container">
          <div class="bar-fill hp-flow" :style="{ width: getPercent(data?.生命状态?.生命) + '%' }"></div>
          <span class="bar-text"
            ><input
              v-if="mode === 'edit'"
              :value="data?.生命状态?.生命?.当前 ?? 0"
              type="number"
              :max="data?.生命状态?.生命?.最大值 ?? undefined"
              @input="updateCurrent('生命', $event)"
            /><template v-else>{{ data?.生命状态?.生命?.当前 || 0 }}</template> /
            {{ data?.生命状态?.生命?.最大值 || 0 }}</span
          >
        </div>
      </div>

      <!-- 体力 (SP) -->
      <div class="stat-item">
        <span class="label">体力</span>
        <div class="bar-container">
          <div class="bar-fill sp-flow" :style="{ width: getPercent(data?.生命状态?.体力) + '%' }"></div>
          <span class="bar-text"
            ><input
              v-if="mode === 'edit'"
              :value="data?.生命状态?.体力?.当前 ?? 0"
              type="number"
              :max="data?.生命状态?.体力?.最大值 ?? undefined"
              @input="updateCurrent('体力', $event)"
            /><template v-else>{{ data?.生命状态?.体力?.当前 || 0 }}</template> /
            {{ data?.生命状态?.体力?.最大值 || 0 }}</span
          >
        </div>
      </div>

      <!-- 精神 (MP) -->
      <div class="stat-item">
        <span class="label">精神</span>
        <div class="bar-container">
          <div class="bar-fill mp-flow" :style="{ width: getPercent(data?.生命状态?.精神) + '%' }"></div>
          <span class="bar-text"
            ><input
              v-if="mode === 'edit'"
              :value="data?.生命状态?.精神?.当前 ?? 0"
              type="number"
              :max="data?.生命状态?.精神?.最大值 ?? undefined"
              @input="updateCurrent('精神', $event)"
            /><template v-else>{{ data?.生命状态?.精神?.当前 || 0 }}</template> /
            {{ data?.生命状态?.精神?.最大值 || 0 }}</span
          >
        </div>
      </div>
    </div>

    <!-- 分割线 -->
    <div class="divider"></div>

    <!-- ================= 2. 基础数值 (四维网格) ================= -->
    <div class="base-stats-grid">
      <div
        v-for="stat in baseStatsConfig"
        :key="stat.key"
        class="base-stat-box"
        :style="{ '--stat-color': stat.color }"
      >
        <div class="stat-label-group">
          <!-- SVG 图标 -->
          <svg
            class="stat-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path v-for="(path, index) in stat.paths" :key="index" :d="path.d"></path>
          </svg>
          <span class="stat-label">{{ stat.label }}</span>
        </div>
        <span class="stat-value">{{ data?.基础数值?.[stat.key] || 0 }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  data: {
    type: Object,
    default: () => ({
      生命状态: {
        生命: { 当前: 0, 最大值: 100 },
        体力: { 当前: 0, 最大值: 100 },
        精神: { 当前: 0, 最大值: 100 },
      },
      基础数值: {
        力量: 0,
        敏捷: 0,
        智慧: 0,
        魅力: 0,
      },
    }),
  },
  mode: { type: String, default: 'view', validator: value => ['view', 'edit'].includes(value) },
});
const emit = defineEmits(['update:data']);

const updateCurrent = (key, event) => {
  const current = Number(event.target.value);
  const next = structuredClone(props.data || {});
  next.生命状态 ||= {};
  next.生命状态[key] ||= { 当前: 0, 最大值: 0 };
  next.生命状态[key].当前 = current;
  emit('update:data', next);
};

/**
 * 计算属性百分比
 */
const getPercent = stat => {
  if (!stat || !stat.最大值 || stat.最大值 === 0) return 0;
  const percent = (stat.当前 / stat.最大值) * 100;
  return Math.min(100, Math.max(0, percent));
};

/**
 * 四维属性配置表 (全新定制图标与颜色)
 */
const baseStatsConfig = [
  {
    key: '力量',
    label: '力量',
    color: '#ff9800', // 橙黄的火焰
    paths: [
      // 火焰轮廓
      {
        d: 'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z',
      },
    ],
  },
  {
    key: '敏捷',
    label: '敏捷',
    color: '#ffffff', // 雪色的羽毛 (配合CSS阴影会产生冰雪发光感)
    paths: [
      // 羽毛主体
      { d: 'M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z' },
      // 羽毛主轴
      { d: 'M16 8 L2 22' },
      // 羽毛纹理细节
      { d: 'M17.5 15 H9' },
    ],
  },
  {
    key: '智慧',
    label: '智慧',
    color: '#ffd700', // 金色的星星
    paths: [
      // 标准五角星连线
      {
        d: 'M 12 2 L 15.09 8.26 L 22 9.27 L 17 14.14 L 18.18 21.02 L 12 17.77 L 5.82 21.02 L 7 14.14 L 2 9.27 L 8.91 8.26 Z',
      },
    ],
  },
  {
    key: '魅力',
    label: '魅力',
    color: '#ff4d4d', // 鲜艳的红唇
    paths: [
      // 上嘴唇 (带唇峰)
      { d: 'M 3 12 C 6 8, 9 9, 12 11 C 15 9, 18 8, 21 12' },
      // 下嘴唇 (饱满弧度)
      { d: 'M 3 12 C 7 17, 17 17, 21 12' },
      // 嘴唇中间闭合线
      { d: 'M 3 12 C 8 13, 16 13, 21 12' },
    ],
  },
];
</script>

<style scoped>
/* 依赖父级提供的变量: --font-title, --c-text-dim */

.character-stats-panel {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

/* --- 进度条区域样式 --- */
.stat-grid {
  display: flex;
  flex-direction: column;
  gap: 15px;
}
.stat-item {
  display: flex;
  align-items: center;
  gap: 15px;
}
.stat-item .label {
  width: 40px;
  font-family: var(--font-title, serif);
  color: var(--c-text-dim, #a0a0a0);
  font-weight: bold;
}

.bar-container {
  flex: 1;
  height: 16px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  position: relative;
  overflow: visible;
}

.bar-text {
  position: absolute;
  width: 100%;
  text-align: right;
  right: 5px;
  top: -18px;
  font-size: 0.75rem;
  color: var(--c-text-dim, #a0a0a0);
  font-family: monospace;
  letter-spacing: 0.5px;
}
.bar-text input {
  width: 74px;
  padding: 1px 4px;
  color: #fff;
  text-align: right;
  background: rgba(0, 0, 0, 0.7);
  border: 1px solid currentColor;
}

.bar-fill {
  height: 100%;
  border-radius: 2px;
  position: relative;
  transition: width 0.3s ease-out;
}

.bar-fill::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  right: 0;
  width: 15px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6) 80%, rgba(255, 255, 255, 0.9) 100%);
  box-shadow: 2px 0 5px currentColor;
  border-radius: 0 2px 2px 0;
  animation: water-tip-flicker 2s infinite;
}

.bar-fill::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.1) 50%, transparent 100%);
  background-size: 200% 100%;
  animation: flat-flow 3s infinite linear;
  z-index: 1;
}

@keyframes water-tip-flicker {
  0%,
  100% {
    opacity: 0.8;
    width: 15px;
  }
  50% {
    opacity: 1;
    width: 20px;
  }
}

@keyframes flat-flow {
  0% {
    background-position: 100% 0;
  }
  100% {
    background-position: -100% 0;
  }
}

.hp-flow {
  background-color: #e74c3c;
  color: #ffadad;
}
.sp-flow {
  background-color: #f1c40f;
  color: #fff5cc;
}
.mp-flow {
  background-color: #3498db;
  color: #b3e0ff;
}

/* --- 分割线 --- */
.divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15) 50%, transparent);
  margin: 5px 0;
}

/* --- 基础数值区域样式 --- */
.base-stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.base-stat-box {
  display: flex;
  justify-content: space-between;
  align-items: center;
  /* 动态渐变背景，基于当前属性的主题色 */
  background: linear-gradient(90deg, color-mix(in srgb, var(--stat-color) 15%, transparent), rgba(255, 255, 255, 0.03));
  padding: 10px 14px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-left: 3px solid var(--stat-color);
  transition: all 0.2s ease;
}

.base-stat-box:hover {
  background: linear-gradient(90deg, color-mix(in srgb, var(--stat-color) 25%, transparent), rgba(255, 255, 255, 0.08));
  transform: translateY(-1px);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--stat-color) 15%, transparent);
}

.stat-label-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stat-icon {
  width: 18px;
  height: 18px;
  color: var(--stat-color);
  /* 给图标增加发光效果，特别是雪色羽毛会显得很有质感 */
  filter: drop-shadow(0 0 4px color-mix(in srgb, var(--stat-color) 60%, transparent));
}

.base-stat-box .stat-label {
  color: var(--c-text-dim, #d0d0d0);
  font-family: var(--font-title, serif);
  font-size: 0.95rem;
  letter-spacing: 1px;
}

.base-stat-box .stat-value {
  color: #ffffff;
  font-weight: bold;
  font-family: monospace;
  font-size: 1.2rem;
  /* 数值也带有对应颜色的微弱光晕 */
  text-shadow: 0 0 8px color-mix(in srgb, var(--stat-color) 60%, transparent);
}
</style>
