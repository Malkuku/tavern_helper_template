<template>
  <section class="composer">
    <header class="composer-head">
      <div>
        <small>MAINLINE COMPONENT STUDIO</small>
        <h4>主线组件工作台</h4>
        <p>组件绑定主线数据；画布即玩家最终看到的结构。</p>
      </div>
      <button @click="addEntry">＋ 新增主线</button>
    </header>
    <nav class="entry-tabs">
      <button v-for="[key] in entries" :key="key" :class="{ active: key === activeEntry }" @click="selectEntry(key)">
        {{ key }}
      </button>
    </nav>
    <div v-if="activeEntry" class="studio">
      <aside class="palette">
        <h5>组件库</h5>
        <button v-for="(definition, type) in mainlineBlockCatalog" :key="type" @click="addBlock(type)">
          <b>{{ componentIcon(type) }}</b
          ><span>{{ definition.label }}</span>
        </button>
        <p>选中容器时，新组件会放入容器。</p>
      </aside>
      <main class="canvas">
        <header>
          <div>
            <small>CANVAS</small><input :value="activeEntry" aria-label="主线名称" @change="renameEntry($event)" />
          </div>
          <div>
            <button @click="copyEntry">复制主线</button><button class="danger" @click="removeEntry">删除主线</button>
          </div>
        </header>
        <div class="canvas-surface">
          <MainlineCanvasNode
            v-for="(block, index) in activeLayout.blocks"
            :key="block.id"
            :block="block"
            :data="activeData"
            :title="activeEntry"
            :selected-id="selectedBlockId"
            :first="index === 0"
            :last="index === activeLayout.blocks.length - 1"
            @select="selectedBlockId = $event"
            @move="moveBlock"
            @copy="copyBlock"
            @remove="removeBlock"
          />
          <p v-if="!activeLayout.blocks.length" class="empty">从左侧加入组件</p>
        </div>
      </main>
      <aside class="inspector">
        <template v-if="selectedBlock"
          ><h5>组件设置</h5>
          <label>类型<input :value="mainlineBlockCatalog[selectedBlock.type].label" readonly /></label
          ><label v-if="selectedBlock.type !== 'divider' && selectedBlock.type !== 'title'"
            >标签<input :value="selectedBlock.label" @input="changeLabel($event)" /></label
          ><label v-if="selectedBlock.type !== 'divider' && selectedBlock.type !== 'container'"
            >数据绑定<select :value="sourceKey(selectedBlock.source)" @change="changeSource($event)">
              <option value="">未绑定</option>
              <option v-if="selectedBlock.type === 'title'" :value="sourceKey(['$title'])">主线名称</option>
              <option v-for="option in sourceOptions" :key="sourceKey(option.path)" :value="sourceKey(option.path)">
                {{ option.label }}
              </option>
            </select></label
          ><label
            >视觉<select :value="selectedBlock.variant" @change="changeVariant($event)">
              <option v-for="variant in mainlineBlockCatalog[selectedBlock.type].variants" :key="variant">
                {{ variant }}
              </option>
            </select></label
          >
          <p>每个组件独立保存绑定与视觉，不改变业务 JSON。</p></template
        >
        <p v-else class="empty">选择画布组件进行设置</p>
      </aside>
    </div>
    <details v-if="activeEntry" class="data-source">
      <summary>编辑当前主线的数据源</summary>
      <JsonBlockEditor :model-value="editableData" @update:model-value="updateData" />
    </details>
  </section>
</template>
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import type { JsonObject } from '../scenario/types';
import type { MainlineBlock, MainlineBlockType, MainlineLayout } from '../scenario/mainlineLayout';
import {
  createMainlineBlock,
  ensureMainlineMeta,
  flattenMainlineSources,
  isMainlineMeta,
  mainlineBlockCatalog,
  mainlineEntries,
} from '../scenario/mainlineLayout';
import JsonBlockEditor from './JsonBlockEditor.vue';
import MainlineCanvasNode from './MainlineCanvasNode.vue';
const props = defineProps<{ modelValue: JsonObject }>(),
  emit = defineEmits<{ 'update:modelValue': [JsonObject] }>(),
  activeEntry = ref(''),
  selectedBlockId = ref('');
const entries = computed(() => mainlineEntries(props.modelValue)),
  meta = computed(() => (isMainlineMeta(props.modelValue.meta) ? props.modelValue.meta : null)),
  activeData = computed(() => props.modelValue[activeEntry.value]),
  activeLayout = computed<MainlineLayout>(() => meta.value?.layouts[activeEntry.value] ?? { blocks: [] }),
  editableData = computed(() => {
    const value = activeData.value;
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : { 值: value };
  }),
  sourceOptions = computed(() => flattenMainlineSources(activeData.value)),
  selectedBlock = computed(() => findBlock(activeLayout.value.blocks, selectedBlockId.value));
