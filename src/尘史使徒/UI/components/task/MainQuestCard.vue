<template>
  <div class="main-quest-card" :class="cardTypeClass">
    <!-- 头部：通用 -->
    <div class="card-header">
      <div class="quest-type-label">{{ typeLabel }}</div>
      <h2 class="quest-title">{{ title }}</h2>
    </div>

    <!-- 内容区：描述 -->
    <div class="card-body">
      <template v-if="blocks?.length"
        ><MainlineBlockRenderer v-for="block in blocks" :key="block.id" :block="block" :data="data" :title="title"
      /></template>
      <template v-else
        ><p class="description">{{ data.描述 }}</p>
        <component :is="activeLayout" :data="data"
      /></template>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import LayoutAlertness from '@/尘史使徒/UI/components/task/LayoutAlertness.vue';
import LayoutSouls from '@/尘史使徒/UI/components/task/LayoutSouls.vue';
import LayoutGlow from '@/尘史使徒/UI/components/task/LayoutGlow.vue';
import LayoutDefault from '@/尘史使徒/UI/components/task/LayoutDefault.vue';
import LayoutMemory from '@/尘史使徒/UI/components/task/LayoutMemory.vue';
import MainlineBlockRenderer from '@/尘史使徒/UI/components/task/MainlineBlockRenderer.vue';

const props = defineProps({
  title: String,
  data: Object,
  blocks: { type: Array, default: undefined },
});

// 逻辑判断
const hasAlertness = computed(() => props.data.警惕度 !== undefined);
const hasSouls = computed(() => props.data.已交融的魂质 && props.data.已交融的魂质.length > 0);
const isGlowType = computed(() => props.title && props.title.startsWith('启明'));
// 新增：判断是否为记忆/道路类型
const isMemoryType = computed(() => props.title && (props.title.startsWith('道路') || props.title.includes('记忆')));

// 决定使用哪个子组件
const activeLayout = computed(() => {
  if (hasAlertness.value) return LayoutAlertness;
  if (hasSouls.value) return LayoutSouls;
  if (isGlowType.value) return LayoutGlow;
  if (isMemoryType.value) return LayoutMemory; // 新增
  return LayoutDefault;
});

// 样式类名
const cardTypeClass = computed(() => {
  if (hasAlertness.value) return 'type-stealth';
  if (hasSouls.value) return 'type-power';
  if (isGlowType.value) return 'type-glow';
  if (isMemoryType.value) return 'type-memory'; // 新增
  return 'type-normal';
});

// 标签文本
const typeLabel = computed(() => {
  if (hasAlertness.value) return 'SURVIVAL PROTOCOL';
  if (hasSouls.value) return 'SOUL RESONANCE';
  if (isGlowType.value) return 'MANSUS REVELATION';
  if (isMemoryType.value) return 'FRAGMENTED MEMORY'; // 新增
  return 'MEMORY SEQUENCE';
});
</script>

<style scoped>
.main-quest-card {
  background: rgba(20, 20, 20, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 25px;
  margin-bottom: 25px;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
}
.card-header {
  margin-bottom: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 10px;
}
.quest-type-label {
  font-size: 0.7rem;
  letter-spacing: 3px;
  opacity: 0.7;
  margin-bottom: 5px;
  text-transform: uppercase;
}
.quest-title {
  font-family: serif;
  font-size: 1.8rem;
  color: #eee;
  margin: 0;
}
.description {
  font-size: 1.05rem;
  line-height: 1.6;
  color: #ccc;
  margin-bottom: 20px;
  font-style: italic;
}

/* 类型样式修饰 */
.type-stealth {
  border-left: 4px solid #d32f2f;
}
.type-power {
  border-left: 4px solid #9c27b0;
}

/* 辉光样式 */
.type-glow {
  border-left: 4px solid #fcd34d;
  background: linear-gradient(160deg, rgba(30, 25, 10, 0.95), rgba(10, 10, 10, 0.98));
  box-shadow: 0 0 20px rgba(252, 211, 77, 0.05);
}
.type-glow .quest-title {
  color: #fde68a;
  text-shadow: 0 0 10px rgba(251, 191, 36, 0.4);
}
.type-glow .quest-type-label {
  color: #fcd34d;
}

/* 新增：记忆/道路样式 (金色碎玻璃) */
.type-memory {
  border-left: 4px solid #c5a059; /* 古铜金 */
  /* 背景模拟深邃的黑暗中有微弱的金光 */
  background:
    radial-gradient(circle at 90% 10%, rgba(197, 160, 89, 0.08), transparent 40%),
    linear-gradient(180deg, rgba(15, 14, 11, 0.95), rgba(25, 23, 18, 0.98));
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5);
  /* 给整个卡片加一个微弱的金色边框光晕 */
  border-right: 1px solid rgba(197, 160, 89, 0.1);
  border-bottom: 1px solid rgba(197, 160, 89, 0.1);
}

.type-memory .quest-title {
  color: #e6cfa0;
  /* 文字破碎感阴影 */
  text-shadow:
    2px 2px 0px rgba(0, 0, 0, 0.8),
    -1px -1px 0 rgba(197, 160, 89, 0.3);
}

.type-memory .quest-type-label {
  color: #c5a059;
  text-shadow: 0 0 5px rgba(197, 160, 89, 0.4);
}

/* 针对记忆类型的描述文本微调 */
.type-memory .description {
  color: #a89f8e;
  border-left: 2px solid rgba(197, 160, 89, 0.3);
  padding-left: 15px;
  margin-left: -19px; /* 抵消 padding 保持对齐，但保留左侧线条 */
}
</style>
