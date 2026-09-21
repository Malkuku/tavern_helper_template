<template>
  <div v-if="data && Object.keys(data).length > 0" class="skills-container">
    <button v-if="mode === 'edit'" class="module-add" type="button" @click="addSkill">＋ 新增技能</button>
    <div class="skills-grid">
      <template v-for="(skill, name, index) in data" :key="name">
        <div
          class="skill-card"
          :class="[getAspectClass(skill.性相), { active: activeSkill === name }]"
          @click="activate(name)"
        >
          <!-- 头部：名称、等级、性相 -->
          <div class="skill-header">
            <div class="skill-title-group">
              <span class="skill-icon" v-html="getAspectIcon(skill.性相)"></span>
              <input
                v-if="isActive(name)"
                class="skill-name edit-control"
                :value="name"
                @change="renameSkill(name, $event)"
              />
              <strong v-else v-fit-text class="skill-name" :title="String(name)">{{ name }}</strong>
            </div>
            <div class="skill-meta">
              <label class="skill-level-badge"
                >Lv.<input
                  v-if="isActive(name)"
                  class="inline-number"
                  :value="skill.技能等级"
                  type="number"
                  @input="updateField(name, '技能等级', Number($event.target.value))"
                /><template v-else>{{ skill.技能等级 }}</template></label
              >
              <select
                v-if="isActive(name)"
                class="skill-aspect-tag edit-control"
                :value="skill.性相"
                @change="updateField(name, '性相', $event.target.value)"
              >
                <option v-for="aspect in aspects" :key="aspect">{{ aspect }}</option></select
              ><span v-else class="skill-aspect-tag">{{ skill.性相 }}</span>
              <button v-if="mode === 'edit'" class="edit-trigger" type="button" @click.stop="toggleEditing(name)">
                {{ isActive(name) ? '完成' : '编辑' }}
              </button>
            </div>
          </div>

          <!-- 主体：描述 -->
          <div class="skill-body">
            <textarea
              v-if="isActive(name)"
              class="skill-desc edit-control"
              :value="skill.描述"
              @input="updateField(name, '描述', $event.target.value)"
            ></textarea>
            <p v-else class="skill-desc">{{ skill.描述 }}</p>

            <div class="skill-details">
              <!-- 消耗 -->
              <div class="detail-row cost">
                <span class="label">消耗:</span>
                <textarea
                  v-if="isActive(name)"
                  class="value edit-control"
                  :value="skill.消耗"
                  @input="updateField(name, '消耗', $event.target.value)"
                ></textarea
                ><span v-else class="value">{{ formatSkillText(skill.消耗, skill) }}</span>
              </div>

              <!-- 作用 -->
              <div class="detail-row effect">
                <span class="label">作用:</span>
                <textarea
                  v-if="isActive(name)"
                  class="value edit-control"
                  :value="skill.作用"
                  @input="updateField(name, '作用', $event.target.value)"
                ></textarea
                ><span v-else class="value">{{ formatSkillText(skill.作用, skill) }}</span>
              </div>
            </div>
            <button v-if="isActive(name)" class="remove-btn" type="button" @click.stop="removeSkill(name)">
              删除技能
            </button>
            <div v-if="isActive(name)" class="card-actions">
              <button type="button" :disabled="index === 0" @click.stop="moveSkill(name, -1)">上移</button>
              <button type="button" :disabled="index === Object.keys(data).length - 1" @click.stop="moveSkill(name, 1)">
                下移
              </button>
              <button type="button" @click.stop="copySkill(name)">复制</button>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
  <div v-else class="no-skills">
    暂无技能 <button v-if="mode === 'edit'" type="button" @click="addSkill">＋ 新增技能</button>
  </div>
</template>

<script setup>
import { defineProps, ref } from 'vue';
import { vFitText } from '@/尘史使徒/UI/util/fitText';

