<template>
  <section class="arts-board">
    <header>
      <div>
        <p>ARTS</p>
        <h3>术之等级</h3>
      </div>
      <small>等级为 0 的性相不会写入角色数据</small>
    </header>
    <div class="arts-grid">
      <article v-for="art in arts" :key="art" :class="{ active: levelOf(art) > 0 }">
        <span class="art-mark">{{ art }}</span>
        <div class="art-info">
          <strong>{{ art }}</strong
          ><small>Lv. {{ levelOf(art) }}</small>
        </div>
        <div class="level-controls">
          <button type="button" :disabled="levelOf(art) === 0" @click="changeLevel(art, -1)">−</button>
          <b>{{ levelOf(art) }}</b>
          <button type="button" @click="changeLevel(art, 1)">＋</button>
        </div>
        <label v-if="levelOf(art) > 0" class="experience"
          >经验<input :value="experienceOf(art)" type="number" min="0" @input="setExperience(art, $event)"
        /></label>
      </article>
    </div>
  </section>
</template>
<script setup lang="ts">
const props = defineProps<{ modelValue: Record<string, { 等级: number; 经验: number }> }>();
const emit = defineEmits<{ 'update:modelValue': [value: Record<string, { 等级: number; 经验: number }>] }>();
const arts = ['灯', '铸', '刃', '冬', '心', '杯', '蛾', '启'] as const;
function levelOf(art: string) {
  return Math.max(0, Number(props.modelValue?.[art]?.等级) || 0);
}
function experienceOf(art: string) {
  return Math.max(0, Number(props.modelValue?.[art]?.经验) || 0);
}
function changeLevel(art: string, delta: number) {
  const level = Math.max(0, levelOf(art) + delta),
    next = { ...props.modelValue };
  if (level === 0) delete next[art];
  else next[art] = { 等级: level, 经验: experienceOf(art) };
  emit('update:modelValue', next);
}
function setExperience(art: string, event: Event) {
  const experience = Math.max(0, Number((event.target as HTMLInputElement).value) || 0);
  emit('update:modelValue', { ...props.modelValue, [art]: { 等级: levelOf(art), 经验: experience } });
}
</script>
<style scoped>
.arts-board {
  display: grid;
  gap: 12px;
  margin-top: 18px;
}
.arts-board > header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 14px;
}
.arts-board h3,
.arts-board p {
  margin: 0;
}
.arts-board p {
  color: #cbb477;
  font-size: 10px;
  letter-spacing: 0.18em;
}
.arts-board header small {
  color: #8f897e;
}
.arts-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.arts-grid article {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 11px 12px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid #34383a;
}
.arts-grid article.active {
  background: rgba(203, 180, 119, 0.08);
  border-color: rgba(203, 180, 119, 0.38);
}
.art-mark {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  color: #89857d;
  background: #17191b;
  border: 1px solid #414548;
}
.active .art-mark {
  color: #d8c38b;
  border-color: #8b774d;
  box-shadow: 0 0 12px rgba(203, 180, 119, 0.12);
}
.art-info {
  display: grid;
  gap: 2px;
}
.art-info small {
  color: #918c82;
}
.level-controls {
  display: flex;
  align-items: center;
  gap: 6px;
}
.level-controls button {
  width: 30px;
  min-height: 30px !important;
  padding: 0 !important;
}
.level-controls b {
  min-width: 22px;
  text-align: center;
}
.experience {
  grid-column: 2/-1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  color: #918c82;
  font-size: 11px;
}
.experience input {
  width: 88px !important;
  min-height: 30px !important;
  text-align: right;
}
@media (max-width: 700px) {
  .arts-grid {
    grid-template-columns: 1fr;
  }
  .arts-board > header {
    align-items: start;
    flex-direction: column;
  }
}
</style>
