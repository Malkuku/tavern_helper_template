<template>
  <div class="data-intro inventory-intro">
    <span>物资管理</span>
    <h1>随身与仓库</h1>
    <p>查看物品，选择数量后存入或取出。</p>
  </div>
  <div class="inventory-toolbar">
    <div class="data-pages" role="tablist" aria-label="库存位置">
      <button
        v-for="side in sides"
        :key="side"
        type="button"
        role="tab"
        :aria-selected="activeSide === side"
        :class="{ active: activeSide === side }"
        @click="selectSide(side)"
      >
        {{ side }} <small>{{ count(side) }}</small>
      </button>
    </div>
    <input v-model="query" type="search" aria-label="搜索物品" placeholder="搜索物品" class="inventory-search" />
  </div>
  <p v-if="notice" class="inventory-notice" role="status">{{ notice }}</p>
  <p v-if="error" class="data-error" role="alert">{{ error }}</p>
  <div v-if="transfers.length" class="inventory-pending data-card">
    <div>
      <strong>待确认变更 {{ transfers.length }} 项</strong><small>确认后写入当前楼层</small>
    </div>
    <button type="button" :disabled="saving" @click="clearDraft">撤销</button>
    <button type="button" class="primary" :disabled="saving" @click="save">
      {{ saving ? '保存中…' : '确认变更' }}
    </button>
  </div>
  <div v-if="visibleItems.length" class="data-sections inventory-list">
    <section v-for="[name, item] in visibleItems" :key="name" class="data-card item-card">
      <button type="button" class="inventory-item-button" @click="selectItem(name)">
        <InventoryIcon :svg="item.图标" />
        <span class="inventory-item-copy"
          ><strong>{{ name }}</strong
          ><small>{{ item.描述 || '暂无描述' }}</small></span
        >
        <span class="item-count">× {{ item.数量 }}</span>
      </button>
      <div v-if="selectedName === name" class="inventory-detail">
        <p v-if="item.描述" class="data-prose">{{ item.描述 }}</p>
        <div v-if="item.作用" class="item-effect">
          <span>作用</span>
          <p>{{ item.作用 }}</p>
        </div>
        <div class="inventory-transfer">
          <label>数量 <input v-model.number="quantity" type="number" min="1" :max="item.数量" step="1" /></label>
          <button type="button" class="primary" :disabled="saving" @click="stageTransfer(name, item)">
            {{ activeSide === '随身物品' ? '存入仓库' : '取出随身' }}
          </button>
        </div>
      </div>
    </section>
  </div>
  <div v-else class="data-empty inventory-empty">
    <strong>{{ query ? '没有匹配的物品' : activeSide === '随身物品' ? '暂无随身物品' : '仓库为空' }}</strong>
  </div>
</template>

<script setup lang="ts">
import type { stat_data, 物品 } from '../../types';
import { computed, ref, watch } from 'vue';
import { klona } from 'klona';
import { useMagicGirlStatStore } from '../../store/StatStore';
import { applyInventoryTransfers, inventoryOf, type InventorySide, type InventoryTransfer } from './inventoryTransfer';
import InventoryIcon from './InventoryIcon.vue';

const props = defineProps<{ data: stat_data; app: InventorySide }>();
const sides: InventorySide[] = ['随身物品', '仓库'];
const store = useMagicGirlStatStore();
const activeSide = ref<InventorySide>(props.app);
const selectedName = ref('');
const quantity = ref(1);
const query = ref('');
const transfers = ref<InventoryTransfer[]>([]);
const saving = ref(false);
const error = ref('');
const notice = ref('');

const preview = computed(() => {
  const data = klona(props.data);
  try {
    applyInventoryTransfers(data, transfers.value);
  } catch {
    return props.data;
  }
  return data;
});
const visibleItems = computed(() =>
  Object.entries(inventoryOf(preview.value, activeSide.value)).filter(([name]) => name.includes(query.value)),
);
function count(side: InventorySide): number {
  return Object.keys(inventoryOf(preview.value, side)).length;
}
function selectSide(side: InventorySide) {
  activeSide.value = side;
  selectedName.value = '';
  quantity.value = 1;
  error.value = '';
}
function selectItem(name: string) {
  selectedName.value = selectedName.value === name ? '' : name;
  quantity.value = 1;
  error.value = '';
}
function stageTransfer(name: string, item: 物品) {
  if (!Number.isSafeInteger(quantity.value) || quantity.value < 1 || quantity.value > item.数量) {
    error.value = `请输入 1 到 ${item.数量} 之间的整数。`;
    return;
  }
  transfers.value.push({ from: activeSide.value, name, quantity: quantity.value });
  selectedName.value = '';
  quantity.value = 1;
  error.value = '';
  notice.value = `${name} 已加入待确认变更。`;
}
function clearDraft() {
  transfers.value = [];
  error.value = '';
  notice.value = '';
}
async function save() {
  if (saving.value || !transfers.value.length) return;
  saving.value = true;
  error.value = '';
  try {
    await store.transferInventory(transfers.value.map(transfer => ({ ...transfer })));
    transfers.value = [];
    selectedName.value = '';
    notice.value = '库存变更已保存。';
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '保存失败，请重试。';
  } finally {
    saving.value = false;
  }
}
watch(
  () => props.app,
  value => selectSide(value),
);
watch(
  () => props.data,
  () => {
    if (!saving.value && transfers.value.length) {
      clearDraft();
      notice.value = '库存数据已更新，待确认变更已撤销。';
    }
  },
);
</script>
