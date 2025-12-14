<template>
  <div>
    <!-- 页面导航 -->
    <div class="page-tabs">
      <button class="tab-button" :class="{ active: currentPage === 'model' }" @click="currentPage = 'model'">
        模型配置
      </button>
      <button class="tab-button" :class="{ active: currentPage === 'worldinfo' }" @click="currentPage = 'worldinfo'">
        世界书与正则配置
      </button>
    </div>

    <!-- 第一页：模型配置 -->
    <div v-show="currentPage === 'model'">
      <h3 class="title">ERA 分步分析设置</h3>
      <!-- 分步分析开关 -->
      <label class="switch-row">
        <span>分步分析模式</span>
        <input
          type="checkbox"
          :checked="asyncAnalyzeStore.isAsync"
          @change="
            () => {
              asyncAnalyzeStore.isAsync = !asyncAnalyzeStore.isAsync;
            }
          "
        />
        <span class="switch"></span>
      </label>

      <span class="tip-card"> ⚠️ 目前流式生成的分析的 ejs 替换有 bug，分步模式请不要打开流式 </span>

      <!-- 模型来源 -->
      <div class="row">
        <span>模型来源</span>
        <select v-model="modelSource" @change="onModelSourceChange">
          <option value="sample">当前模型</option>
          <option value="profile">预设模型</option>
          <option value="external">额外模型</option>
        </select>
      </div>
      <!--      <div v-if="modelSource === 'profile'" class="row">-->
      <!--        <span>预设模型</span>-->
      <!--        因为ERA和提示词模板的替换问题，目前不可用😑-->
      <!--      </div>-->

      <!--       TODO 因为ERA的替换问题，目前不可用  预设模型选择（仅 profile 时显示） -->
      <div v-if="modelSource === 'profile'" class="row">
        <span>预设模型</span>
        <select v-model="profileSetting">
          <option v-for="p in profileList" :key="p" :value="p" :title="p">
            {{ shortName(p) }}
          </option>
        </select>
      </div>

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
            <select v-model="settings.modelName" style="flex: 1">
              <option v-for="m in modelOptions" :key="m" :value="m" :title="m">{{ shortName(m) }}</option>
              <!-- 允许手动输入，兜底 -->
              <option
                v-if="settings.modelName && !modelOptions.includes(settings.modelName)"
                :value="settings.modelName"
              >
                {{ settings.modelName }}
              </option>
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

      <div class="row" style="justify-content: flex-start; gap: 12px">
        <button class="btn small" @click="testConnect">测试连接</button>
        <button v-if="modelSource === 'external'" class="btn small" @click="getRemoteModels">获取模型列表</button>
      </div>
    </div>

    <!-- 第二页：世界书与正则配置 -->
    <div v-show="currentPage === 'worldinfo'">
      <h3 class="title">世界书与正则配置</h3>
      <WorldInfoAndRegexConfig />
    </div>

    <br />

    <!-- 底部按钮 -->
    <div v-if="currentPage === 'model'" class="footer">
      <button class="btn" @click="close">取消</button>
      <button class="btn danger" @click="handleClear">清空</button>
      <button class="btn primary" @click="handleSave">保存</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch, ref } from 'vue';
import { useUiStore } from '../../stores/UIStore';
import * as toastr from 'toastr';
import { useAsyncAnalyzeStore } from '../../stores/AsyncAnalyzeStore';
import { eraLogger } from '../../utils/EraHelperLogger';
import WorldInfoAndRegexConfig from '../components/WorldInfoAndRegexConfig.vue';

const uiStore = useUiStore();
const asyncAnalyzeStore = useAsyncAnalyzeStore();

// 页面控制
const currentPage = ref<'model' | 'worldinfo'>('model');

/* 预设名称缩略 */
const shortName = (full: string, max = 36) => (full.length > max ? full.slice(0, max - 1) + '…' : full);

/* 本地草稿 */
const modelSource = ref<'sample' | 'external' | 'profile'>('sample');
const profileSetting = ref(''); // 当前选中的预设
const profileList = ref<string[]>([]); // 预设名称列表
const settings = reactive({
  baseURL: '',
  apiKey: '',
  modelName: '',
  temperature: 0.7,
  frequencyPenalty: 0,
  presencePenalty: 0,
  maxTokens: 20000,
});

const onModelSourceChange = async () => {
  if (modelSource.value === 'profile') {
    await refreshProfileList();
  }
};