const props = defineProps({
  data: { type: Object, default: () => ({}) },
  stats: { type: Object, default: null },
  mode: { type: String, default: 'view' },
});
const emit = defineEmits(['update:data']);
const activeSkill = ref('');
const isActive = name => props.mode === 'edit' && activeSkill.value === name;
const activate = name => {
  if (props.mode !== 'edit') return;
  activeSkill.value = name;
};
const toggleEditing = name => {
  activeSkill.value = activeSkill.value === name ? '' : name;
};
const aspects = ['杯', '刃', '启', '铸', '蛾', '心', '冬', '灯', '秘史', '无'];
const uniqueName = base => {
  let name = base,
    index = 2;
  while (name in props.data) name = `${base}${index++}`;
  return name;
};
const emitData = data => emit('update:data', data);
const addSkill = () => {
  const name = uniqueName('新技能');
  emitData({ ...props.data, [name]: { 性相: '', 技能等级: 0, 描述: '', 消耗: '', 作用: '' } });
  activeSkill.value = name;
};
const removeSkill = name => {
  const next = { ...props.data };
  delete next[name];
  emitData(next);
  activeSkill.value = '';
};
const copySkill = name => {
  const nextName = uniqueName(`${name}副本`);
  emitData({ ...props.data, [nextName]: structuredClone(props.data[name]) });
  activeSkill.value = nextName;
};
const moveSkill = (name, delta) => {
  const rows = Object.entries(props.data),
    index = rows.findIndex(([key]) => key === name),
    target = index + delta;
  if (target < 0 || target >= rows.length) return;
  [rows[index], rows[target]] = [rows[target], rows[index]];
  emitData(Object.fromEntries(rows));
};
const renameSkill = (name, event) => {
  const nextName = event.target.value.trim();
  if (!nextName || (nextName !== name && nextName in props.data)) {
    event.target.value = name;
    return;
  }
  const next = {};
  for (const [key, value] of Object.entries(props.data)) next[key === name ? nextName : key] = value;
  emitData(next);
  activeSkill.value = nextName;
};
const updateField = (name, field, value) =>
  emitData({ ...props.data, [name]: { ...props.data[name], [field]: value } });

const formatSkillText = (text, currentSkill) => {
  if (!text || typeof text !== 'string') return text || '无';

  return text.replace(/\$\{([^}]+)\}/g, (match, key) => {
    if (key === '技能等级') return `技能等级[${currentSkill.技能等级}]`;
    if (!props.stats) return match;

    if (props.stats['基础数值'] && props.stats['基础数值'][key] !== undefined) {
      return `${key}[${props.stats['基础数值'][key]}]`;
    }

    if (props.stats['术之等级'] && props.stats['术之等级'][key]) {
      const artData = props.stats['术之等级'][key];
      if (typeof artData === 'object' && artData['等级'] !== undefined) {
        return `${key}[${artData['等级']}]`;
      }
      if (typeof artData === 'number') {
        return `${key}[${artData}]`;
      }
    }

    if (props.stats['生命状态'] && props.stats['生命状态'][key]) {
      const status = props.stats['生命状态'][key];
      if (typeof status === 'object' && status['当前'] !== undefined) {
        return `${key}[${status['当前']}]`;
      }
    }

    return match;
  });
};

// 简洁神秘风格的几何 SVG 图标
const getAspectIcon = aspect => {
  const baseSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="aspect-svg">`;
  const icons = {
    // 刃：向下的利剑
    刃: `${baseSvg}<path d="M12 2v20M9 7l3-4 3 4M8 11h8"/></svg>`,
    // 杯：半月形的圣杯
    杯: `${baseSvg}<path d="M7 3h10M7 3v4c0 3 2.5 5.5 5 5.5s5-2.5 5-5V3M12 12.5V21M8 21h8M12 7v.01"/></svg>`,
    // 铸：几何火焰/锻炉
    铸: `${baseSvg}<path d="M12 22c4.4 0 8-3.6 8-8 0-5-4-9-8-12-4 3-8 7-8 12 0 4.4 3.6 8 8 8z"/><path d="M12 22c-2 0-3.5-1.5-3.5-3.5 0-2.5 2-4.5 3.5-6.5 1.5 2 3.5 4 3.5 6.5 0 2-1.5 3.5-3.5 3.5z"/></svg>`,
    // 蛾：抽象的飞蛾翅膀
    蛾: `${baseSvg}<path d="M12 22v-6M12 16c-4 0-8-2-8-8 0-4 3-6 8-6s8 2 8 6c0 6-4 8-8 8z"/><path d="M12 16c-2 0-4-1-4-4 0-2 1.5-3 4-3s4 1 4 3c0 3-2 4-4 4z"/></svg>`,
    // 心：跳动的几何心脏
    心: `${baseSvg}<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/><path d="M12 15l-3-3 1.5-1.5L12 12l3-3 1.5 1.5-4.5 4.5z"/></svg>`,
    // 灯：菱形中的眼睛/光芒
    灯: `${baseSvg}<path d="M12 2L2 12l10 10 10-10L12 2z"/><circle cx="12" cy="12" r="3"/><path d="M12 9v.01M12 15v.01"/></svg>`,
    // 冬：寂静的六芒星/雪花
    冬: `${baseSvg}<path d="M21 7.5V16.5L13.5 21H10.5L3 16.5V7.5L10.5 3H13.5L21 7.5Z"/><path d="M12 3v18M3 7.5l18 9M3 16.5l18-9"/></svg>`,
    // 启：神秘的钥匙孔
    启: `${baseSvg}<circle cx="12" cy="9" r="4"/><path d="M10.5 12.5L9 21h6l-1.5-8.5"/></svg>`,
  };
  // 默认：四芒星
  return icons[aspect] || `${baseSvg}<path d="M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/></svg>`;
};

