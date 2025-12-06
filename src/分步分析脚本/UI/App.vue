<template>
  <!-- 遮罩 -->
  <div v-if="visible" class="mask" @click.self="close">
    <div class="card">
      <h3 class="title">ERA 分步分析设置</h3>

      <!-- 分步分析开关 -->
      <label class="switch-row">
        <span>分步分析模式</span>
        <input
          type="checkbox"
          :checked="uiStore.isAsync"
          @change="uiStore.isAsync = !uiStore.isAsync"
        />
        <span class="switch"></span>
      </label>

      <!-- 模型来源 -->
      <div class="row">
        <span>模型来源</span>
        <select v-model="modelSource">
          <option value="sample">当前模型</option>
          <option value="external">额外模型</option>
        </select>
      </div>

      <!-- 额外模型参数（仅 external 时显示） -->
      <div v-if="modelSource === 'external'" class="form">
        <div class="row">
          <span>接口地址</span>
          <input v-model="settings.baseURL" placeholder="https://api.openai.com/v1" />
        </div>
        <div class="row">
          <span>API 密钥（请注意好个人隐私）</span>
          <input v-model="settings.apiKey" type="password" placeholder="sk-..." />
        </div>
        <div class="row">
          <span>模型名称</span>
          <input v-model="settings.modelName" placeholder="gpt-3.5-turbo" />
        </div>
        <div class="row">
          <span>温度</span>
          <input v-model="settings.temperature" type="number" step="0.1" min="0" max="2" />
        </div>
        <div class="row">
          <span>频率惩罚</span>
          <input v-model="settings.frequencyPenalty" type="number" step="0.1" min="-2" max="2" />
        </div>
        <div class="row">
          <span>存在惩罚</span>
          <input v-model="settings.presencePenalty" type="number" step="0.1" min="-2" max="2" />
        </div>
        <div class="row">
          <span>最大Token数</span>
          <input v-model="settings.maxTokens" type="number" min="1" />
        </div>
        <div v-if="modelSource === 'external'" class="row">
          <span></span>
          <button class="btn small" @click="testConnect">测试连接</button>
        </div>
      </div>

      <!-- 底部按钮 -->
      <div class="footer">
        <button class="btn" @click="close">取消</button>
        <button class="btn danger" @click="handleClear">清空</button>
        <button class="btn primary" @click="handleSave">保存</button>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { useUiStore } from './store'
import * as toastr from 'toastr'

const uiStore = useUiStore()
const visible = computed(() => uiStore.showUI)

/* 本地草稿 */
const modelSource = ref<'sample' | 'external'>('sample')
const settings = reactive({
  baseURL: '',
  apiKey: '',
  modelName: '',
  temperature: 0.7,
  frequencyPenalty: 0,
  presencePenalty: 0,
  maxTokens: 20000
})

/* 打开时同步 store 数据 */
watch(
  () => uiStore.showUI,
  v => {
    if (!v) return
    modelSource.value = uiStore.modelSource as any;
    Object.assign(settings, uiStore.customModelSettings)
  },
  { immediate: true }
)

/* 保存 */
const handleSave = async () => {
  uiStore.modelSource = modelSource.value
  uiStore.customModelSettings = { ...settings } as any
  await uiStore.saveModelSettings()
  toastr.success('设置已保存')
  close()
}

/* 清空（恢复默认） */
const handleClear = async () => {
  await uiStore.clearModelSettings()
  modelSource.value = uiStore.modelSource as any
  Object.assign(settings, uiStore.customModelSettings)
  toastr.info('已清空设置')
}

const close = () => {
  uiStore.showUI = false
}

/*TODO  测试连接：发一条最轻量的请求 */
const testConnect = async () => {
  if (!settings.baseURL || !settings.apiKey) {
    toastr.warning('请先填写接口地址与 API 密钥')
    return
  }

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 8000) // 8 秒超时

  try {
    const res = await fetch(`${settings.baseURL.replace(/\/$/, '')}/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${settings.apiKey.trim()}`
      },
      signal: ctrl.signal
    })
    clearTimeout(timer)

    if (res.ok) {
      toastr.success('连接成功，密钥可用 ✓')
    } else {
      const text = await res.text().catch(() => res.statusText)
      toastr.error(`连接失败：${res.status} ${text}`)
    }
  } catch (e: any) {
    clearTimeout(timer)
    toastr.error(`网络错误：${e.message || '无法到达服务器'}`)
  }
}
</script>

<style scoped>
.mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: fade 0.2s ease;
}
@keyframes fade {
  from {
    opacity: 0;
  }
}
.card {
  background: #fff;
  border-radius: 12px;
  padding: 24px 28px;
  width: 420px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
  animation: slide 0.25s ease;
}
@keyframes slide {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
}
.title {
  margin: 0 0 20px;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}
.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  cursor: pointer;
  user-select: none;
}
.switch-row input[type='checkbox'] {
  display: none;
}
.switch {
  position: relative;
  width: 40px;
  height: 22px;
  background: #ccc;
  border-radius: 11px;
  transition: background 0.3s;
}
.switch::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  background: #fff;
  border-radius: 50%;
  transition: left 0.3s;
}
.switch-row input:checked + .switch {
  background: #4f46e5;
}
.switch-row input:checked + .switch::after {
  left: 20px;
}
.form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}
.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.row span {
  width: 130px;
  font-size: 14px;
  color: #444;
}
.row input {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 14px;
}
.footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.btn {
  padding: 6px 16px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition:
    background 0.2s,
    color 0.2s;
  background: #f3f4f6;
  color: #111;
}
.btn:hover {
  background: #e5e7eb;
}
.btn.primary {
  background: #4f46e5;
  color: #fff;
}
.btn.primary:hover {
  background: #4338ca;
}
.btn.danger {
  background: #ef4444;
  color: #fff;
}
.btn.danger:hover {
  background: #dc2626;
}
.btn.small {
  padding: 4px 12px;
  font-size: 13px;
}
</style>
