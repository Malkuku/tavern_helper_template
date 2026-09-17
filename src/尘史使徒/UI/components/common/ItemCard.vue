<template>
  <div
    class="item-card"
    :class="[
      qualityClass,
      typeClass,
      {
        'is-selected': isSelected,
        'is-modified': isModified,
        'mode-select': isDeleteMode,
      },
    ]"
    @click="$emit('click')"
  >
    <!-- 品质背景光效 -->
    <div class="card-bg-effect"></div>

    <!-- 删除模式的选中指示器（左上角，避免与数量重叠） -->
    <div v-if="isDeleteMode" class="selection-indicator">
      <div class="checkbox" :class="{ checked: isSelected }">
        <svg v-if="isSelected" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
    </div>

    <div class="card-content">
      <!-- 顶部：图标与数量区域 -->
      <div class="card-header">
        <div class="icon-wrapper">
          <svg class="type-icon" viewBox="0 0 24 24" fill="currentColor">
            <template v-if="iconType === 'moth'">
              <path
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"
              />
              <path
                d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"
              />
              <circle cx="12" cy="12" r="2" />
            </template>
            <template v-else-if="iconType === 'proof'">
              <path
                d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"
              />
            </template>
            <template v-else-if="iconType === 'lore'">
              <path
                d="M6 2a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H6zm1 2h10v16H7V4zm2 2v2h6V6H9zm0 4v2h6v-2H9zm0 4v2h4v-2H9z"
              />
            </template>
            <template v-else-if="iconType === 'weapon'">
              <path
                d="M6.92 5H5l6 6 1-1-5.08-5zm10.16 14L19 17.08 13 11l-1 1 6 6 1-1-1.92-1.92L19 8l-6.92 2.92L10 9l-1 1 1.92 2.08L8 19l6.92-2.92L16.92 18l1-1-1.84-1.84L19 8l-6 2.92z"
              />
              <path d="M14.5 17.5L6.5 9.5l1.414-1.414 8 8L14.5 17.5z" />
            </template>
            <template v-else-if="iconType === 'ritual'">
              <path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z" />
            </template>
            <template v-else-if="iconType === 'currency'">
              <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2" />
              <path d="M12 6v12M8 10h8M8 14h8" />
            </template>
            <template v-else-if="iconType === 'medicine'">
              <path
                d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14h-2v-4H6v-2h4V7h2v4h4v2h-4v4z"
              />
            </template>
            <template v-else-if="iconType === 'grail'">
              <path
                d="M5 3v4c0 1.1.9 2 2 2h1v2H6c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h2v2h8v-2h2c1.1 0 2-.9 2-2v-2c0-1.1-.9-2-2-2h-2V9h1c1.1 0 2-.9 2-2V3H5zm10 8v2H9v-2h6zm4-4H5V5h14v2z"
              />
            </template>
            <template v-else-if="iconType === 'lantern'">
              <path
                d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7zm2.85 11.1l-.85.6V16h-4v-2.3l-.85-.6A4.997 4.997 0 0 1 7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.63-.8 3.16-2.15 4.1z"
              />
            </template>
            <template v-else-if="iconType === 'tool'">
              <path
                d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"
              />
            </template>
            <template v-else>
              <path
                d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V6h5.17l2 2H20v10z"
              />
            </template>
          </svg>
        </div>
        <div class="quantity-badge" v-if="quantity > 0">
          <span class="quantity-value">{{ quantity }}</span>
        </div>
      </div>

      <!-- 主体信息区：名称与类型（完全展开，无裁剪） -->
      <div class="card-main">
        <div class="item-name" :title="name">{{ name }}</div>
        <div class="item-type">{{ displayType }}</div>
      </div>

      <!-- 底部：品质与耐久 -->
      <div class="card-footer">
        <span class="quality-tag" v-if="quality">{{ quality }}</span>
        <span class="durability-tag" v-if="durability > 0"> 耐久 {{ durability }} </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  name: { type: String, required: true },
  type: { type: String, default: '' },
  quality: {
    type: String,
    default: '',
    validator: v =>
      !v ||
      ['凡庸', '遗物', '佚品', '珍品', '禁忌', '神造', '遗片', '佚存', '残卷', '蛀损', '完帙', '未知'].includes(v),
  },
  quantity: { type: Number, default: 1 },
  durability: { type: Number, default: 0 },
  isSelected: { type: Boolean, default: false },
  isModified: { type: Boolean, default: false },
  isDeleteMode: { type: Boolean, default: false },
});

defineEmits(['click']);

const displayType = computed(() => props.type || '杂物');

const qualityClass = computed(() => {
  const qualityMap = {
    凡庸: 'quality-common',
    遗物: 'quality-relic',
    佚品: 'quality-lost',
    珍品: 'quality-rare',
    禁忌: 'quality-forbidden',
    神造: 'quality-divine',
    遗片: 'quality-fragment',
    佚存: 'quality-preserved',
    残卷: 'quality-damaged',
    蛀损: 'quality-worn',
    完帙: 'quality-complete',
  };
  return qualityMap[props.quality] || 'quality-common';
});

