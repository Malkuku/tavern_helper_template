<template>
  <div class="card">
    <h3 class="title">
      ERA 分步分析设置
    </h3>
    <!-- 分步分析开关 -->
    <label class="switch-row">
      <span>分步分析模式</span>
      <input
        type="checkbox"
        :checked="asyncAnalyzeStore.isAsync"
        @change="asyncAnalyzeStore.isAsync = !asyncAnalyzeStore.isAsync"
      />
      <span class="switch"></span>
    </label>

    <span>!目前流式生成的分析的ejs替换有bug，分步模式请不要打开流式</span>

    <!-- 模型来源 -->
    <div class="row">
      <span>模型来源</span>
      <select v-model="modelSource">
        <option value="sample">当前模型</option>
        <option value="profile" @click="refreshProfileList">预设模型</option>
        <option value="external">额外模型</option>
      </select>
    </div>
    <div v-if="modelSource === 'profile'" class="row">
      <span>预设模型</span>
      因为ERA和提示词模板的替换问题，目前不可用😑
    </div>


    <!-- TODO 因为ERA的替换问题，目前不可用  预设模型选择（仅 profile 时显示） -->
<!--      <div v-if="modelSource === 'profile'" class="row">-->
<!--        <span>预设模型</span>-->
<!--        <select v-model="profileSetting">-->
<!--          <option-->
<!--            v-for="p in profileList"-->
<!--            :key="p"-->
<!--            :value="p"-->
<!--            :title="p"-->
<!--          >-->
<!--            {{ shortName(p) }}-->
<!--          </option>-->
<!--        </select>-->
<!--      </div>-->



    <!-- 额外模型参数（仅 external 时显示） -->
    <div v-if="modelSource === 'external'" class="form">
      <div class="row">
        <span>接口地址</span>
        <input v-model="settings.baseURL" placeholder="https://api.openai.com/v1" />
      </div>
      <div class="row">
        <span>API密钥（请注意好个人隐私）</span>
        <input v-model="settings.apiKey" type="password" placeholder="sk-..." />
      </div>
      <div class="row">
        <!-- 模型名称 -->
        <div class="row">
          <span>模型名称</span>
          <select v-model="settings.modelName" style="flex:1">
            <option v-for="m in modelOptions" :key="m" :value="m" :title="m">{{ shortName(m) }}</option>
            <!-- 允许手动输入，兜底 -->
            <option v-if="settings.modelName && !modelOptions.includes(settings.modelName)" :value="settings.modelName">{{ settings.modelName }}</option>
          </select>
        </div>
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
    </div>


    <div class="row" style="justify-content: flex-start; gap: 12px;">
      <button class="btn small" @click="testConnect">测试连接</button>
      <button
        v-if="modelSource === 'external'"
        class="btn small"
        @click="getRemoteModels"
      >
        获取模型列表
      </button>
    </div>
    <br>

    <!-- 底部按钮 -->
    <div class="footer">
      <button class="btn" @click="close">取消</button>
      <button class="btn danger" @click="handleClear">清空</button>
      <button class="btn primary" @click="handleSave">保存</button>
    </div>
<!--      <button @click="testGetPreset">获取预设名称</button>-->
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import { useUiStore } from '../../stores/UIStore'
import * as toastr from 'toastr'
import { useAsyncAnalyzeStore } from '../../stores/AsyncAnalyzeStore';

const uiStore = useUiStore();
const asyncAnalyzeStore = useAsyncAnalyzeStore();

/* 预设名称缩略 */
const shortName = (full: string, max = 36) =>
  full.length > max ? full.slice(0, max - 1) + '…' : full;

/* 本地草稿 */
const modelSource = ref<'sample' | 'external' | 'profile'>('sample')
const profileSetting = ref('')          // 当前选中的预设
const profileList  = ref<string[]>([])  // 预设名称列表
const settings = reactive({
  baseURL: '',
  apiKey: '',
  modelName: '',
  temperature: 0.7,
  frequencyPenalty: 0,
  presencePenalty: 0,
  maxTokens: 20000
})

/* 打开弹窗时同步 store 数据 */
watch(
  () => uiStore.showUI,
  async v => {
    if (!v) return
    modelSource.value  = asyncAnalyzeStore.modelSource as any
    profileSetting.value = asyncAnalyzeStore.profileSetting || ''
    Object.assign(settings, asyncAnalyzeStore.customModelSettings)
  },
  { immediate: true }
)

