<template>
  <div class="inventory-module" :class="{ editing: mode === 'edit' }">
    <div class="toolbar">
      <button v-if="mode === 'edit'" type="button" @click="addItem">＋ 新增物品</button>
      <div class="search-box">
        <input v-model="searchQuery" type="text" placeholder="检索物品..." />
        <span class="search-icon">🔍</span>
      </div>

      <div class="sort-controls">
        <select v-model="sortBy">
          <option value="name">名称排序</option>
          <option value="count">数量优先</option>
          <option value="durability">耐久优先</option>
        </select>
      </div>
    </div>

    <!-- 分类标签 -->
    <div class="category-scroll-wrapper">
      <div class="category-tabs">
        <button
          v-for="cat in dynamicCategories"
          :key="cat"
          :class="['cat-btn', { active: activeCategory === cat }]"
          @click="activeCategory = cat"
        >
          {{ cat }}
        </button>
      </div>
    </div>

    <!-- 主体区域 -->
    <div class="inventory-container">
      <!-- 物品目录 -->
      <div class="inventory-grid-wrapper">
        <div class="inventory-grid">
          <ItemCard
            v-for="item in filteredItems"
            :key="item.name"
            :name="item.name"
            :type="item.类型"
            :quality="item.品质"
            :quantity="item.数量"
            :durability="item.耐久"
            :is-selected="selectedItem?.name === item.name"
            @click="toggleDetail(item)"
          />

          <div v-if="filteredItems.length === 0" class="empty-state">
            <p>无相关物品</p>
          </div>
        </div>
      </div>

      <!-- 当前物品编辑区 -->
      <Transition name="panel-slide">
        <ItemDetailPanel
          v-if="selectedItem"
          :name="selectedItem.name"
          :type="selectedItem.类型"
          :quality="selectedItem.品质"
          :quantity="selectedItem.数量"
          :durability="selectedItem.耐久"
          :description="selectedItem.描述"
          :effect="selectedItem.作用"
          :mode="mode"
          @close="closeDetail"
          @rename="renameItem"
          @update:field="updateItemField"
          @delete="deleteItem"
        >
          <template v-if="mode === 'edit'" #actions><button type="button" @click="copyItem">复制物品</button></template>
        </ItemDetailPanel>
      </Transition>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import ItemCard from '@/尘史使徒/UI/components/common/ItemCard.vue';
import ItemDetailPanel from '@/尘史使徒/UI/components/common/ItemDetailPanel.vue';

const props = defineProps({
  data: {
    type: Object,
    default: () => ({}),
  },
  mode: { type: String, default: 'view' },
});
const emit = defineEmits(['update:data']);

const searchQuery = ref('');
const sortBy = ref('name');
const activeCategory = ref('全部');
const selectedItem = ref(null);

const allItems = computed(() => {
  if (!props.data) return [];
  return Object.entries(props.data)
    .map(([key, val]) => {
      if (typeof val === 'string') {
        return {
          name: key,
          类型: '未知',
          品质: '凡庸',
          描述: val,
          作用: '未知',
          数量: 1,
          耐久: 0,
        };
      }
      return {
        name: key,
        类型: val.类型 || '杂物',
        品质: val.品质 || '凡庸',
        描述: val.描述 || '',
        作用: val.作用 || '',
        数量: val.数量 || 0,
        耐久: val.耐久 || 0,
      };
    })
    .filter(item => item.name !== '$template');
});

const dynamicCategories = computed(() => {
  const types = new Set();
  allItems.value.forEach(item => {
    if (item.类型) types.add(item.类型);
  });
  return ['全部', ...Array.from(types).sort()];
});

const filteredItems = computed(() => {
  let items = [...allItems.value];

  if (activeCategory.value !== '全部') {
    items = items.filter(i => i.类型 === activeCategory.value);
  }

  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
    items = items.filter(i => i.name.toLowerCase().includes(query) || (i.描述 && i.描述.toLowerCase().includes(query)));
  }

  items.sort((a, b) => {
    if (sortBy.value === 'count') return b.数量 - a.数量;
    if (sortBy.value === 'durability') return b.耐久 - a.耐久;
    return a.name.localeCompare(b.name, 'zh-CN');
  });

  return items;
});

const toggleDetail = item => {
  if (selectedItem.value && selectedItem.value.name === item.name) {
    closeDetail();
  } else {
    selectedItem.value = item;
  }
};

const closeDetail = () => {
  selectedItem.value = null;
};
const uniqueName = base => {
  let name = base,
    index = 2;
  while (name in props.data) name = `${base}${index++}`;
  return name;
};
const addItem = () => {
  const name = uniqueName('新物品');
  emit('update:data', {
    ...props.data,
    [name]: { 类型: '杂物', 品质: '凡庸', 描述: '', 作用: '', 数量: 1, 耐久: 100 },
  });
  selectedItem.value = { name, 类型: '杂物', 品质: '凡庸', 描述: '', 作用: '', 数量: 1, 耐久: 100 };
};
const updateItemField = (field, value) => {
  if (!selectedItem.value) return;
  const name = selectedItem.value.name;
  const nextItem = { ...props.data[name], [field]: value };
  if (field === '类型') {
    const isDocument = ['秘传', '仪式'].includes(value);
    const allowed = isDocument
      ? ['遗片', '佚存', '残卷', '蛀损', '完帙', '未知']
      : ['凡庸', '遗物', '佚品', '珍品', '禁忌', '神造', '未知'];
    if (!allowed.includes(nextItem.品质)) nextItem.品质 = isDocument ? '遗片' : '凡庸';
  }
  emit('update:data', { ...props.data, [name]: nextItem });
  selectedItem.value = { name, ...nextItem };
};
const renameItem = value => {
  if (!selectedItem.value) return;
  const oldName = selectedItem.value.name,
    name = String(value).trim();
  if (!name || (name !== oldName && name in props.data)) return;
  const next = {};
  for (const [key, item] of Object.entries(props.data)) next[key === oldName ? name : key] = item;
  emit('update:data', next);
  selectedItem.value = { ...selectedItem.value, name };
};
const deleteItem = () => {
  if (!selectedItem.value) return;
  const next = { ...props.data };
  delete next[selectedItem.value.name];
  emit('update:data', next);
  closeDetail();
};
const copyItem = () => {
  if (!selectedItem.value) return;
  const name = uniqueName(`${selectedItem.value.name}副本`),
    nextItem = structuredClone(props.data[selectedItem.value.name]);
  emit('update:data', { ...props.data, [name]: nextItem });
  selectedItem.value = { name, ...nextItem };
};
</script>

