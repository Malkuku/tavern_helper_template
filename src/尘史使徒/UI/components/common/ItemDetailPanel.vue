<template>
  <div class="detail-panel" :class="[qualityClass]">
    <div class="panel-actions">
      <div><small>CURRENT ITEM</small><strong>当前物品</strong></div>
      <button class="close-panel-btn" type="button" aria-label="关闭当前物品" @click="$emit('close')">×</button>
    </div>

    <div class="panel-content-wrapper">
      <div class="panel-header">
        <input
          v-if="mode === 'edit'"
          class="panel-title edit-control"
          :value="name"
          @change="$emit('rename', $event.target.value)"
        />
        <h2 v-else class="panel-title">{{ name }}</h2>
        <div class="panel-meta">
          <select
            v-if="mode === 'edit'"
            class="panel-type edit-control"
            :value="type"
            @change="$emit('update:field', '类型', $event.target.value)"
          >
            <option v-for="option in itemTypes" :key="option">{{ option }}</option></select
          ><span v-else class="panel-type">{{ type || '杂物' }}</span>
          <select
            v-if="mode === 'edit'"
            class="panel-quality edit-control"
            :value="quality"
            @change="$emit('update:field', '品质', $event.target.value)"
          >
            <option v-for="option in qualities" :key="option">{{ option }}</option></select
          ><span v-else-if="quality" class="panel-quality">{{ quality }}</span>
        </div>
      </div>

      <div class="stat-grid">
        <div class="stat-box">
          <span class="label">持有数量</span>
          <input
            v-if="mode === 'edit'"
            class="value edit-control"
            :value="quantity"
            type="number"
            @input="$emit('update:field', '数量', Number($event.target.value))"
          /><span v-else class="value">{{ quantity }}</span>
        </div>
        <div class="stat-box">
          <span class="label">耐久度</span>
          <input
            v-if="mode === 'edit'"
            class="value edit-control"
            :value="durability"
            type="number"
            @input="$emit('update:field', '耐久', Number($event.target.value))"
          /><span v-else class="value">{{ durability }}</span>
        </div>
      </div>

      <div v-if="description || mode === 'edit'" class="info-section">
        <h4>描述</h4>
        <textarea
          v-if="mode === 'edit'"
          class="desc-text edit-control"
          :value="description"
          @input="$emit('update:field', '描述', $event.target.value)"
        ></textarea>
        <p v-else class="desc-text">{{ description }}</p>
      </div>

      <div v-if="hasEffect || mode === 'edit'" class="info-section">
        <h4>作用</h4>
        <textarea
          v-if="mode === 'edit'"
          class="effect-text edit-control"
          :value="effectText"
          @input="$emit('update:field', '作用', $event.target.value)"
        ></textarea>
        <div v-else class="effect-list">
          <p v-for="(effectItem, index) in effectList" :key="index" class="effect-text">
            <span class="bullet">✦</span> {{ effectItem }}
          </p>
        </div>
      </div>

      <button v-if="mode === 'edit'" class="delete-item" type="button" @click="$emit('delete')">删除物品</button>

      <slot name="actions"></slot>
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
  description: { type: String, default: '' },
  effect: { type: [String, Array], default: '' },
  mode: { type: String, default: 'view' },
});

defineEmits(['close', 'rename', 'update:field', 'delete']);
const itemTypes = ['器具', '药食', '证明', '秘传', '仪式', '杂物'];
const standardQualities = ['凡庸', '遗物', '佚品', '珍品', '禁忌', '神造', '未知'];
const documentQualities = ['遗片', '佚存', '残卷', '蛀损', '完帙', '未知'];
const qualities = computed(() => (['秘传', '仪式'].includes(props.type) ? documentQualities : standardQualities));
const effectText = computed(() => (Array.isArray(props.effect) ? props.effect.join('\n') : props.effect));

const hasEffect = computed(() => {
  if (Array.isArray(props.effect)) {
    return props.effect.length > 0;
  }
  return !!props.effect;
});

const effectList = computed(() => {
  if (Array.isArray(props.effect)) {
    return props.effect.filter(e => e);
  }
  return props.effect ? [props.effect] : [];
});

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
</script>

<style scoped>
.detail-panel {
  --q-color: #9e9e9e;
  --q-glow: rgba(158, 158, 158, 0.15);

  position: relative;
  flex: 0 0 320px;
  width: 320px;
  background: #18181c;
  border-left: 1px solid rgba(255, 255, 255, 0.05);
  border-top: 4px solid var(--q-color);
  box-shadow: -5px 0 25px rgba(0, 0, 0, 0.5);
  z-index: 10;
  display: flex;
  flex-direction: column;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.5, 1);
}

/* 顶部装饰光效 */
.detail-panel::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 100px;
  background: linear-gradient(180deg, var(--q-glow) 0%, transparent 100%);
  pointer-events: none;
  z-index: 0;
}