onMounted(() => {
  const next = structuredClone(props.modelValue);
  ensureMainlineMeta(next);
  emit('update:modelValue', next);
  activeEntry.value = mainlineEntries(next)[0]?.[0] ?? '';
});
watch(entries, value => {
  if (activeEntry.value && !value.some(([key]) => key === activeEntry.value)) activeEntry.value = value[0]?.[0] ?? '';
});
function commit(mutator: (draft: JsonObject) => void) {
  const draft = structuredClone(props.modelValue);
  const nextMeta = ensureMainlineMeta(draft);
  mutator(draft);
  ensureMainlineMeta(draft);
  if (!draft.meta) draft.meta = nextMeta;
  emit('update:modelValue', draft);
}
function selectEntry(key: string) {
  activeEntry.value = key;
  selectedBlockId.value = '';
}
function unique(base: string) {
  let key = base,
    n = 2;
  while (key in props.modelValue) key = `${base}${n++}`;
  return key;
}
function addEntry() {
  const key = unique('新主线');
  commit(d => {
    d[key] = { 描述: '' };
    ensureMainlineMeta(d);
  });
  activeEntry.value = key;
}
function renameEntry(event: Event) {
  const input = event.target as HTMLInputElement,
    key = input.value.trim();
  if (!key || (key !== activeEntry.value && key in props.modelValue)) {
    input.value = activeEntry.value;
    return;
  }
  const old = activeEntry.value;
  commit(d => {
    const rows = mainlineEntries(d).map(([k, v]) => [k === old ? key : k, v]);
    const m = ensureMainlineMeta(d),
      layout = m.layouts[old];
    delete m.layouts[old];
    m.layouts[key] = layout;
    for (const k of Object.keys(d)) if (k !== 'meta') delete d[k];
    for (const [k, v] of rows) d[k] = v;
    d.meta = m;
  });
  activeEntry.value = key;
}
function copyEntry() {
  const key = unique(`${activeEntry.value}副本`);
  commit(d => {
    d[key] = structuredClone(d[activeEntry.value]);
    const m = ensureMainlineMeta(d);
    m.layouts[key] = structuredClone(m.layouts[activeEntry.value]);
    regenerateIds(m.layouts[key].blocks);
  });
  activeEntry.value = key;
}
function removeEntry() {
  const key = activeEntry.value;
  commit(d => {
    delete d[key];
    const m = ensureMainlineMeta(d);
    delete m.layouts[key];
  });
  selectedBlockId.value = '';
}
function addBlock(type: MainlineBlockType) {
  commit(d => {
    const layout = ensureMainlineMeta(d).layouts[activeEntry.value],
      block = createMainlineBlock(type, type === 'title' ? ['$title'] : undefined);
    const selected = findBlock(layout.blocks, selectedBlockId.value);
    if (selected?.type === 'container') selected.children!.push(block);
    else layout.blocks.push(block);
    selectedBlockId.value = block.id;
  });
}
function locate(blocks: MainlineBlock[], id: string): { list: MainlineBlock[]; index: number } | null {
  for (let index = 0; index < blocks.length; index++) {
    if (blocks[index].id === id) return { list: blocks, index };
    const nested = locate(blocks[index].children ?? [], id);
    if (nested) return nested;
  }
  return null;
}
function findBlock(blocks: MainlineBlock[], id: string): MainlineBlock | undefined {
  return locate(blocks, id)?.list[locate(blocks, id)!.index];
}
function moveBlock(id: string, delta: number) {
  commit(d => {
    const found = locate(ensureMainlineMeta(d).layouts[activeEntry.value].blocks, id);
    if (!found) return;
    const target = found.index + delta;
    if (target < 0 || target >= found.list.length) return;
    [found.list[found.index], found.list[target]] = [found.list[target], found.list[found.index]];
  });
}
function removeBlock(id: string) {
  commit(d => {
    const found = locate(ensureMainlineMeta(d).layouts[activeEntry.value].blocks, id);
    if (found) found.list.splice(found.index, 1);
  });
  if (selectedBlockId.value === id) selectedBlockId.value = '';
}
function copyBlock(id: string) {
  commit(d => {
    const found = locate(ensureMainlineMeta(d).layouts[activeEntry.value].blocks, id);
    if (!found) return;
    const copy = structuredClone(found.list[found.index]);
    regenerateIds([copy]);
    found.list.splice(found.index + 1, 0, copy);
    selectedBlockId.value = copy.id;
  });
}
function regenerateIds(blocks: MainlineBlock[]) {
  for (const block of blocks) {
    block.id = crypto.randomUUID();
    regenerateIds(block.children ?? []);
  }
}
function sourceKey(path?: string[]) {
  return path ? JSON.stringify(path) : '';
}
function updateSelected(mutator: (block: MainlineBlock) => void) {
  commit(d => {
    const block = findBlock(ensureMainlineMeta(d).layouts[activeEntry.value].blocks, selectedBlockId.value);
    if (block) mutator(block);
  });
}
function changeLabel(event: Event) {
  updateSelected(block => {
    block.label = (event.target as HTMLInputElement).value;
  });
}
function changeVariant(event: Event) {
  updateSelected(block => {
    block.variant = (event.target as HTMLSelectElement).value;
  });
}
function changeSource(event: Event) {
  const value = (event.target as HTMLSelectElement).value;
  updateSelected(block => {
    block.source = value ? JSON.parse(value) : undefined;
  });
}
function updateData(value: Record<string, unknown> | unknown[]) {
  commit(d => {
    d[activeEntry.value] = value;
  });
}
function componentIcon(type: string) {
  return (
    { title: 'T', text: '¶', metric: '#', list: '☷', tags: '◇', divider: '—', container: '▣' } as Record<
      string,
      string
    >
  )[type];
}
</script>
<style scoped>
.composer {
  display: grid;
  gap: 12px;
  min-width: 0;
}
.composer-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}
.composer-head h4 {
  margin: 2px 0;
}
.composer-head p {
  margin: 0;
  color: #898c90;
}
.composer-head small,
.canvas small {
  color: #cbb477;
  letter-spacing: 0.13em;
}
.entry-tabs {
  display: flex;
  gap: 5px;
  overflow-x: auto;
}
.entry-tabs button {
  flex: 0 0 auto;
}
.entry-tabs .active {
  color: #d7c38f;
  border-color: #c5a059;
}
.studio {
  display: grid;
  grid-template-columns: 125px minmax(280px, 1fr) 210px;
  min-width: 0;
  min-height: 430px;
  border: 1px solid #393d3f;
  background: #101214;
}
.palette,
.inspector {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 11px;
  background: #171a1c;
}
.palette {
  border-right: 1px solid #393d3f;
}
.inspector {
  border-left: 1px solid #393d3f;
}
.palette h5,
.inspector h5 {
  margin: 0 0 5px;
}
.palette button {
  display: flex;
  gap: 8px;
  align-items: center;
  text-align: left;
}
.palette button b {
  display: grid;
  width: 22px;
  height: 22px;
  place-items: center;
  color: #cbb477;
  border: 1px solid #554a32;
}
.palette p,
.inspector p {
  color: #777;
  font-size: 0.75rem;
}
.canvas {
  display: flex;
  min-width: 0;
  flex-direction: column;
}
.canvas > header {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 10px;
  border-bottom: 1px solid #393d3f;
}
.canvas > header > div {
  display: flex;
  gap: 6px;
  align-items: center;
}
.canvas > header input {
  font-size: 1.05rem;
  font-weight: bold;
}
.canvas-surface {
  display: grid;
  gap: 4px;
  align-content: start;
  min-height: 350px;
  padding: 16px;
  background: radial-gradient(circle at 50% 0, rgba(197, 160, 89, 0.055), transparent 45%);
}
.inspector label {
  display: grid;
  gap: 4px;
  font-size: 0.8rem;
}
.empty {
  margin: auto;
  color: #777;
}
.data-source {
  padding: 10px;
  background: #151719;
  border: 1px solid #393d3f;
}
.data-source summary {
  cursor: pointer;
  color: #aaa;
}
.data-source[open] summary {
  margin-bottom: 10px;
}
.danger {
  color: #dc8e83;
}
@media (max-width: 900px) {
  .studio {
    grid-template-columns: 105px minmax(240px, 1fr);
  }
  .inspector {
    grid-column: 1/-1;
    border-top: 1px solid #393d3f;
    border-left: 0;
  }
}
@media (max-width: 620px) {
  .studio {
    grid-template-columns: 1fr;
  }
  .palette {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    border-right: 0;
    border-bottom: 1px solid #393d3f;
  }
  .palette h5,
  .palette p {
    grid-column: 1/-1;
  }
  .palette button {
    display: grid;
    justify-items: center;
  }
  .inspector {
    grid-column: auto;
  }
  .composer-head,
  .canvas > header {
    flex-direction: column;
  }
}
</style>
