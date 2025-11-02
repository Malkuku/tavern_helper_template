<template>
  <div class="character-a" :class="theme">
    <div class="info-card">
      <!-- 通用头部 + 分页 -->
      <div class="card-header">
        <h2 class="card-title">卡特琳娜·索菲娅</h2>
        <div class="page-tabs">
          <button
            v-for="p in [1,2,3]"
            :key="p"
            :class="['tab-btn', {active: page===p}]"
            @click="page=p"
          >{{ tabTitle(p) }}</button>
        </div>
      </div>

      <!-- 加载 -->
      <div v-if="!statData" class="loading-state">
        <div class="loading-spinner"></div>
        <p>正在加载角色信息...</p>
      </div>

      <!-- 内容区 -->
      <div v-else class="content-wrapper">
        <!-- ===== 第1页：特殊状态 + 想法 ===== -->
        <div v-show="page===1">
          <section class="section">
            <h3 class="section-title">特殊状态</h3>

            <!-- 偏执度 -->
            <div class="status-card">
              <div class="status-label"><span class="icon">🧠</span><span>偏执度</span></div>
              <div class="status-value">{{ paranoia }}</div>
              <div class="progress-bar"><div class="progress-fill" :style="{width:paranoiaPercent}"></div></div>
              <div class="progress-label">{{ paranoiaPercent }}</div>
              <div v-if="paranoiaReason" class="status-reason">{{ paranoiaReason }}</div>
            </div>

            <!-- 身体开发等级（圆形进度条） -->
            <h4 class="sub-title">身体开发等级</h4>
            <div class="dev-grid">
              <div v-for="(val,key) in devLevel" :key="key" class="dev-item">
                <div class="circle-progress">
                  <svg viewBox="0 0 36 36"><path class="c-bg" d="M18 2.084 a 15.916 15.916 0 0 1 0 31.832 a 15.916 15.916 0 0 1 0 -31.832"/><path class="c-fg" :stroke-dasharray="devCircleDash(key)" d="M18 2.084 a 15.916 15.916 0 0 1 0 31.832 a 15.916 15.916 0 0 1 0 -31.832"/></svg>
                  <div class="c-text">{{ val }}</div>
                </div>
                <div class="dev-name">{{ key }}</div>
              </div>
            </div>
          </section>

          <!-- 当前想法（仅本页） -->
          <section class="section">
            <h3 class="section-title">当前想法</h3>
            <div class="thought-box"><p class="thought-content">{{ currentThought||'...' }}</p></div>
          </section>
        </div>

        <!-- ===== 第2页：服装（单列） ===== -->
        <div v-show="page===2">
          <section class="section">
            <h3 class="section-title">当前服装</h3>
            <div class="single-col">
              <div v-for="(item,key) in clothing" :key="key" class="info-row">
                <span class="info-key">{{ key }}</span>
                <span class="info-val">{{ item||'无' }}</span>
              </div>
            </div>
          </section>
        </div>

        <!-- ===== 第3页：身体状态（单列） ===== -->
        <div v-show="page===3">
          <section class="section">
            <h3 class="section-title">身体状态</h3>
            <div class="single-col">
              <div v-for="(st,key) in bodyStatus" :key="key" class="info-row">
                <span class="info-key">{{ key }}</span>
                <span class="info-val">{{ st||'正常' }}</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useStatStore } from '../store/StatStore'

const statStore = useStatStore()
const page = ref(1)
const theme = computed(()=> (statStore.stat_data?.theme==='dark' ? 'dark' : 'light'))
const statData = computed(()=> statStore.stat_data)

/* ---- 数据 ---- */
const paranoia = computed(()=> statData.value?.角色?.卡特琳娜?.特殊状态?.偏执度 ?? 0)
const paranoiaReason = computed(()=> statData.value?.角色?.卡特琳娜?.特殊状态?.偏执度变化原因)
const currentThought = computed(()=> statData.value?.角色?.卡特琳娜?.当前想法)
const clothing = computed(()=> statData.value?.角色?.卡特琳娜?.服装 || {})
const bodyStatus = computed(()=> statData.value?.角色?.卡特琳娜?.身体状态 || {})

const paranoiaStages = computed(()=> statData.value?.偏执度阶段?.卡特琳娜 || {})
const devStages = computed(()=> statData.value?.开发度阶段 || {})

/* ---- 计算 ---- */
const paranoiaPercent = computed(()=>{
  const max = Math.max(...Object.values(paranoiaStages.value))
  return `${Math.min(100, Math.round((paranoia.value / max) * 100))}%`
})
/* ===== 身体开发等级 & 经验值 ===== */
const devLevel  = computed(()=> statData.value?.身体开发等级?.卡特琳娜 || {})   // 等级
const devExp    = computed(()=> statData.value?.角色?.卡特琳娜?.特殊状态?.开发经验值 || {}) // 经验值

/* 圆形进度条 dash 数组 */
function devCircleDash(part: string) {
  const lv  = devLevel.value[part] || 0          // 当前等级
  const exp = devExp.value[part]   || 0          // 已有经验值
  const need = (lv + 1) * 4                      // 本级总需求
  const percent = Math.min(100, (exp / need) * 100)
  return `${percent}, 100`
}

function tabTitle(p:number){ return p===1 ? '特殊状态' : p===2 ? '服装' : '身体状态' }
</script>

