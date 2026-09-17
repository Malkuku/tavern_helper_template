<template>
  <div v-if="data && Object.keys(data).length > 0" class="special-status-container">
    <button v-if="mode === 'edit'" class="module-add" type="button" @click="addStatus">＋ 新增状态</button>
    <ul class="status-list-styled">
      <template v-for="(status, name) in data" :key="name">
        <li :class="getStatusClass(name)">
          <div class="status-header">
            <strong class="status-title">
              <input
                v-if="mode === 'edit'"
                class="edit-control status-name"
                :value="name"
                @change="renameStatus(name, $event)"
              /><template v-else>{{ name }}</template>
              <span v-if="typeof status !== 'string' && status.不可移除" class="unremovable-tag" title="此状态不可移除"
                >[不可移除]</span
              >
            </strong>
          </div>
          <div class="status-body">
            <!-- 使用 formatText 处理描述文本 -->
            <textarea
              v-if="mode === 'edit'"
              class="status-desc edit-control"
              :value="status.描述"
              @input="updateField(name, '描述', $event.target.value)"
            ></textarea>
            <p v-else class="status-desc">{{ formatText(typeof status === 'string' ? status : status.描述) }}</p>
            <!-- 使用 formatText 处理效果文本 -->
            <label v-if="mode === 'edit'" class="status-effect"
              >效果：<textarea
                class="edit-control"
                :value="status.效果"
                @input="updateField(name, '效果', $event.target.value)"
              ></textarea>
            </label>
            <p v-else-if="typeof status !== 'string' && status.效果" class="status-effect">
              效果：{{ formatText(status.效果) }}
            </p>
            <label v-if="mode === 'edit'" class="status-duration"
              >持续时间<input
                class="edit-control"
                :value="status.持续时间"
                @input="updateField(name, '持续时间', $event.target.value)"
            /></label>
            <button v-if="mode === 'edit'" class="remove-btn" type="button" @click="removeStatus(name)">
              删除状态
            </button>
          </div>
        </li>
      </template>
    </ul>
  </div>
  <div v-else class="no-status">
    无特殊状态 <button v-if="mode === 'edit'" type="button" @click="addStatus">＋ 新增状态</button>
  </div>
</template>

<script setup>
// 接收 data (状态列表) 和 stats (角色属性数据，包含"基础数值"和"生命状态")
const props = defineProps({
  data: { type: Object, default: () => ({}) },
  stats: { type: Object, default: null },
  mode: { type: String, default: 'view' },
});
const emit = defineEmits(['update:data']);
const uniqueName = base => {
  let name = base,
    index = 2;
  while (name in props.data) name = `${base}${index++}`;
  return name;
};
const emitData = data => emit('update:data', data);
const addStatus = () => {
  const name = uniqueName('新状态');
  emitData({ ...props.data, [name]: { 描述: '', 效果: '', 持续时间: '' } });
};
const removeStatus = name => {
  const next = { ...props.data };
  delete next[name];
  emitData(next);
};
const renameStatus = (name, event) => {
  const nextName = event.target.value.trim();
  if (!nextName || (nextName !== name && nextName in props.data)) {
    event.target.value = name;
    return;
  }
  const next = {};
  for (const [key, value] of Object.entries(props.data)) next[key === name ? nextName : key] = value;
  emitData(next);
};
const updateField = (name, field, value) =>
  emitData({ ...props.data, [name]: { ...props.data[name], [field]: value } });

/**
 * 格式化文本，将 ${属性名} 替换为 属性名[数值]
 * 例如: "减少 (${智慧}/10) 点伤害" -> "减少 (智慧[50]/10) 点伤害"
 */