/* 刷新预设列表 */
const refreshProfileList = async () => {
  try {
    const result = await (window as any).SillyTavern.executeSlashCommands('/profile-list');
    profileList.value = JSON.parse(result.pipe);
    console.log('预设名称列表:', profileList.value);
    profileSetting.value = profileList.value[0] // 默认选中第一个
  } catch (e) {
    toastr.error('获取预设列表失败');
    console.error('刷新预设列表失败', e)
    profileList.value = []
  }
}

/* 保存 */
const handleSave = async () => {
  asyncAnalyzeStore.modelSource      = modelSource.value
  asyncAnalyzeStore.profileSetting   = profileSetting.value
  asyncAnalyzeStore.customModelSettings = { ...settings } as any
  await asyncAnalyzeStore.saveModelSettings()
  toastr.success('设置已保存')
}

/* 清空（恢复默认） */
const handleClear = async () => {
  await asyncAnalyzeStore.clearModelSettings()
  modelSource.value      = asyncAnalyzeStore.modelSource as any
  profileSetting.value   = asyncAnalyzeStore.profileSetting || ''
  Object.assign(settings, asyncAnalyzeStore.customModelSettings)
  toastr.info('已清空设置')
}

const close = () => {
  uiStore.showUI = false
}

/*测试连接：发一条最轻量的请求 */
const testConnect = async () => {
  //先保存配置
  await handleSave();

  /* 1. 内置模型（sample / profile）*/
  if (modelSource.value === 'sample' || modelSource.value === 'profile') {
    try {
      let tempProfileSetting;
      if(modelSource.value === 'profile'){
        tempProfileSetting = (await (window as any).SillyTavern.executeSlashCommands('/profile') as any).pipe;
        console.log('当前预设名称:', tempProfileSetting);
        await (window as any).SillyTavern.executeSlashCommands(`/profile ${profileSetting.value}`);
      }
      // 用 ST 自带指令检查当前模型是否在线
      const res = await (window as any).SillyTavern.executeSlashCommands('/model');
      if (!res.error) {
        toastr.success('模型连接正常 ✓');
        if(modelSource.value === 'profile'){
          await (window as any).SillyTavern.executeSlashCommands(`/profile ${tempProfileSetting}`);
        }
      } else {
        toastr.error(`模型异常：${res.error}`);
      }
    } catch (e: any) {
      toastr.error(`检测失败：${e.message || '未知错误'}`);
    }
    return;
  }

  //2. 外部模型（external）
  if ((!settings.baseURL || !settings.apiKey)) {
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

/* 远端模型列表 */
const modelOptions = ref<string[]>([])

/* 获取远端模型列表 */
const getRemoteModels = async () => {
  if (!settings.baseURL || !settings.apiKey) {
    toastr.warning('请先填写接口地址与 API 密钥')
    return
  }
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 8000)
  try {
    const res = await fetch(`${settings.baseURL.replace(/\/$/, '')}/models`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${settings.apiKey.trim()}` },
      signal: ctrl.signal
    })
    clearTimeout(timer)
    if (!res.ok) {
      toastr.error(`获取失败：${res.status} ${await res.text().catch(() => res.statusText)}`)
    }
    const body = await res.json()
    modelOptions.value = (body.data || []).map((m: any) => m.id).sort()
    toastr.success(`共拉取 ${modelOptions.value.length} 个模型`)
  }finally {
    clearTimeout(timer)
  }
}

</script>

<style scoped>
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
.row input{
  flex: 1;
  padding: 6px 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 14px;
  color: #252424;
}
/* select 本身 */
.row select {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid #d1d5db;          /* 浅灰边框 */
  border-radius: 4px;
  font-size: 14px;
  color: #252424;
  background: #fff;
  appearance: none;
  -webkit-appearance: none;
  color-scheme: light;
  transition: border-color .2s;
}
/* 聚焦时稍微加深一点，保持浅色风格 */
.row select:focus {
  outline: none;
  border-color: #a5a5a5;
}
/* 强制整个 select 组件为浅色模式 */
.row select,
.row select option {
  background-color: #cbc8c8 !important;
  color: #252424 !important;
}
/* 禁用浏览器的颜色方案自动反色 */
.row select {
  color-scheme: light !important;
}
@media (prefers-color-scheme: dark) {
  .row select,
  .row select option {
    background-color: #fff !important;
    color: #252424 !important;
  }
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
