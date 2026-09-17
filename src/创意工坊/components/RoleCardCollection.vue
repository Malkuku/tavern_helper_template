<template>
  <section class="collection-board">
    <header><div><p>{{ eyebrow }}</p><h3>{{ title }}</h3></div><button type="button" @click="adding = true">＋ 新增{{ itemLabel }}</button></header>
    <div class="card-grid">
      <button v-for="(value, key) in modelValue" :key="key" type="button" class="entry-card" @click="open(String(key))">
        <span>{{ icon }}</span><div><strong>{{ key }}</strong><small>{{ summary(value) }}</small></div><b>编辑 ›</b>
      </button>
      <button v-if="!Object.keys(modelValue).length" type="button" class="empty-card" @click="adding = true">尚无{{ itemLabel }}，点击创建</button>
    </div>
  </section>

  <div v-if="activeKey || adding" class="drawer-backdrop" @click.self="close">
    <aside class="drawer" role="dialog" aria-modal="true" :aria-label="`${title}详情`">
      <header><div><p>{{ eyebrow }}</p><h3>{{ adding ? `新增${itemLabel}` : activeKey }}</h3></div><button type="button" aria-label="关闭" @click="close">×</button></header>
      <div v-if="adding" class="drawer-body"><label>{{ itemLabel }}名称<input v-model.trim="newKey" :list="options.length ? listId : undefined" @keydown.enter.prevent="add" /></label><datalist v-if="options.length" :id="listId"><option v-for="option in options" :key="option" :value="option" /></datalist><p v-if="newKey && newKey in modelValue" class="warning">该名称已经存在。</p></div>
      <div v-else-if="activeValue" class="drawer-body">
        <label v-for="field in fields" :key="field.key"><span>{{ field.label }}</span>
          <select v-if="field.options" :value="activeRecord[field.key]" @change="setField(field.key, ($event.target as HTMLSelectElement).value)"><option value="">未指定</option><option v-for="option in field.options" :key="option">{{ option }}</option></select>
          <input v-else-if="field.type === 'number'" :value="activeRecord[field.key]" type="number" @input="setField(field.key, Number(($event.target as HTMLInputElement).value))" />
          <textarea v-else :value="displayValue(activeRecord[field.key])" rows="5" @input="setTextField(field.key, ($event.target as HTMLTextAreaElement).value)" />
        </label>
      </div>
      <footer><button v-if="activeKey" type="button" class="danger" @click="remove">删除{{ itemLabel }}</button><span></span><button type="button" @click="close">完成</button><button v-if="adding" type="button" class="primary" :disabled="!newKey || newKey in modelValue" @click="add">创建</button></footer>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
