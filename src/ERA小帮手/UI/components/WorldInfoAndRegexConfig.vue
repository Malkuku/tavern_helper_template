<template>
  <div class="config-container">
    <!-- 世界书配置部分 -->
    <div class="collapsible-section">
      <div class="section-header" @click="toggleWorldInfoSection">
        <h4>世界书配置</h4>
        <span class="toggle-icon">{{ isWorldInfoOpen ? '−' : '+' }}</span>
      </div>
      <div v-show="isWorldInfoOpen" class="section-content">
        <div class="world-info-config">
          <div class="config-section">
            <h5>AnalyzeList</h5>
            <div class="entry-list">
              <div v-for="(entry, index) in localAnalyzeEntries" :key="index" class="entry-item">
                <select v-model="localAnalyzeEntries[index]" class="entry-select">
                  <option value="">请选择世界书条目</option>
                  <option v-for="name in worldBookNames" :key="name" :value="name">{{ name }}</option>
                </select>
                <button class="btn remove-btn" @click="removeAnalyzeEntry(index)">×</button>
              </div>
              <button class="btn add-btn" @click="addAnalyzeEntry">添加条目</button>
            </div>
          </div>

          <div class="config-section">
            <h5>UpdateList</h5>
            <div class="entry-list">
              <div v-for="(entry, index) in localUpdateEntries" :key="index" class="entry-item">
                <select v-model="localUpdateEntries[index]" class="entry-select">
                  <option value="">请选择世界书条目</option>
                  <option v-for="name in worldBookNames" :key="name" :value="name">{{ name }}</option>
                </select>
                <button class="btn remove-btn" @click="removeUpdateEntry(index)">×</button>
              </div>
              <button class="btn add-btn" @click="addUpdateEntry">添加条目</button>
            </div>
          </div>

          <div class="config-section">
            <h5>IgnoreList</h5>
            <div class="entry-list">
              <div v-for="(entry, index) in localIgnoreEntries" :key="index" class="entry-item">
                <select v-model="localIgnoreEntries[index]" class="entry-select">
                  <option value="">请选择世界书条目</option>
                  <option v-for="name in worldBookNames" :key="name" :value="name">{{ name }}</option>
                </select>
                <button class="btn remove-btn" @click="removeIgnoreEntry(index)">×</button>
              </div>
              <button class="btn add-btn" @click="addIgnoreEntry">添加条目</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 正则表达式配置部分 -->
    <div class="collapsible-section">
      <div class="section-header" @click="toggleRegexSection">
        <h4>正则表达式配置</h4>
        <span class="toggle-icon">{{ isRegexOpen ? '−' : '+' }}</span>
      </div>
      <div v-show="isRegexOpen" class="section-content">
        <div class="regex-config">
          <div class="config-section">
            <h5>正则表达式列表</h5>
            <div class="entry-list">
              <div v-for="(regex, index) in localRegexList" :key="index" class="entry-item">
                <input v-model="localRegexList[index]" type="text" class="regex-input" placeholder="请输入正则表达式" />
                <button class="btn remove-btn" @click="removeRegex(index)">×</button>
              </div>
              <button class="btn add-btn" @click="addRegex">添加正则</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="actions">
      <button class="btn danger" @click="handleClear">清空配置</button>
      <button class="btn primary" @click="handleSave">保存配置</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import * as toastr from 'toastr'
import { useAsyncAnalyzeStore } from '../../stores/AsyncAnalyzeStore'
import { storeToRefs } from 'pinia'
import { WorldInfoUtil } from '../../../Utils/WorldInfoUtil'

const asyncAnalyzeStore = useAsyncAnalyzeStore()
const { analyzeRores, updateRores, ignoreRores, regexList } = storeToRefs(asyncAnalyzeStore)

// 可展开/收起状态
const isWorldInfoOpen = ref(false)
const isRegexOpen = ref(false)

// 本地数据副本
const localAnalyzeEntries = ref<string[]>([])
const localUpdateEntries = ref<string[]>([])
const localIgnoreEntries = ref<string[]>([])
const localRegexList = ref<string[]>([])

// 世界书名称列表
const worldBookNames = ref<string[]>([])

// 切换世界书配置区域展开/收起
const toggleWorldInfoSection = () => {
  isWorldInfoOpen.value = !isWorldInfoOpen.value
}

// 切换正则配置区域展开/收起
const toggleRegexSection = () => {
  isRegexOpen.value = !isRegexOpen.value
}