<style lang="scss" scoped>
.character-a{
  --bg-primary:#fff; --bg-secondary:#f5f7fa; --bg-tertiary:#fafbfc;
  --text-primary:#1a1a1a; --text-secondary:#666; --text-tertiary:#999;
  --border-color:#e4e7ed; --shadow:0 2px 12px rgba(0,0,0,.05);
  --accent:#e91e63; --radius:12px; --transition:all .3s cubic-bezier(.4,0,.2,1);
}
.character-a.dark{
  --bg-primary:#141414; --bg-secondary:#1f1f1f; --bg-tertiary:#262626;
  --text-primary:#fff; --text-secondary:#a6a6a6; --text-tertiary:#737373;
  --border-color:#303030; --shadow:0 2px 12px rgba(0,0,0,.3);
  --accent:#ff4081;
}
.character-a{padding:24px; min-height:100%; background:var(--bg-secondary); transition:var(--transition);}
.info-card{background:var(--bg-primary); border-radius:var(--radius); box-shadow:var(--shadow); overflow:hidden; max-width:900px; margin:0 auto;}
.card-header{padding:24px; background:linear-gradient(135deg,var(--accent) 0%,#c2185b 100%); color:white; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;}
.card-title{margin:0; font-size:24px; font-weight:600; letter-spacing:-.5px;}
.page-tabs{display:flex; gap:8px;}
.tab-btn{border:none; background:rgba(255,255,255,.2); color:white; padding:6px 14px; border-radius:6px; cursor:pointer; transition:var(--transition);}
.tab-btn.active{background:white; color:var(--accent);}
.content-wrapper{padding:24px;}
.section{margin-bottom:32px;}
.section-title{font-size:18px; font-weight:600; color:var(--text-primary); margin:0 0 16px 0; padding-bottom:8px; border-bottom:2px solid var(--border-color);}
.sub-title{font-size:16px; font-weight:600; color:var(--text-secondary); margin:16px 0 12px;}

/* 特殊状态 */
.status-card{background:var(--bg-tertiary); border-radius:8px; padding:20px; border:1px solid var(--border-color); transition:var(--transition);}
.status-card:hover{transform:translateY(-2px); box-shadow:var(--shadow); border-color:var(--accent);}
.status-label{display:flex; align-items:center; gap:8px; font-size:14px; color:var(--text-secondary); margin-bottom:12px; font-weight:500;}
.icon{font-size:16px;}
.status-value{font-size:32px; font-weight:700; color:var(--accent); margin-bottom:8px;}
.progress-bar{width:80%; height:8px; background:var(--border-color); border-radius:4px; overflow:hidden; margin:8px auto 4px;}
.progress-fill{height:100%; background:linear-gradient(90deg,var(--accent),#ff6090); transition:width .4s ease;}
.progress-label{font-size:12px; color:var(--text-tertiary); text-align:center; margin-top:4px;}
.status-reason{font-size:12px; color:var(--text-tertiary); line-height:1.4; margin-top:6px;}

/* 圆形进度条 - 身体开发等级 */
.dev-grid{display:grid; grid-template-columns:repeat(auto-fill,minmax(90px,1fr)); gap:16px;}
.dev-item{text-align:center;}
.circle-progress{position:relative; width:72px; height:72px; margin:0 auto 8px;}
.circle-progress svg{width:100%; height:100%; transform:rotate(-90deg);}
.c-bg{fill:none; stroke:var(--border-color); stroke-width:3.2;}
.c-fg{fill:none; stroke:var(--accent); stroke-width:3.2; stroke-linecap:round; transition:stroke-dasharray .4s ease;}
.c-text{position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:700; color:var(--text-primary);}
.dev-name{font-size:13px; color:var(--text-secondary);}

/* 单列服装 / 身体状态 */
.single-col {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.info-row{display:flex; justify-content:space-between; align-items:center; background:var(--bg-tertiary); border:1px solid var(--border-color); border-radius:6px; padding:12px 16px; font-size:15px;}
.info-key{color:var(--text-secondary);}
.info-val{font-weight:500; color:var(--text-primary);}

/* 想法 */
.thought-box{background:var(--bg-tertiary); border-radius:8px; padding:20px; border:1px solid var(--border-color); position:relative;}
.thought-box::before{content:'"'; position:absolute; top:-10px; left:16px; font-size:48px; color:var(--accent); opacity:.3;}
.thought-content{margin:0; font-size:16px; line-height:1.6; color:var(--text-secondary); font-style:italic; padding-left:20px;}

.loading-state,.empty-state{padding:48px; text-align:center; color:var(--text-secondary);}
.loading-spinner{width:40px; height:40px; border:3px solid var(--border-color); border-top-color:var(--accent); border-radius:50%; margin:0 auto 16px; animation:spin 1s linear infinite;}
@keyframes spin{to{transform:rotate(360deg);}}
.empty-icon{font-size:48px; margin-bottom:16px; opacity:.5;}

@media (max-width:768px){
  .character-a{padding:16px;}
  .card-header{padding:20px;}
  .card-title{font-size:20px;}
  .content-wrapper{padding:20px;}
  .dev-grid{grid-template-columns:repeat(3,1fr);}
}
.character-a.dark ::-webkit-scrollbar{width:8px;}
.character-a.dark ::-webkit-scrollbar-track{background:var(--bg-secondary);}
.character-a.dark ::-webkit-scrollbar-thumb{background:var(--border-color); border-radius:4px;}
.character-a.dark ::-webkit-scrollbar-thumb:hover{background:var(--text-tertiary);}
</style>
