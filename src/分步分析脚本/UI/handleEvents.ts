import { useUiStore } from './store';
import { WorldInfoUtil } from '../../Utils/WorldInfoUtil';
import { PromptUtil } from '../../Utils/PromptUtil';
import { MessageUtil } from '../../Utils/MessageUtil';
import { eraAwareSleep } from './utils/era-aware-sleep';

/* 需要 store 的地方再拿 */
const getUiStore = () => (window as any).eraUiStore as ReturnType<typeof useUiStore>;

/* 计算属性也改成函数，调用时再求值 */
const isAsync = computed(() => !!getUiStore()?.isAsync);
const isUpdateEra = computed(() => !!getUiStore()?.isUpdateEra);
const loreRegex = computed(() =>{
  if(!isAsync.value){
    return /<era_analyze>/i;
  }else if(isAsync.value && !isUpdateEra.value){
    return /<era_update>/i;
  }else{
    return /<era_ignore>/i;
  }
});
const isReversed = ref(false);

const waitTime = 10000;

/**
 * 处理接收到的massage_received事件
 */
export const handleMessageReceived = async () => {
  if(getLastMessageId() == 0){ //不处理0层
    return;
  }
  if(!isAsync.value){
    return;
  }
  if(isUpdateEra.value){
    return;
  }
  toastr.info('开始分步分析，等待era事件完成');
  getUiStore().isUpdateEra = true;
  await handleKatEraUpdate();
}

/**
 * 准备开始分析
 */
export const handleKatEraUpdate = async () => {
  if(!isUpdateEra.value){
    return;
  }
  // 给ERA事件让行，错开可能存在的ERA变量更新
  await eraAwareSleep(waitTime);
  /**
   * 构建提示词并请求AI分析
   */
  try{
    toastr.info("正在构建提示词并请求AI分析");
    const user_input = `本次不生成故事，处理Era变量`
    const max_chat_history = 2;
    const is_should_stream = false;
    const promptInjects = [
      {
        id: '1145141919',
        position: 'in_chat',
        depth: 0,
        should_scan: false,
        role: 'user',
        content: user_input,
      },
    ];

    const result = await PromptUtil.sendPrompt(user_input, promptInjects,max_chat_history, is_should_stream);
    console.log("result: ",result);

    //提取并且合并消息到正文
    const variableRegex = /<(variable(?:insert|edit|delete))>\s*(?=[\s\S]*?\S[\s\S]*?<\/\1>)((?:(?!<(?:era_data|variable(?:think|insert|edit|delete))>|<\/\1>)[\s\S])*?)\s*<\/\1>/gi
    // 只保留标签及其内部内容（标签本身也保留）
    let content = result
      .match(variableRegex)
      ?.join('') ?? '';
    const optionsRegex = /<options>((?:(?!<options>)[\s\S])*?)<\/options>(?![\s\S]*<options>[\s\S]*<\/options>)/gi
    content += result
        .match(optionsRegex)
        ?.join('') ?? '';
    await MessageUtil.mergeContentToMessage(getLastMessageId(), content);

    toastr.success("分步分析处理完成");

  }catch (e){
    toastr.error("分步分析处理失败");
    console.error("分步分析处理失败: ",e);
  }finally {
    getUiStore().isUpdateEra = false;
  }
}

/**
 * 处理世界书内容的排除
 */
export const handleLoresFilter = async (lores:any) =>{
  console.log("WORLDINFO_ENTRIES_LOADED: ",lores);
  await WorldInfoUtil.removeLoresByRegex(lores, loreRegex.value, isReversed.value);
}