const iconType = computed(() => {
  const n = (props.name || '').toLowerCase();
  const t = (props.type || '').toLowerCase();

  if (n.includes('蛾')) return 'moth';
  if (
    n.includes('证明') ||
    n.includes('证书') ||
    n.includes('执照') ||
    n.includes('徽') ||
    n.includes('印') ||
    n.includes('章') ||
    n.includes('钥') ||
    n.includes('令') ||
    n.includes('邀请') ||
    t === '证明' ||
    t === '信物'
  )
    return 'proof';

  if (n.includes('书') || n.includes('录') || n.includes('篇') || t === '秘传') return 'lore';
  if (n.includes('刃') || n.includes('剑') || n.includes('刀') || n.includes('枪') || n.includes('斧') || t === '武器')
    return 'weapon';
  if (n.includes('仪式') || n.includes('阵') || n.includes('祭') || t === '仪式') return 'ritual';
  if (n.includes('币') || n.includes('金') || n.includes('银') || t === '货币') return 'currency';
  if (n.includes('药') || n.includes('剂') || n.includes('水') || n.includes('露') || t === '药食') return 'medicine';
  if (n.includes('杯') || n.includes('血')) return 'grail';
  if (n.includes('镜') || n.includes('灯') || n.includes('光')) return 'lantern';
  if (t === '器具') return 'tool';

  return 'default';
});

const typeClass = computed(() => {
  const n = (props.name || '').toLowerCase();
  if (n.includes('蛾')) return 'style-moth';
  return '';
});
</script>

