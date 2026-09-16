<template>
  <div v-if="open" class="map-overlay" role="dialog" aria-modal="true" aria-label="选择初始地点">
    <header><button @click="$emit('close')">← 返回剧本</button><div><small>INITIAL LOCATION</small><h2>选择初始地点</h2></div><span></span></header>
    <main>
      <nav class="breadcrumbs"><button v-for="(crumb, index) in trail" :key="crumb.name" @click="go(index)">{{ crumb.name }}</button></nav>
      <div class="map-field">
        <button v-for="node in nodes" :key="node.name" class="map-node" @click="focus = node">
          <span class="node-glyph">◇</span><strong>{{ node.name }}</strong><small>{{ node.data.描述 || '暂无地点说明' }}</small>
        </button>
      </div>
      <aside v-if="focus" class="detail">
        <button class="close" @click="focus = undefined">×</button><small>LOCATION</small><h3>{{ focus.name }}</h3><p>{{ focus.data.描述 || '暂无地点说明' }}</p>
        <ul><li v-for="item in details" :key="item">{{ item }}</li></ul>
        <div><button v-if="children(focus.data).length" @click="enter(focus)">进入地区</button><button class="primary" @click="select(focus.name)">设为初始地点</button></div>
      </aside>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
const props = defineProps<{ open: boolean; map: Record<string, any> }>();
const emit = defineEmits<{ close: []; select: [name: string] }>();
type NodeView = { name: string; data: Record<string, any> };
const trail = ref<NodeView[]>([]), focus = ref<NodeView>();
const children = (data: Record<string, any>) => Object.entries(data?.子地图 ?? {}).map(([name, value]) => ({ name, data: value as Record<string, any> }));
const nodes = computed(() => trail.value.length ? children(trail.value[trail.value.length - 1].data) : Object.entries(props.map ?? {}).map(([name, value]) => ({ name, data: value as Record<string, any> })));
const details = computed(() => Array.isArray(focus.value?.data?.详情) ? focus.value!.data.详情.slice(0, 4).map(String) : []);
watch(() => props.open, value => { if (value) { trail.value = []; focus.value = undefined; } });
function enter(node: NodeView) { trail.value.push(node); focus.value = undefined; }
function go(index: number) { trail.value = trail.value.slice(0, index + 1); focus.value = undefined; }
function select(name: string) { emit('select', name); emit('close'); }
</script>

<style scoped>
.map-overlay { position: fixed; inset: 0; z-index: 80; display: flex; flex-direction: column; color: #e8e2d7; background: radial-gradient(circle at 50% 30%, #282d36, #101216 72%); }
header { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; padding: 16px 24px; border-bottom: 1px solid #8c7543; background: rgba(5,6,8,.72); }
header > button { justify-self: start; } header div { text-align: center; } h2 { margin: 3px 0 0; color: #c5a059; font: 500 20px Georgia, serif; } small { color: #7f8186; letter-spacing: .16em; }
main { position: relative; flex: 1; min-height: 0; overflow: hidden; }
.breadcrumbs { display: flex; gap: 4px; padding: 16px 22px; } .breadcrumbs button { min-height: 28px; color: #c5a059 !important; background: transparent !important; border: 0 !important; }
.breadcrumbs button + button::before { margin-right: 8px; color: #555; content: '/'; }
.map-field { position: absolute; inset: 62px 0 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 220px)); align-content: center; justify-content: center; gap: 36px; padding: 40px; overflow: auto; background-image: linear-gradient(rgba(197,160,89,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(197,160,89,.045) 1px, transparent 1px); background-size: 44px 44px; }
.map-node { min-height: 150px; padding: 18px !important; text-align: center; background: rgba(10,12,15,.8) !important; border-color: #444950 !important; clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px); }
.map-node:hover { border-color: #c5a059 !important; transform: translateY(-3px); } .map-node > * { display: block; } .node-glyph { margin-bottom: 9px; color: #c5a059; font-size: 28px; } .map-node strong { color: #eee6d8; font: 500 17px Georgia, serif; } .map-node small { display: -webkit-box; margin-top: 8px; overflow: hidden; color: #85898e; letter-spacing: 0; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.detail { position: absolute; z-index: 2; top: 90px; right: 28px; width: min(340px, calc(100% - 56px)); padding: 22px; background: rgba(14,16,20,.97); border: 1px solid #4a4d50; border-top: 3px solid #c5a059; box-shadow: 0 18px 50px #000; } .detail h3 { margin: 7px 0; color: #c5a059; font: 500 23px Georgia, serif; } .detail p, .detail li { color: #b6b0a5; line-height: 1.55; } .detail > div { display: flex; gap: 8px; } .detail .close { position: absolute; top: 8px; right: 8px; min-height: 28px; background: transparent !important; border: 0 !important; }
@media (max-width: 700px) { header { grid-template-columns: auto 1fr; } header span { display: none; } .detail { top: auto; right: 0; bottom: 0; width: 100%; } .map-field { align-content: start; grid-template-columns: 1fr 1fr; gap: 12px; padding: 18px; } }
</style>