const getAspectClass = aspect => {
  const map = {
    刃: 'aspect-edge',
    杯: 'aspect-grail',
    铸: 'aspect-forge',
    蛾: 'aspect-moth',
    心: 'aspect-heart',
    灯: 'aspect-lantern',
    冬: 'aspect-winter',
    启: 'aspect-knock',
  };
  return map[aspect] || 'aspect-generic';
};
</script>

<style scoped>
.skills-container {
  width: 100%;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}
.module-add {
  margin-bottom: 12px;
}
.edit-control {
  box-sizing: border-box;
  width: 100%;
  color: #e8e8e8;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(203, 180, 119, 0.24);
}
textarea.edit-control {
  min-height: 0;
  overflow: hidden;
  resize: vertical;
}
.inline-number {
  width: 48px;
  color: inherit;
  background: transparent;
  border: 0;
}
.remove-btn {
  align-self: flex-start;
  margin-top: 10px;
  color: #ff8c8c;
  background: transparent;
  border: 1px solid #8f4444;
}
.edit-trigger {
  color: #cbb477;
  background: transparent;
  border-color: rgba(203, 180, 119, 0.35);
}
.card-actions {
  display: flex;
  gap: 6px;
  margin-top: 8px;
}

.no-skills {
  color: #888;
  font-style: italic;
  text-align: center;
  padding: 10px;
}

.skills-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

/* 卡片基础样式 - 增强神秘感与暗黑质感 */
.skill-card {
  background: rgba(20, 20, 22, 0.75);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
}

.skill-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.6);
  border-color: rgba(255, 255, 255, 0.2);
}
.skill-card.active {
  grid-column: 1 / -1;
  transform: none;
  border-color: color-mix(in srgb, currentColor 35%, rgba(255, 255, 255, 0.15));
}

/* 头部样式 */
.skill-header {
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex-wrap: wrap;
}

.skill-title-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1 1 180px;
  min-width: 0;
}

/* SVG 图标容器 */
.skill-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  transition: all 0.3s ease;
}

/* 技能名称 - 使用衬线字体增加神秘学典籍感 */
.skill-name {
  font-family: 'Georgia', 'Times New Roman', serif;
  font-size: 1.15rem;
  color: #e8e8e8;
  letter-spacing: 1px;
  font-weight: 500;
  min-width: 0;
  max-width: 100%;
  flex: 1 1 auto;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  --fit-text-min-font-size: 0.75rem;
}