/* 刷新预设列表 */
const refreshProfileList = async () => {
  try {
    const result = await (window as any).SillyTavern.executeSlashCommands('/profile-list');
    profileList.value = JSON.parse(result.pipe);
    eraLogger.log('预设名称列表:', profileList.value);
  } catch (e) {
    toastr.error('获取预设列表失败');
    eraLogger.error('刷新预设列表失败', e);
    profileList.value = [];
  }
};

/* 打开弹窗时同步 store 数据 */
watch(
  () => uiStore.showUI,
  async v => {
    if (!v) return;
    modelSource.value = asyncAnalyzeStore.modelSource as any;
    profileSetting.value = asyncAnalyzeStore.profileSetting || '';
    Object.assign(settings, asyncAnalyzeStore.customModelSettings);
    await refreshProfileList();
  },
  { immediate: true },
);

/* 保存 */
const handleSave = async () => {
  // 如果在模型配置页面，则保存模型设置
  if (currentPage.value === 'model') {
    asyncAnalyzeStore.modelSource = modelSource.value;
    asyncAnalyzeStore.profileSetting = profileSetting.value;
    asyncAnalyzeStore.customModelSettings = { ...settings } as any;
    await asyncAnalyzeStore.saveModelSettings();
    toastr.success('设置已保存');
  }
  // 如果在世界书与正则配置页面，则由子组件负责保存
};

/* 清空（恢复默认） */
const handleClear = async () => {
  // 如果在模型配置页面，则清空模型设置
  if (currentPage.value === 'model') {
    await asyncAnalyzeStore.clearModelSettings();
    modelSource.value = asyncAnalyzeStore.modelSource as any;
    profileSetting.value = asyncAnalyzeStore.profileSetting || '';
    Object.assign(settings, asyncAnalyzeStore.customModelSettings);
    toastr.info('已清空设置');
  }
  // 如果在世界书与正则配置页面，则由子组件负责清空
};

const close = () => {
  uiStore.showUI = false;
};

/*测试连接：发一条最轻量的请求 */
const testConnect = async () => {
  //先保存配置
  await handleSave();

  /* 1. 内置模型（sample / profile）*/
  if (modelSource.value === 'sample' || modelSource.value === 'profile') {
    try {
      let tempProfileSetting;
      if (modelSource.value === 'profile') {
        tempProfileSetting = ((await (window as any).SillyTavern.executeSlashCommands('/profile')) as any).pipe;
        eraLogger.log('当前预设名称:', tempProfileSetting);
        await (window as any).SillyTavern.executeSlashCommands(`/profile ${profileSetting.value}`);
      }
      // 用 ST 自带指令检查当前模型是否在线
      const res = await (window as any).SillyTavern.executeSlashCommands('/model');
      if (!res.error) {
        toastr.success('模型连接正常 ✓');
        if (modelSource.value === 'profile') {
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
  if (!settings.baseURL || !settings.apiKey) {
    toastr.warning('请先填写接口地址与 API 密钥');
    return;
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000); // 8 秒超时

  try {
    const res = await fetch(`${settings.baseURL.replace(/\/$/, '')}/models`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${settings.apiKey.trim()}`,
      },
      signal: ctrl.signal,
    });
    clearTimeout(timer);

    if (res.ok) {
      toastr.success('连接成功，密钥可用 ✓');
    } else {
      const text = await res.text().catch(() => res.statusText);
      toastr.error(`连接失败：${res.status} ${text}`);
    }
  } catch (e: any) {
    clearTimeout(timer);
    toastr.error(`网络错误：${e.message || '无法到达服务器'}`);
  }
};

/* 远端模型列表 */
const modelOptions = ref<string[]>([]);

/* 获取远端模型列表 */
const getRemoteModels = async () => {
  if (!settings.baseURL || !settings.apiKey) {
    toastr.warning('请先填写接口地址与 API 密钥');
    return;
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(`${settings.baseURL.replace(/\/$/, '')}/models`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${settings.apiKey.trim()}` },
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      toastr.error(`获取失败：${res.status} ${await res.text().catch(() => res.statusText)}`);
    }
    const body = await res.json();
    modelOptions.value = (body.data || []).map((m: any) => m.id).sort();
    toastr.success(`共拉取 ${modelOptions.value.length} 个模型`);
  } finally {
    clearTimeout(timer);
  }
};
</script>

<style scoped lang="scss">
/************ 通用 ************/
* {
  box-sizing: border-box;
}

/* 确保标题有足够的上边距 */
.title {
  margin: 8px 0 16px; /* 增加上边距 */
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  padding-top: 4px; /* 额外内边距 */
}

/************ 开关 ************/
.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
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
  background: #d1d5db;
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
  background: #6366f1;
}
.switch-row input:checked + .switch::after {
  left: 20px;
}

/************ 提示卡片 ************/
.tip-card {
  display: block;
  background: #fffbeb;
  border: 1px solid #fde68a;
  color: #b45309;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
  margin-bottom: 16px;
}

/************ 行 ************/
.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.row span:first-child {
  width: 130px;
  font-size: 14px;
  color: #4b5563;
  flex-shrink: 0;
}
.row input,
.row select {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  color: #111827;
  background: #dcd8d8;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.03);
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}
.row input:focus,
.row select:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow:
    0 0 0 3px rgba(99, 102, 241, 0.15),
    inset 0 1px 2px rgba(0, 0, 0, 0.03);
}

/* 强制浅色 select */
.row select,
.row select option {
  background: #dcd8d8 !important;
  color: #111827 !important;
}
/* 为深色模式提供回退 */
@media (prefers-color-scheme: dark) {
  .row select,
  .row select option {
    background: #dcd8d8 !important;
    color: #111827 !important;
  }

  /* 确保在深色模式下卡片内容保持浅色 */
  .content {
    background: #dcd8d8;
    color: #111827;
  }
}

/************ 按钮 ************/
.btn {
  padding: 6px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition:
    background 0.2s,
    color 0.2s,
    transform 0.15s;
  background: #f3f4f6;
  color: #111827;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}
.btn:hover {
  background: #e5e7eb;
}
.btn.small {
  padding: 4px 12px;
  font-size: 13px;
}
.btn.primary {
  background: #6366f1;
  color: #fff;
}
.btn.primary:hover {
  background: #4f46e5;
}
.btn.danger {
  background: #ef4444;
  color: #fff;
}
.btn.danger:hover {
  background: #dc2626;
}

/************ 底部操作区 ************/
.footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}

/************ 列表样式 ************/
.list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #f9fafb;
  border-radius: 6px;
  margin-bottom: 8px;
  border: 1px solid #e5e7eb;
}
.list-item:last-child {
  margin-bottom: 0;
}