<style scoped>
* {
  box-sizing: border-box;
}

.inventory-module {
  --c-bg: #0f0f13;
  --c-card-bg: #1a1a1f;
  --c-text: #e0e0e0;
  --c-border: rgba(255, 255, 255, 0.08);

  position: relative;
  isolation: isolate;
  background: var(--c-bg);
  color: var(--c-text);
  padding: 20px;
  min-height: 0;
  width: 100%;
  font-family: 'Segoe UI', sans-serif;
  overflow: visible;
  display: flex;
  flex-direction: column;
}

.toolbar {
  display: flex;
  gap: 15px;
  margin-bottom: 15px;
  flex-shrink: 0;
}

.search-box {
  flex: 1;
  position: relative;
}

.search-box input {
  width: 100%;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--c-border);
  color: #fff;
  padding: 10px 40px 10px 15px;
  border-radius: 4px;
  font-size: 0.95rem;
}

.search-box input:focus {
  border-color: rgba(255, 214, 165, 0.5);
  outline: none;
  background: rgba(0, 0, 0, 0.3);
}

.search-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0.4;
}

.sort-controls select {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--c-border);
  color: #aaa;
  padding: 0 15px;
  height: 100%;
  border-radius: 4px;
  cursor: pointer;
}

.category-scroll-wrapper {
  width: 100%;
  overflow-x: auto;
  padding-bottom: 5px;
  margin-bottom: 15px;
  border-bottom: 1px solid var(--c-border);
  flex-shrink: 0;
  scrollbar-width: none;
}

.category-scroll-wrapper::-webkit-scrollbar {
  display: none;
}

.category-tabs {
  display: flex;
  gap: 10px;
  white-space: nowrap;
}

.cat-btn {
  background: transparent;
  border: 1px solid transparent;
  color: #666;
  padding: 6px 16px;
  border-radius: 4px;
  cursor: pointer;
  transition: 0.2s;
  font-size: 0.9rem;
}

.cat-btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.05);
}

.cat-btn.active {
  color: rgb(255, 214, 165);
  border-color: rgba(255, 214, 165, 0.3);
  background: rgba(255, 214, 165, 0.05);
}

.inventory-container {
  flex: 1;
  display: flex;
  flex-direction: row;
  overflow: visible;
  position: relative;
  gap: 0;
}

.inventory-grid-wrapper {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.inventory-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
  overflow: visible;
  padding-right: 5px;
  padding-bottom: 20px;
  align-content: start;
}
.inventory-module.editing .inventory-container {
  flex-direction: column;
  gap: 14px;
}
.inventory-module.editing :deep(.detail-panel) {
  flex: none;
  width: 100%;
  z-index: 1 !important;
  border-top: 2px solid var(--q-color);
  border-left: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.28);
}
.inventory-module.editing :deep(.panel-content-wrapper) {
  display: grid;
  grid-template-columns: minmax(160px, 0.7fr) minmax(150px, 0.55fr) repeat(2, minmax(180px, 1fr));
  gap: 12px;
  overflow: visible;
  padding: 0 16px 16px;
}
.inventory-module.editing :deep(.panel-header) {
  margin: 0;
  text-align: left;
}
.inventory-module.editing :deep(.panel-meta) {
  justify-content: flex-start;
}
.inventory-module.editing :deep(.stat-grid),
.inventory-module.editing :deep(.info-section) {
  margin: 0;
}
.inventory-module.editing :deep(.delete-item) {
  grid-column: 1 / -1;
  width: auto;
  justify-self: start;
}
.inventory-module.editing :deep(.panel-actions) {
  padding: 5px 10px;
}
.inventory-module.editing :deep(.panel-title) {
  font-size: 1.2rem;
}
.inventory-module.editing :deep(.stat-box) {
  padding: 8px;
}
.inventory-module.editing :deep(textarea) {
  min-height: 72px;
  resize: vertical;
}

.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding-top: 50px;
  color: #555;
  font-style: italic;
}

@media (max-width: 768px) {
  .inventory-module {
    padding: 10px;
  }

  .toolbar {
    flex-direction: column;
    gap: 10px;
  }

  .sort-controls select {
    width: 100%;
    padding: 8px;
  }

  .inventory-grid {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 8px;
  }
  .inventory-module.editing :deep(.detail-panel) {
    position: relative !important;
    inset: auto !important;
    width: 100% !important;
    height: auto !important;
  }
  .inventory-module.editing :deep(.panel-content-wrapper) {
    grid-template-columns: 1fr;
    padding-bottom: 20px;
  }
}
</style>