const formatText = text => {
  if (!text || typeof text !== 'string') return text;

  // 正则匹配 ${...}
  return text.replace(/\$\{([^}]+)\}/g, (match, key) => {
    // 如果没有传入 stats，直接返回原文本
    if (!props.stats) return match;

    // 1. 尝试从 [基础数值] 中查找 (力量, 敏捷, 智慧, 魅力)
    if (props.stats['基础数值'] && props.stats['基础数值'][key] !== undefined) {
      return `${key}[${props.stats['基础数值'][key]}]`;
    }

    // 2. 尝试从 [生命状态] 中查找 (生命, 体力, 精神)
    if (props.stats['生命状态'] && props.stats['生命状态'][key]) {
      const val = props.stats['生命状态'][key];
      // 如果是对象且包含'当前'字段 (例如: {当前: 100, 最大值: 100})
      if (typeof val === 'object' && val['当前'] !== undefined) {
        return `${key}[${val['当前']}]`;
      }
      // 防守性处理：如果是直接数值
      if (typeof val === 'number' || typeof val === 'string') {
        return `${key}[${val}]`;
      }
    }

    // 如果未找到对应属性，保留原样
    return match;
  });
};

const getStatusClass = name => {
  const n = name.toString();
  return {
    'status-item': true,
    'status-soul-quality': n.includes('魂质'),
    'status-pact': n.includes('印记') || n.includes('契约'),
    'status-blessing': n.includes('祝福'),
    'status-curse': n.includes('诅咒') || n.includes('侵染'),
    'status-injury': n.includes('伤病'),
  };
};
</script>

<style scoped>
.special-status-container {
  width: 100%;
}
.module-add {
  margin-bottom: 10px;
}
.edit-control {
  box-sizing: border-box;
  width: 100%;
  color: #e0e0e0;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.18);
}
.status-name {
  color: inherit;
  font: inherit;
}
.status-duration {
  display: grid;
  gap: 4px;
  margin-top: 8px;
  color: #aaa;
}
.remove-btn {
  margin-top: 10px;
  color: #ff9b9b;
  background: transparent;
  border: 1px solid #8f4444;
}
.no-status {
  color: var(--c-text-dim, #888);
  font-style: italic;
}

/* --- 特殊状态列表样式 (复用自 UserPanel) --- */
.status-list-styled {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.status-item {
  padding: 10px 15px;
  border-left: 4px solid #555;
  background: rgba(255, 255, 255, 0.03);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}
.status-title {
  display: flex;
  justify-content: space-between;
  font-size: 1.05rem;
  margin-bottom: 5px;
  color: #e0e0e0;
}
.unremovable-tag {
  font-size: 0.7em;
  color: #ff6b6b;
  opacity: 0.8;
  margin-left: 8px;
}
.status-desc {
  margin: 0;
  font-size: 0.95rem;
  color: #a0a0a0;
  line-height: 1.4;
}
.status-effect {
  margin: 5px 0 0 0;
  font-size: 0.9rem;
  color: #ffb74d;
}

/* 动画定义 */
@keyframes streaming-light {
  0% {
    background-position: 100% 0;
  }
  100% {
    background-position: -100% 0;
  }
}

/* 各类状态配色与特效 */
.status-soul-quality {
  color: #0096ff;
  border-left-color: #0096ff;
  background-image: linear-gradient(90deg, transparent, rgba(0, 150, 255, 0.2), transparent);
  background-size: 200% 100%;
  animation: streaming-light 4s ease-in-out infinite;
}
.status-pact {
  color: #ffd700;
  border-left-color: #ffd700;
  background-image: linear-gradient(90deg, transparent, rgba(255, 215, 0, 0.2), transparent);
  background-size: 200% 100%;
  animation: streaming-light 3.5s linear infinite;
}
.status-blessing {
  color: #4caf50;
  border-left-color: #4caf50;
  background-image: linear-gradient(90deg, transparent, rgba(76, 175, 80, 0.2), transparent);
  background-size: 200% 100%;
  animation: streaming-light 6s ease-in-out infinite;
}
.status-curse {
  color: #9c27b0;
  border-left-color: #9c27b0;
  background-image: linear-gradient(90deg, transparent, rgba(156, 39, 176, 0.25), transparent);
  background-size: 200% 100%;
  animation: streaming-light 5s ease-in infinite;
}
.status-injury {
  color: #2e7d32;
  border-left-color: #2e7d32;
  background-image: linear-gradient(90deg, transparent, rgba(46, 125, 50, 0.3), transparent);
  background-size: 200% 100%;
  animation: streaming-light 4.5s linear infinite;
}
</style>