/************ 标签样式 ************/
.tag {
  display: inline-block;
  padding: 2px 8px;
  background: #e0e7ff;
  color: #3730a3;
  border-radius: 4px;
  font-size: 12px;
  margin-right: 6px;
  margin-bottom: 4px;
}

/************ 消息提示 ************/
.message {
  padding: 8px 12px;
  border-radius: 6px;
  margin-bottom: 12px;
  font-size: 13px;
}
.message.success {
  background: #d1fae5;
  color: #065f46;
  border: 1px solid #a7f3d0;
}
.message.error {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fecaca;
}
.message.warning {
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fde68a;
}
.message.info {
  background: #e0f2fe;
  color: #1e40af;
  border: 1px solid #bae6fd;
}

/************ 表单组 ************/
.form-group {
  margin-bottom: 16px;
}
.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  color: #374151;
  font-weight: 500;
}

/************ 分隔线 ************/
.divider {
  height: 1px;
  background: #e5e7eb;
  margin: 16px 0;
  border: none;
}

/************ 卡片容器 ************/
.card-container {
  background: #dcd8d8;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

/************ 加载状态 ************/
.loading {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid #f3f4f6;
  border-top: 2px solid #6366f1;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/************ 工具提示 ************/
.tooltip {
  position: relative;
  display: inline-block;
  cursor: help;
  margin-left: 4px;
}
.tooltip::after {
  content: attr(data-tooltip);
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: #111827;
  color: white;
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.2s;
}
.tooltip:hover::after {
  opacity: 1;
  visibility: visible;
}

/************ 页面标签 ************/
.page-tabs {
  display: flex;
  margin-bottom: 20px;
  border-bottom: 1px solid #e5e7eb;
}

.tab-button {
  padding: 10px 20px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 14px;
  color: #6b7280;
  border-bottom: 2px solid transparent;

  &.active {
    color: #6366f1;
    border-bottom: 2px solid #6366f1;
  }

  &:hover:not(.active) {
    color: #111827;
  }
}
</style>
