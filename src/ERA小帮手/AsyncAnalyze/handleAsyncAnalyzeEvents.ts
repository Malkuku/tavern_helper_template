import { WorldInfoUtil } from '../../Utils/WorldInfoUtil';
import { PromptUtil } from '../../Utils/PromptUtil';
import { MessageUtil } from '../../Utils/MessageUtil';
import { eraAwareSleep } from '../utils/era-aware-sleep';
import { ERAEvents } from '../../Constants/ERAEvent';
import { useAsyncAnalyzeStore } from '../stores/AsyncAnalyzeStore';
import { eraLogger } from '../utils/EraHelperLogger';
import { EraDataHandler } from '../EraDataHandler/EraDataHandler';
import { useEraDataStore } from '../stores/EraDataStore';
import { useEraEditStore } from '../stores/EraEditStore';

const getAsyncAnalyzeStore = () => (window as any).AsyncAnalyzeStore as ReturnType<typeof useAsyncAnalyzeStore>;
const getEraDataStore = () => (window as any).EraDataStore as ReturnType<typeof useEraDataStore>;
const getEraEditStore = () => (window as any).EraEditStore as ReturnType<typeof useEraEditStore>;

const isAsync = computed(() => !!getAsyncAnalyzeStore()?.isAsync);
const isUpdateEra = computed(() => !!getAsyncAnalyzeStore()?.isUpdateEra);
const loreList = computed(() =>{
  if(!isAsync.value){
    return getAsyncAnalyzeStore()?.analyzeRores;
  }else if(isAsync.value && !isUpdateEra.value){
    return [...(getAsyncAnalyzeStore()?.updateRores || []), ...(getAsyncAnalyzeStore()?.analyzeRores || [])];
  }else{
    return getAsyncAnalyzeStore()?.ignoreRores;
  }
});
const regexStrList = computed(() =>{
  return getAsyncAnalyzeStore()?.regexList;
})

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
 * 处理ERA变量更新
 */
export const handleEraRulesOnMessageReceived = async (message_id:number) => {
  if(isAsync.value){
    eraLogger.info('处于分步分析模式,跳过接收消息时的处理');
    return;
  }
  const chat_message = getChatMessages(message_id)[0];
  const msg = chat_message.message;
  const result = await handleEraRules(msg);
  await setChatMessages([{ message_id, message: result }]);
}

/**
 * 处理ERA变量更新
 * @param result
 */
async function handleEraRules(result: string) {
  // 从消息中提取出edit内容，应用EraDataRule处理数据
  const regexEdit = /<VariableEdit>((?:(?!<VariableEdit>)[\s\S])*?)<\/VariableEdit>(?![\s\S]*<VariableEdit>[\s\S]*<\/VariableEdit>)/;
  const editMatch = result.match(regexEdit);

  if (editMatch && editMatch[1]) {
    try {
      // 解析VariableEdit中的JSON数据
      const editData = JSON.parse(editMatch[1]);

      eraLogger.log("获取到的更新内容：", editData)

      // 获取快照数据
      const snapshotData = await getEraEditStore().getStatData();
      if (snapshotData == null) {
        toastr.error("快照数据为空,跳过处理");
        return result;
      }

      //获取EraRules
      const rules = getEraDataStore().eraDataRule;

      // 应用规则处理数据
      const { data: updatedData, log } = await EraDataHandler.applyRule(
        editData,
        snapshotData,
        rules,
      );

      const updatedContent = JSON.stringify(updatedData);
      result = result.replace(
        /<VariableEdit>[\s\S]*?<\/VariableEdit>/,
        `<VariableEdit>\n${updatedContent}\n</VariableEdit>`
      );

      // 记录处理日志
      eraLogger.log("变量更新日志：", log);
    } catch (e) {
      eraLogger.error("变量更新失败：", e);
      toastr.error("变量更新失败");
    }
  }
  return result;
}

/**
 * 合并消息内容
 */
async function handleMessageMerge(result: string) {
  if(result.length < 200){
    toastr.error('接收的分析结果为空，哈！');
    throw new Error("接收的分析结果为空，哈！");
  }
  //先去除掉正文的旧记录
  const filterList = [] as RegExp[];
  regexStrList.value.forEach((regexStr: string) => {
    const regex = new RegExp(regexStr, 'gi')
    if(result.match(regex)){
      filterList.push(regex);
    }
  });
  await MessageUtil.removeContentByRegex(getLastMessageId(), filterList);

  result = await handleEraRules(result);

  //提取并且合并消息到正文
   // 只保留标签及其内部内容
  let content = "";
  filterList.map(regex => {
    content += result.match(regex)?.join('') ?? '';
  })
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
  await WorldInfoUtil.removeLoresByArray(lores, loreList.value, isReversed.value);
}