.panel-actions {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: flex-end;
  padding: 10px;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.panel-actions > div {
  display: grid;
  margin-right: auto;
}
.panel-actions small {
  color: var(--q-color);
  font-size: 0.62rem;
  letter-spacing: 0.16em;
}
.panel-actions strong {
  font-size: 0.9rem;
}

.close-panel-btn {
  background: none;
  border: none;
  color: #888;
  font-size: 1.5rem;
  cursor: pointer;
  line-height: 1;
  transition: color 0.2s;
}

.close-panel-btn:hover {
  color: #fff;
}

.panel-content-wrapper {
  position: relative;
  z-index: 1;
  flex: 1;
  overflow-y: auto;
  padding: 0 20px 40px 20px;
}
.edit-control {
  box-sizing: border-box;
  width: 100%;
  color: inherit;
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid var(--q-color);
}
.delete-item {
  width: 100%;
  padding: 9px;
  color: #ff9b9b;
  background: transparent;
  border: 1px solid #8f4444;
}

.panel-header {
  margin-top: 5px;
  margin-bottom: 30px;
  text-align: center;
}

.panel-title {
  margin: 0;
  font-family: 'Cinzel', serif;
  font-size: 1.6rem;
  color: #fff;
  line-height: 1.3;
  text-shadow: 0 2px 10px var(--q-glow);
}

.panel-meta {
  margin-top: 10px;
  display: flex;
  justify-content: center;
  gap: 12px;
  align-items: center;
}

.panel-type {
  font-size: 0.8rem;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 2px;
}

.panel-quality {
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--q-glow);
  color: var(--q-color);
  border: 1px solid rgba(255, 255, 255, 0.05);
  font-weight: 600;
}

.stat-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 25px;
}

.stat-box {
  background: rgba(0, 0, 0, 0.2);
  padding: 12px;
  border-radius: 6px;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.03);
}

.stat-box .label {
  display: block;
  font-size: 0.75rem;
  color: #777;
  margin-bottom: 6px;
}

.stat-box .value {
  font-size: 1.2rem;
  color: #eee;
  font-weight: bold;
}

.info-section {
  margin-bottom: 25px;
}

.info-section h4 {
  color: #999;
  font-size: 0.85rem;
  text-transform: uppercase;
  margin: 0 0 10px 0;
  border-left: 3px solid var(--q-color);
  padding-left: 10px;
}

.desc-text {
  color: #aaa;
  font-style: italic;
  line-height: 1.6;
  font-size: 0.95rem;
}

.effect-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.effect-text {
  color: #ddd;
  line-height: 1.6;
  font-size: 0.95rem;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.bullet {
  color: var(--q-color);
  flex-shrink: 0;
}

/* ================= 品质颜色定义 ================= */
.quality-common {
  --q-color: #9e9e9e;
  --q-glow: rgba(158, 158, 158, 0.15);
}
.quality-relic {
  --q-color: #5c9eff;
  --q-glow: rgba(92, 158, 255, 0.2);
}
.quality-lost {
  --q-color: #6fb6c9;
  --q-glow: rgba(111, 182, 201, 0.2);
}
.quality-rare {
  --q-color: #b366ff;
  --q-glow: rgba(179, 102, 255, 0.2);
}
.quality-forbidden {
  --q-color: #ff4466;
  --q-glow: rgba(255, 68, 102, 0.2);
}
.quality-divine {
  --q-color: #ffd700;
  --q-glow: rgba(255, 215, 0, 0.2);
}
.quality-fragment {
  --q-color: #a89070;
  --q-glow: rgba(168, 144, 112, 0.2);
}
.quality-preserved {
  --q-color: #7ec8e3;
  --q-glow: rgba(126, 200, 227, 0.2);
}
.quality-damaged {
  --q-color: #c9a0dc;
  --q-glow: rgba(201, 160, 220, 0.2);
}
.quality-worn {
  --q-color: #8b7355;
  --q-glow: rgba(139, 115, 85, 0.2);
}
.quality-complete {
  --q-color: #50c878;
  --q-glow: rgba(80, 200, 120, 0.2);
}

/* Animation */
.panel-slide-enter-active,
.panel-slide-leave-active {
  transition: all 0.3s ease;
}

.panel-slide-enter-from,
.panel-slide-leave-to {
  width: 0;
  opacity: 0;
  transform: translateX(20px);
}

/* Mobile */
@media (max-width: 768px) {
  .detail-panel {
    position: fixed !important;
    top: 0;
    left: 0;
    width: 100vw !important;
    height: 100vh !important;
    height: 100dvh !important;
    z-index: 10001 !important;
    border-left: none;
    background: #131316 !important;
    flex: none;
  }

  .panel-content-wrapper {
    padding-bottom: 100px;
  }

  .panel-slide-enter-from,
  .panel-slide-leave-to {
    width: 100vw !important;
    transform: translateX(100%);
    opacity: 1;
  }
}
</style>