<style scoped>
/* ----- 基础卡片样式 ----- */
.item-card {
  --q-color: #9e9e9e;
  --q-glow: rgba(158, 158, 158, 0.2);

  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 140px;
  max-width: 200px;
  background: linear-gradient(145deg, #232329 0%, #1a1a20 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-top: 3px solid var(--q-color);
  border-radius: 12px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.2, 0.9, 0.4, 1.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

/* 移除所有 overflow: hidden，确保内容完整显示 */
.item-card:hover {
  transform: translateY(-3px);
  box-shadow:
    0 8px 20px rgba(0, 0, 0, 0.4),
    0 0 12px var(--q-glow);
  border-color: rgba(255, 255, 255, 0.25);
  z-index: 2;
}

.item-card.is-selected {
  border-color: var(--q-color);
  background: linear-gradient(145deg, #2a2a32 0%, #1e1e24 100%);
  box-shadow:
    0 0 0 1px var(--q-color),
    0 6px 16px rgba(0, 0, 0, 0.4);
}

.item-card.is-modified {
  border-color: rgba(255, 214, 165, 0.9);
  box-shadow: 0 0 8px rgba(255, 214, 165, 0.3);
}

/* ----- 删除模式选中指示器（左上角，不干扰数量） ----- */
.selection-indicator {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 20;
  width: 22px;
  height: 22px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 6px;
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.3);
  transition: all 0.2s;
}

.checkbox {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  background: rgba(30, 30, 35, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.checkbox.checked {
  background: var(--q-color);
  border-color: var(--q-color);
}

.checkbox svg {
  width: 12px;
  height: 12px;
  color: #111;
  stroke-width: 2.5;
}

/* ----- 背景光效（不裁剪） ----- */
.card-bg-effect {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at 50% 0%, var(--q-color), transparent 70%);
  opacity: 0.08;
  transition: opacity 0.3s ease;
  pointer-events: none;
  border-radius: inherit;
}

.item-card:hover .card-bg-effect {
  opacity: 0.2;
}

/* ----- 内容容器（flex列，高度自适应） ----- */
.card-content {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

/* ----- 头部：图标 + 数量（无重叠） ----- */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
}

.type-icon {
  width: 18px;
  height: 18px;
  color: var(--q-color);
  filter: drop-shadow(0 0 2px var(--q-glow));
}

.quantity-badge {
  background: rgba(0, 0, 0, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.15);
  padding: 4px 8px;
  border-radius: 20px;
  color: #f0f0f0;
  font-size: 0.8rem;
  font-weight: 700;
  font-family: monospace;
  backdrop-filter: blur(2px);
  flex-shrink: 0;
  max-width: 70px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.quantity-value {
  display: inline-block;
}

/* ----- 主体信息：名称完全显示，无行数限制，自动换行 ----- */
.card-main {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 6px;
  flex: 1 1 auto;
  min-height: 0;
}

.item-name {
  font-family: 'Cinzel', 'Georgia', serif;
  font-size: 1rem;
  font-weight: 600;
  color: #f5f5f5;
  line-height: 1.35;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
  width: 100%;
  word-break: break-word;
  white-space: normal;
  overflow-wrap: break-word;
  /* 移除所有行数限制，完整展示名称 */
}

.item-type {
  color: #9a9aac;
  font-size: 0.7rem;
  letter-spacing: 0.5px;
  font-weight: 500;
  background: rgba(0, 0, 0, 0.25);
  padding: 2px 8px;
  border-radius: 20px;
  display: inline-block;
}

/* ----- 底部：品质与耐久（支持换行，不重叠） ----- */
.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 4px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.quality-tag {
  font-size: 0.65rem;
  padding: 4px 8px;
  border-radius: 20px;
  background: rgba(0, 0, 0, 0.4);
  color: var(--q-color);
  border: 1px solid rgba(255, 255, 255, 0.1);
  font-weight: 600;
  letter-spacing: 0.5px;
  backdrop-filter: blur(2px);
  white-space: nowrap;
}

.durability-tag {
  font-size: 0.65rem;
  color: #b0b0c0;
  background: rgba(0, 0, 0, 0.35);
  padding: 4px 8px;
  border-radius: 20px;
  white-space: nowrap;
  font-family: monospace;
  font-weight: 500;
}

/* 当空间不足时，允许品质或耐久换行 */
@media (max-width: 480px) {
  .card-footer {
    flex-wrap: wrap;
    justify-content: center;
  }
  .quality-tag,
  .durability-tag {
    white-space: normal;
    text-align: center;
  }
}

/* ================= 品质颜色系统 ================= */
.quality-common {
  --q-color: #9e9e9e;
  --q-glow: rgba(158, 158, 158, 0.25);
}
.quality-relic {
  --q-color: #5c9eff;
  --q-glow: rgba(92, 158, 255, 0.3);
}
.quality-lost {
  --q-color: #6fb6c9;
  --q-glow: rgba(111, 182, 201, 0.3);
}
.quality-rare {
  --q-color: #b366ff;
  --q-glow: rgba(179, 102, 255, 0.3);
}
.quality-forbidden {
  --q-color: #ff4466;
  --q-glow: rgba(255, 68, 102, 0.3);
}
.quality-divine {
  --q-color: #ffd700;
  --q-glow: rgba(255, 215, 0, 0.35);
}
.quality-fragment {
  --q-color: #a89070;
  --q-glow: rgba(168, 144, 112, 0.3);
}
.quality-preserved {
  --q-color: #7ec8e3;
  --q-glow: rgba(126, 200, 227, 0.3);
}
.quality-damaged {
  --q-color: #c9a0dc;
  --q-glow: rgba(201, 160, 220, 0.3);
}
.quality-worn {
  --q-color: #8b7355;
  --q-glow: rgba(139, 115, 85, 0.3);
}
.quality-complete {
  --q-color: #50c878;
  --q-glow: rgba(80, 200, 120, 0.35);
}

/* ================= 特殊特效 ================= */
.style-moth .item-name {
  animation: art-moth-glitch 2s infinite steps(1);
}

@keyframes art-moth-glitch {
  0% {
    transform: translate(0, 0) skew(0deg);
    text-shadow: 0 0 2px currentColor;
  }
  10% {
    transform: translate(-1px, 1px) skew(-0.5deg);
    text-shadow: -1px 0 var(--q-color);
  }
  20% {
    transform: translate(1px, -1px) skew(0.5deg);
    text-shadow: 1px 0 var(--q-color);
  }
  30% {
    transform: translate(-1px, 0) skew(-0.3deg);
  }
  40% {
    transform: translate(0, 0) skew(0deg);
    text-shadow: 0 0 3px var(--q-color);
  }
  100% {
    transform: translate(0, 0) skew(0deg);
  }
}

/* 高品质动态光效 */
.quality-divine.item-card {
  animation: divine-pulse 3s ease-in-out infinite;
}

.quality-divine .item-name {
  text-shadow:
    0 0 6px rgba(255, 215, 0, 0.5),
    0 1px 3px rgba(0, 0, 0, 0.6);
}

@keyframes divine-pulse {
  0%,
  100% {
    box-shadow:
      0 4px 12px rgba(0, 0, 0, 0.2),
      0 0 4px rgba(255, 215, 0, 0.2);
  }
  50% {
    box-shadow:
      0 6px 18px rgba(0, 0, 0, 0.35),
      0 0 16px rgba(255, 215, 0, 0.4);
  }
}

.quality-forbidden.item-card {
  animation: forbidden-whisper 3s ease-in-out infinite;
}

.quality-forbidden .item-name {
  text-shadow: 0 0 6px rgba(255, 68, 102, 0.5);
}

@keyframes forbidden-whisper {
  0%,
  100% {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    border-top-color: #ff4466;
  }
  25% {
    box-shadow: 0 4px 18px rgba(255, 68, 102, 0.35);
  }
  75% {
    box-shadow: 0 4px 22px rgba(255, 68, 102, 0.5);
  }
}

.quality-complete .item-name {
  text-shadow: 0 0 6px rgba(80, 200, 120, 0.5);
}

/* 完全消除所有隐藏裁剪风险 */
.item-card,
.card-content,
.card-main,
.item-name {
  overflow: visible;
}

/* 保证长单词完美断行 */
.item-name {
  hyphens: auto;
  word-break: break-word;
}
</style>
