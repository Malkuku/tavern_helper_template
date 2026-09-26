<template>
  <main class="app-screen utility-screen">
    <h1>{{ app }}</h1>
    <template v-if="app === '备忘录'">
      <button class="utility-action" type="button" @click="createNote">新建备忘录</button>
      <div v-for="note in notes" :key="note.id" class="note-card">
        <input v-model="note.title" aria-label="备忘录标题" placeholder="标题" @change="saveNotes" />
        <textarea v-model="note.body" aria-label="备忘录内容" placeholder="写点什么…" @change="saveNotes"></textarea>
        <button type="button" @click="deleteNote(note.id)">删除</button>
      </div>
      <p v-if="!notes.length">还没有备忘录</p>
    </template>
    <template v-else-if="app === '电话'">
      <p>选择联系人</p>
      <button v-for="contact in contacts" :key="contact" class="utility-action" type="button" @click="call(contact)">
        ☎ {{ contact }}
      </button>
      <p v-if="callTarget" role="status">正在呼叫 {{ callTarget }}… 暂时无法接通</p>
    </template>
    <template v-else-if="app === '天气'">
      <svg class="weather-art" viewBox="0 0 180 130" role="img" :aria-label="weather || '天气未设置'">
        <circle cx="64" cy="51" r="25" fill="#ffd45a" />
        <path
          d="M61 91h83a24 24 0 0 0-23-30 31 31 0 0 0-58-2A17 17 0 0 0 61 91Z"
          fill="#e9f3ff"
          stroke="#bad5ed"
          stroke-width="3"
        />
        <path
          v-if="rainy"
          d="m72 102-5 12m28-12-5 12m28-12-5 12"
          stroke="#61b4ec"
          stroke-width="5"
          stroke-linecap="round"
        />
      </svg>
      <h2>{{ weather || '天气未设置' }}</h2>
      <p>{{ place || '地点未设置' }}</p>
    </template>
    <template v-else-if="app === '日历'">
      <div class="calendar-nav">
        <button type="button" @click="changeMonth(-1)">‹</button
        ><strong>{{ calendarYear }}年 {{ calendarMonth + 1 }}月</strong
        ><button type="button" @click="changeMonth(1)">›</button>
      </div>
      <div class="calendar-grid">
        <span v-for="day in weekDays" :key="day">{{ day }}</span
        ><span v-for="blank in firstWeekday" :key="`blank-${blank}`"></span
        ><span v-for="day in daysInMonth" :key="day" :class="{ today: isToday(day) }">{{ day }}</span>
      </div>
      <p>现实日历 · {{ new Date().toLocaleDateString('zh-CN') }}</p>
    </template>
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useMagicGirlStatStore } from '../store/StatStore';

defineProps<{ app: string }>();
const store = useMagicGirlStatStore();
const weather = computed(() => store.statData?.世界?.天气 ?? '');
const place = computed(() => store.statData?.世界?.地点 ?? '');
const rainy = computed(() => /雨|雪|雷/.test(weather.value));
type Note = { id: string; title: string; body: string };
function readNotes(): Note[] {
  try {
    const raw = getVariables({ type: 'script', script_id: getScriptId() })?.magicGirlPhoneNotes;
    return Array.isArray(raw)
      ? raw.filter(
          (item): item is Note =>
            typeof item?.id === 'string' && typeof item?.body === 'string' && typeof item?.title === 'string',
        )
      : [];
  } catch (error) {
    console.error('备忘录读取失败', error);
    return [];
  }
}
const notes = ref<Note[]>(readNotes());
function saveNotes() {
  try {
    updateVariablesWith(variables => ({ ...variables, magicGirlPhoneNotes: notes.value.map(note => ({ ...note })) }), {
      type: 'script',
      script_id: getScriptId(),
    });
  } catch (error) {
    console.error('备忘录保存失败', error);
  }
}
function createNote() {
  notes.value.unshift({ id: crypto.randomUUID(), title: '', body: '' });
  saveNotes();
}
function deleteNote(id: string) {
  notes.value = notes.value.filter(note => note.id !== id);
  saveNotes();
}
const contacts = ['DeepSeek', 'Gemini', 'GPT'];
const callTarget = ref('');
function call(contact: string) {
  callTarget.value = contact;
}
const currentDate = new Date();
const calendarYear = ref(currentDate.getFullYear());
const calendarMonth = ref(currentDate.getMonth());
const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
const firstWeekday = computed(() => new Date(calendarYear.value, calendarMonth.value, 1).getDay());
const daysInMonth = computed(() => new Date(calendarYear.value, calendarMonth.value + 1, 0).getDate());
function changeMonth(offset: number) {
  const date = new Date(calendarYear.value, calendarMonth.value + offset, 1);
  calendarYear.value = date.getFullYear();
  calendarMonth.value = date.getMonth();
}
function isToday(day: number) {
  return (
    calendarYear.value === currentDate.getFullYear() &&
    calendarMonth.value === currentDate.getMonth() &&
    day === currentDate.getDate()
  );
}
</script>
