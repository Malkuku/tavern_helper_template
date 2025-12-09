import { WorldInfoUtil } from '../../Utils/WorldInfoUtil';
import { PromptUtil } from '../../Utils/PromptUtil';
import { MessageUtil } from '../../Utils/MessageUtil';
import { eraAwareSleep } from '../utils/era-aware-sleep';
import { ERAEvents } from '../../Constants/ERAEvent';
import { useAsyncAnalyzeStore } from '../stores/AsyncAnalyzeStore';
import { eraLogger } from '../utils/EraHelperLogger';

const getAsyncAnalyzeStore = () => (window as any).ApiConfigStore as ReturnType<typeof useAsyncAnalyzeStore>;

const isAsync = computed(() => !!getAsyncAnalyzeStore()?.isAsync);
const isUpdateEra = computed(() => !!getAsyncAnalyzeStore()?.isUpdateEra);
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
const modelSource = computed(() => getAsyncAnalyzeStore()?.modelSource);
const customModelSettings = computed(() => getAsyncAnalyzeStore()?.customModelSettings);
const profileSetting = computed(() => getAsyncAnalyzeStore()?.profileSetting);

const waitTime = 8000;

/**
 * 重发变量更新
 */
export const reSendEraUpdate = async () => {
  if(getLastMessageId() == 0){ //不处理0层
    toastr.warning('请不要重算0层变量','你在干嘛😡');
    return;
  }
  toastr.info('开始变量重算，等待era事件完成');
  const isAsyncTemp = getAsyncAnalyzeStore().isAsync;
  try{
    //先将era回滚到上次更新
    toastr.info('正在将era回滚到上次更新');
    await eventEmit('era:forceSync', { mode: 'rollbackTo', message_id: getLastMessageId() - 1 });

    getAsyncAnalyzeStore().isUpdateEra = true;
    if(!isAsync.value){
      toastr.info('临时开启分步分析模式');
      getAsyncAnalyzeStore().isAsync = true;
    }
    await handleKatEraUpdate();
  }catch (e) {
    toastr.error('分步分析处理失败');
    eraLogger.error('分步分析处理失败: ',e);
    await eventEmit('era:forceSync');
  }finally {
    getAsyncAnalyzeStore().isAsync = isAsyncTemp;
    getAsyncAnalyzeStore().isUpdateEra = false;
  }
}

/**
 * 处理接收到的massage_received事件
 */
export const handleMessageReceived = async (message_id:number) => {
  if(getLastMessageId() == 0 || message_id == 0){ //不处理0层
    return;
  }
  if(!isAsync.value){
    return;
  }
  if(isUpdateEra.value){
    toastr.warning('已有正在处理的分步分析');
    return;
  }
  if(MessageUtil.getMessageById(message_id).length < 200){
    toastr.error('空回了喵~请重roll喵~');
    throw new Error("空回了喵~请重roll喵~");
  }
  toastr.info('开始分步分析，等待era事件完成');
  getAsyncAnalyzeStore().isUpdateEra = true;

  await handleKatEraUpdate();
  /**
   * TODO有时候ejs和era不会把宏正确替换
   * 目前：额外非流ok，额外解析ok
   *  同源非流ok,同源解析ok，同源流
   *  流式：全寄 ejs有问题
   *  预设：全寄
   */
}

/**
 * 合并消息内容
 */
async function handleMessageMerge(result: string) {
  if(result.length < 200){
    toastr.error('接收的分析结果为空，哈！');
    throw new Error("接收的分析结果为空，哈！");
  }
  const variableRegex = /<(variable(?:insert|edit|delete))>\s*(?=[\s\S]*?\S[\s\S]*?<\/\1>)((?:(?!<(?:era_data|variable(?:think|insert|edit|delete))>|<\/\1>)[\s\S])*?)\s*<\/\1>/gi
  const optionsRegex = /<options>((?:(?!<options>)[\s\S])*?)<\/options>(?![\s\S]*<options>[\s\S]*<\/options>)/gi
  //先去除掉正文的旧记录
  if(result.match(variableRegex)){
    await MessageUtil.removeContentByRegex(getLastMessageId(), [variableRegex]);
  }
  if(result.match(optionsRegex)){
    await MessageUtil.removeContentByRegex(getLastMessageId(), [optionsRegex]);
  }

  //提取并且合并消息到正文
   // 只保留标签及其内部内容
  let content = result
    .match(variableRegex)
    ?.join('') ?? '';
   content += result
    .match(optionsRegex)
    ?.join('') ?? '';
  await MessageUtil.mergeContentToMessage(getLastMessageId(), content);
}

/**
 * 准备开始分析
 */
export const handleKatEraUpdate = async () => {
  if(!isUpdateEra.value){
    toastr.warning('[isUpdateEra]标识异常');
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
    eraLogger.log("modelSource: ", modelSource.value)
    const result = modelSource.value == 'sample' ?
      await PromptUtil.sendPrompt(user_input, promptInjects,max_chat_history, is_should_stream,null,null) :
      modelSource.value == 'profile' ?
        await PromptUtil.sendPrompt(user_input, promptInjects,max_chat_history, is_should_stream,null,profileSetting.value) :
        await PromptUtil.sendPrompt(user_input, promptInjects,max_chat_history, is_should_stream,customModelSettings.value,null);

    eraLogger.log("result: ",result);

    await handleMessageMerge(result);

    toastr.success("分步分析处理完成");

  }catch (e){
    toastr.error("分步分析处理失败");
    eraLogger.error("分步分析处理失败: ",e);
  }finally {
    await eventEmit(ERAEvents.FORCE_SYNC);
    getAsyncAnalyzeStore().isUpdateEra = false;
  }
}

/**
 * 处理世界书内容的排除
 */
export const handleLoresFilter = async (lores:any) =>{
  eraLogger.log("WORLDINFO_ENTRIES_LOADED: ",lores);
  await WorldInfoUtil.removeLoresByRegex(lores, loreRegex.value, isReversed.value);
}