.skill-meta {
  display: flex;
  gap: 6px;
  font-size: 0.75rem;
  flex: 0 1 auto;
  min-width: 0;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.skill-level-badge {
  background: rgba(255, 255, 255, 0.1);
  color: #ddd;
  padding: 2px 6px;
  border-radius: 2px;
  font-family: monospace;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.skill-aspect-tag {
  padding: 2px 6px;
  border-radius: 2px;
  color: #111;
  font-weight: bold;
  background: #aaa;
  letter-spacing: 0.5px;
}

/* 内容区域 */
.skill-body {
  padding: 12px 14px;
  font-size: 0.9rem;
  color: #bbb;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.skill-desc {
  margin: 0;
  line-height: 1.5;
  font-style: italic;
  color: #999;
  margin-bottom: 4px;
}

.skill-details {
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: rgba(0, 0, 0, 0.3);
  padding: 10px;
  border-radius: 2px;
  border-left: 2px solid rgba(255, 255, 255, 0.1);
}

.detail-row {
  display: flex;
  align-items: baseline;
  line-height: 1.4;
}

.detail-row .label {
  flex-shrink: 0;
  width: 42px;
  font-weight: 600;
  margin-right: 6px;
  opacity: 0.7;
  font-size: 0.85rem;
}

/* 消耗与作用文本颜色微调，使其更柔和 */
.detail-row.cost .label {
  color: #e57373;
}
.detail-row.cost .value {
  color: #ffcdd2;
}

.detail-row.effect .label {
  color: #ffd54f;
}
.detail-row.effect .value {
  color: #fff9c4;
}

/* --- 性相配色方案 (包含 SVG 图标颜色与发光效果) --- */

/* 刃 (Edge) */
.aspect-edge {
  border-top: 2px solid #2a2a2a;
}
.aspect-edge .skill-header {
  background: linear-gradient(90deg, rgba(42, 42, 42, 0.15), transparent);
}
.aspect-edge .skill-aspect-tag {
  background: #4a4a4a;
  color: #fff;
}
.aspect-edge .skill-icon {
  color: #4a4a4a;
  filter: drop-shadow(0 0 4px rgba(74, 74, 74, 0.5));
}

/* 杯 (Grail) */
.aspect-grail {
  border-top: 2px solid #d32f2f;
}
.aspect-grail .skill-header {
  background: linear-gradient(90deg, rgba(211, 47, 47, 0.15), transparent);
}
.aspect-grail .skill-aspect-tag {
  background: #e57373;
  color: #fff;
}
.aspect-grail .skill-icon {
  color: #e57373;
  filter: drop-shadow(0 0 4px rgba(229, 115, 115, 0.5));
}

/* 铸 (Forge) */
.aspect-forge {
  border-top: 2px solid #f57c00;
}
.aspect-forge .skill-header {
  background: linear-gradient(90deg, rgba(245, 124, 0, 0.15), transparent);
}
.aspect-forge .skill-aspect-tag {
  background: #ffb74d;
  color: #000;
}
.aspect-forge .skill-icon {
  color: #ffb74d;
  filter: drop-shadow(0 0 4px rgba(255, 183, 77, 0.5));
}

/* 蛾 (Moth) */
.aspect-moth {
  border-top: 2px solid #a1887f;
}
.aspect-moth .skill-header {
  background: linear-gradient(90deg, rgba(161, 136, 127, 0.15), transparent);
}
.aspect-moth .skill-aspect-tag {
  background: #d7ccc8;
  color: #3e2723;
}
.aspect-moth .skill-icon {
  color: #d7ccc8;
  filter: drop-shadow(0 0 4px rgba(215, 204, 200, 0.5));
}

/* 心 (Heart) */
.aspect-heart {
  border-top: 2px solid #c2185b;
}
.aspect-heart .skill-header {
  background: linear-gradient(90deg, rgba(194, 24, 91, 0.15), transparent);
}
.aspect-heart .skill-aspect-tag {
  background: #f06292;
  color: #fff;
}
.aspect-heart .skill-icon {
  color: #f06292;
  filter: drop-shadow(0 0 4px rgba(240, 98, 146, 0.5));
}

/* 灯 (Lantern) */
.aspect-lantern {
  border-top: 2px solid #fbc02d;
}
.aspect-lantern .skill-header {
  background: linear-gradient(90deg, rgba(251, 192, 45, 0.15), transparent);
}
.aspect-lantern .skill-aspect-tag {
  background: #fff59d;
  color: #000;
}
.aspect-lantern .skill-icon {
  color: #fff59d;
  filter: drop-shadow(0 0 4px rgba(255, 245, 157, 0.5));
}

/* 冬 (Winter) */
.aspect-winter {
  border-top: 2px solid #78909c;
}
.aspect-winter .skill-header {
  background: linear-gradient(90deg, rgba(120, 144, 156, 0.15), transparent);
}
.aspect-winter .skill-aspect-tag {
  background: #cfd8dc;
  color: #000;
}
.aspect-winter .skill-icon {
  color: #cfd8dc;
  filter: drop-shadow(0 0 4px rgba(207, 216, 220, 0.5));
}

/* 启 (Knock) */
.aspect-knock {
  border-top: 2px solid #7b1fa2;
}
.aspect-knock .skill-header {
  background: linear-gradient(90deg, rgba(123, 31, 162, 0.15), transparent);
}
.aspect-knock .skill-aspect-tag {
  background: #ce93d8;
  color: #000;
}
.aspect-knock .skill-icon {
  color: #ce93d8;
  filter: drop-shadow(0 0 4px rgba(206, 147, 216, 0.5));
}

/* 默认 (Generic) */
.aspect-generic {
  border-top: 2px solid #777;
}
.aspect-generic .skill-icon {
  color: #ccc;
}
</style>