// 获取世界书名称列表
const loadWorldBookNames = async () => {
  try {
    worldBookNames.value = await WorldInfoUtil.getAllWorldBookNames()
  } catch (error) {
    console.error('获取世界书名称失败:', error)
    toastr.error('获取世界书名称失败')
  }
}

// 添加世界书条目
const addAnalyzeEntry = () => {
  localAnalyzeEntries.value.push('')
}

const addUpdateEntry = () => {
  localUpdateEntries.value.push('')
}

const addIgnoreEntry = () => {
  localIgnoreEntries.value.push('')
}

// 删除世界书条目
const removeAnalyzeEntry = (index: number) => {
  localAnalyzeEntries.value.splice(index, 1)
}

const removeUpdateEntry = (index: number) => {
  localUpdateEntries.value.splice(index, 1)
}

const removeIgnoreEntry = (index: number) => {
  localIgnoreEntries.value.splice(index, 1)
}

// 正则表达式操作
const addRegex = () => {
  localRegexList.value.push('')
}

const removeRegex = (index: number) => {
  localRegexList.value.splice(index, 1)
}

// 保存配置
const handleSave = async () => {
  // 更新 store 中的值
  analyzeRores.value = [...localAnalyzeEntries.value]
  updateRores.value = [...localUpdateEntries.value]
  ignoreRores.value = [...localIgnoreEntries.value]
  regexList.value = [...localRegexList.value]

  await asyncAnalyzeStore.saveWorldInfoFilterConfig()
  await asyncAnalyzeStore.saveRegexConfig()

  toastr.success('配置已保存')
}

// 清空配置
const handleClear = async () => {
  if (confirm('确定要清空所有配置吗？')) {
    localAnalyzeEntries.value = []
    localUpdateEntries.value = []
    localIgnoreEntries.value = []
    localRegexList.value = []

    await asyncAnalyzeStore.clearWorldInfoFilterConfig()
    await asyncAnalyzeStore.clearRegexConfig()

    toastr.info('配置已清空')
  }
}

// 初始化数据
onMounted(async () => {
  // 加载世界书名称
  await loadWorldBookNames()

  // 从 store 初始化本地值
  localAnalyzeEntries.value = [...analyzeRores.value]
  localUpdateEntries.value = [...updateRores.value]
  localIgnoreEntries.value = [...ignoreRores.value]
  localRegexList.value = [...regexList.value]
})

// 监听store变化并同步到本地
watch(
  () => [
    // 监听 store 中的值变化
    analyzeRores.value,
    updateRores.value,
    ignoreRores.value,
    regexList.value
  ],
  () => {
    // 同步 store 值到本地
    localAnalyzeEntries.value = [...analyzeRores.value]
    localUpdateEntries.value = [...updateRores.value]
    localIgnoreEntries.value = [...ignoreRores.value]
    localRegexList.value = [...regexList.value]
  }
)
</script>

<style scoped lang="scss">
.config-container {
  margin-top: 20px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

.collapsible-section {
  margin-bottom: 20px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #ffffff;
  cursor: pointer;
  user-select: none;
  font-weight: 500;
  color: #111827;
}

.toggle-icon {
  font-size: 18px;
  font-weight: bold;
}

.section-content {
  padding: 16px;
  background: #f9fafb;
}

.config-section {
  margin-bottom: 20px;

  &:last-child {
    margin-bottom: 0;
  }

  h5 {
    margin: 0 0 12px 0;
    font-size: 14px;
    color: #4b5563;
  }
}

.entry-list {
  .entry-item {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;

    &:last-child {
      margin-bottom: 12px;
    }
  }

  .entry-select,
  .regex-input {
    flex: 1;
    padding: 6px 10px;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    font-size: 14px;
    background: white;
  }

  .btn {
    padding: 6px 12px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    transition: background 0.2s;

    &.add-btn {
      background: #6366f1;
      color: white;

      &:hover {
        background: #4f46e5;
      }
    }

    &.remove-btn {
      background: #ef4444;
      color: white;
      width: 32px;
      padding: 0;

      &:hover {
        background: #dc2626;
      }
    }
  }
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;

  .btn {
    padding: 8px 16px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    transition: background 0.2s;

    &.primary {
      background: #6366f1;
      color: white;

      &:hover {
        background: #4f46e5;
      }
    }

    &.danger {
      background: #ef4444;
      color: white;

      &:hover {
        background: #dc2626;
      }
    }
  }
}
</style>
