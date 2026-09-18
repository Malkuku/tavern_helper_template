<template>
  <article class="narrative-card" :class="[`kind-${kind}`, { editing }]">
    <div class="accent"></div>
    <header>
      <span class="kind-mark" aria-hidden="true">
        <svg v-if="kind === '任务'" viewBox="0 0 24 24"><path d="M5 4h14v16H5zM8 8h8M8 12h5M8 16h7" /></svg>
        <svg v-else viewBox="0 0 24 24"><path d="M12 3l8 7-8 11L4 10zM12 7v7M12 17v.01" /></svg>
      </span>
      <div class="heading">
        <small>{{ kind === '任务' ? 'SIDE QUEST' : 'CAUSAL EVENT' }}</small>
        <h3>{{ title || `未命名${kind}` }}</h3>
      </div>
      <slot name="actions" />
    </header>
    <p v-if="data.描述" class="description">{{ data.描述 }}</p>
    <div v-if="kind === '任务'" class="detail-grid">
      <div v-if="data.目标">
        <small>目标</small><span>{{ data.目标 }}</span>
      </div>
      <div v-if="data.阻碍">
        <small>阻碍</small><span>{{ data.阻碍 }}</span>
      </div>
      <div v-if="data.期望奖励" class="reward">
        <small>期望奖励</small><span>{{ data.期望奖励 }}</span>
      </div>
    </div>
    <div v-else class="event-foot">
      <span v-if="data.作用"><small>影响</small>{{ data.作用 }}</span>
      <b v-if="data.进度">{{ data.进度 }}</b>
    </div>
    <div v-if="editing" class="editor"><slot /></div>
  </article>
</template>

<script setup lang="ts">
defineProps<{ title: string; data: Record<string, any>; kind: '任务' | '事件'; editing?: boolean }>();
</script>

<style scoped>
.narrative-card {
  position: relative;
  min-width: 0;
  overflow: hidden;
  padding: 18px;
  background: linear-gradient(145deg, rgba(25, 25, 27, 0.96), rgba(12, 13, 15, 0.96));
  border: 1px solid rgba(255, 255, 255, 0.09);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.22);
}
.accent {
  position: absolute;
  inset: 0 auto 0 0;
  width: 3px;
  background: #b69a5d;
  box-shadow: 0 0 12px rgba(182, 154, 93, 0.45);
}
.kind-事件 .accent {
  background: #7d6ca8;
  box-shadow: 0 0 12px rgba(125, 108, 168, 0.5);
}
header {
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 0;
}
.kind-mark {
  width: 36px;
  height: 36px;
  flex: 0 0 auto;
  color: #cbb477;
}
.kind-事件 .kind-mark {
  color: #a999d0;
}
.kind-mark svg {
  width: 100%;
  height: 100%;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.4;
}
.heading {
  min-width: 0;
  flex: 1;
}
.heading small,
.detail-grid small,
.event-foot small {
  display: block;
  color: #7f8185;
  font-size: 10px;
  letter-spacing: 0.12em;
}
h3 {
  margin: 2px 0 0;
  color: #eee;
  font-family: serif;
  overflow-wrap: anywhere;
}
.description {
  color: #aaa;
  line-height: 1.6;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 8px;
}
.detail-grid > div,
.event-foot {
  padding: 9px 11px;
  background: rgba(255, 255, 255, 0.035);
  color: #c7c7c7;
  overflow-wrap: anywhere;
}
.detail-grid .reward {
  color: #d7c189;
}
.event-foot {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: end;
}
.event-foot span {
  min-width: 0;
  overflow-wrap: anywhere;
}
.event-foot b {
  color: #a999d0;
  flex: 0 0 auto;
}
.editor {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}
</style>