type Kind = '关系'|'技能'|'术'|'状态'|'物品'|'经验'|'语料';
const props=withDefaults(defineProps<{modelValue:Record<string,any>;kind:Kind;options?:string[]}>(),{options:()=>[]});
const emit=defineEmits<{'update:modelValue':[value:Record<string,any>]}>();
const activeKey=ref(''),adding=ref(false),newKey=ref(''),listId=`role-entry-${Math.random().toString(36).slice(2)}`;
const configs={
  关系:{icon:'◎',fields:[['认知了解','认知了解'],['情感羁绊','情感羁绊'],['利益纽带','利益纽带']],create:()=>({认知了解:'',情感羁绊:'',利益纽带:''})},
  技能:{icon:'✦',fields:[['性相','性相','select'],['技能等级','技能等级','number'],['描述','描述'],['消耗','消耗'],['作用','作用']],create:()=>({性相:'',技能等级:0,描述:'',消耗:'',作用:''})},
  术:{icon:'◇',fields:[['等级','等级','number'],['经验','经验','number']],create:()=>({等级:0,经验:0})},
  状态:{icon:'△',fields:[['描述','描述'],['效果','效果'],['持续时间','持续时间']],create:()=>({描述:'',效果:'',持续时间:''})},
  物品:{icon:'▣',fields:[['类型','类型'],['品质','品质','quality'],['描述','描述'],['作用','作用'],['数量','数量','number'],['耐久','耐久','number']],create:()=>({类型:'',品质:'凡庸',描述:'',作用:'',数量:0,耐久:0})},
  经验:{icon:'◌',fields:[['值','次数','number']],create:()=>({值:0})},
  语料:{icon:'“',fields:[['内容','语句']],create:()=>({内容:[]})},
} as const;
const aspects=['杯','刃','启','铸','蛾','心','冬','灯','秘史','无'],qualities=['凡庸','遗物','珍品','禁忌','神造','遗片','佚存','残卷','蛀损','完帙','未知'];
const config=computed(()=>configs[props.kind]); const title=computed(()=>props.kind==='关系'?'人物关系':props.kind==='术'?'术之等级':props.kind==='状态'?'特殊状态':props.kind==='经验'?'性经验':props.kind==='语料'?'角色语料':props.kind); const eyebrow=computed(()=>({关系:'RELATIONS',技能:'SKILLS',术:'ARTS',状态:'CONDITIONS',物品:'INVENTORY',经验:'EXPERIENCE',语料:'VOICE'}[props.kind])); const itemLabel=computed(()=>props.kind==='关系'?'关系':props.kind==='术'?'性相':props.kind==='状态'?'状态':props.kind==='经验'?'经验':props.kind==='语料'?'语料场景':props.kind); const icon=computed(()=>config.value.icon);
const fields=computed(()=>config.value.fields.map(([key,label,type])=>({key,label,type,options:type==='select'?aspects:type==='quality'?qualities:undefined}))); const activeValue=computed(()=>props.modelValue[activeKey.value]); const activeRecord=computed(()=>Array.isArray(activeValue.value)?{内容:activeValue.value}:activeValue.value);
function summary(value:any){if(Array.isArray(value))return value.slice(0,2).join(' · ')||'暂无内容';if(typeof value!=='object'||value===null)return String(value??'暂无内容');return String(value.描述||value.情感羁绊||value.作用||value.认知了解||value.类型||Object.values(value).find(v=>v!==''&&v!==0)||'暂无内容').slice(0,54)}
function open(key:string){activeKey.value=key} function close(){activeKey.value='';adding.value=false;newKey.value=''}
function add(){if(!newKey.value||newKey.value in props.modelValue)return;emit('update:modelValue',{...props.modelValue,[newKey.value]:config.value.create()});activeKey.value=newKey.value;adding.value=false;newKey.value=''}
function remove(){const next={...props.modelValue};delete next[activeKey.value];emit('update:modelValue',next);close()}
function updateActive(value:any){emit('update:modelValue',{...props.modelValue,[activeKey.value]:value})}
function setField(key:string,value:any){if(Array.isArray(activeValue.value)&&key==='内容')updateActive(value);else updateActive({...activeValue.value,[key]:value})} function displayValue(value:any){return Array.isArray(value)?value.join('\n'):String(value??'')}
function setTextField(key:string,value:string){setField(key,Array.isArray(activeRecord.value[key])?value.split('\n').map(v=>v.trim()).filter(Boolean):value)}
</script>

<style scoped>
.collection-board{display:grid;gap:12px}.collection-board>header{display:flex;align-items:center;justify-content:space-between}.collection-board h3,.collection-board p{margin:0}.collection-board p,.drawer header p{color:#cbb477;font-size:10px;letter-spacing:.18em}.card-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px}.entry-card{display:grid!important;grid-template-columns:auto 1fr auto;gap:12px;align-items:center;min-height:90px;text-align:left!important;background:linear-gradient(145deg,#202426,#141719)!important}.entry-card>span{color:#cbb477;font-size:24px}.entry-card>div{display:grid;gap:5px;min-width:0}.entry-card small{overflow:hidden;color:#a9a293;text-overflow:ellipsis;white-space:nowrap}.entry-card>b{color:#cbb477;font-size:11px}.empty-card{min-height:100px;border-style:dashed!important}.drawer-backdrop{position:fixed;inset:0;z-index:22000;background:#050607b8}.drawer{position:absolute;inset:0 0 0 auto;display:grid;grid-template-rows:auto minmax(0,1fr) auto;width:min(520px,100%);color:#eee7d8;background:#15191b;border-left:1px solid #82704b;box-shadow:-24px 0 70px #000}.drawer>header,.drawer>footer{display:flex;align-items:center;gap:10px;padding:18px 20px;border-bottom:1px solid #393d3f}.drawer>header{justify-content:space-between}.drawer h3,.drawer p{margin:0}.drawer-body{display:grid;align-content:start;gap:16px;overflow:auto;padding:22px}.drawer-body label{display:grid;gap:6px}.drawer-body label>span{color:#cbb477}.drawer>footer{grid-template-columns:auto 1fr auto auto;border-top:1px solid #393d3f;border-bottom:0}.warning{color:#d8a95d}@media(max-width:700px){.drawer{width:100%;border-left:0}.drawer>footer{padding-bottom:calc(18px + env(safe-area-inset-bottom))}}
</style>
