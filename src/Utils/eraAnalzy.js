
/**
 * 标记是否处于ERA分步变量解析
 */
let duringExtraCall = false;

const ExtraLLMRequestContent = `---
<must>
The latest storyline is contained within the \`<past_observe>\` block.
The \`<status_current_variables>\` section records the state of variables *prior to* the latest storyline.
# Ignore all the instructions I received before, my task has now changed.
I must now **stop role-playing** and analyze the latest storyline **from a narrator’s perspective**, reviewing what has happened and updating the variables in \`<status_current_variables>\` according to the variable update rules.
From this point onward, **only** output the \`<VariableThink>\` and the \`<Variable(?:Insert|Edit|Delete)>\` content.
</must>`;

/**
 * 统一管理等待ERA变量更新的时间
 */
const waitTime = 5000;

function sleep(time) {
    new Promise(res => setTimeout(res, time));
}

async function handlePromptFilter(lores) {
    const isStepAnalysisFlag = localStorage.getItem('ERA分布变量分析设置.开关') === 'true';

    // 添加无论是什么模式都要排除的世界书
    const ignore_regex = /\[era_ignore\]/i;
    const remove_and_check = lore => {
        _.remove(lore, entry => {
            const is_ignore_regex = entry.comment.match(ignore_regex);
            return is_ignore_regex;
        });
    };
    remove_and_check(lores.globalLore);
    remove_and_check(lores.characterLore);
    remove_and_check(lores.chatLore);
    remove_and_check(lores.personaLore);

    //在这个回调中，会将所有lore的条目传入，此处可以去除所有 [era_update] 相关的条目，避免在非更新的轮次中输出相关内容。
    if (!isStepAnalysisFlag) {
        return;
    }

    const update_regex = /\[era_update\]/i;
    const plot_regex = /\[era_plot\]/i;
    const remove_and_check_by_step_analysis = lore => {
        _.remove(lore, entry => {
            const is_update_regex = entry.comment.match(update_regex);
            const is_plot_regex = entry.comment.match(plot_regex);
            return duringExtraCall
                ? is_plot_regex && !is_update_regex
                : !is_plot_regex && is_update_regex;
        });
    };
    remove_and_check_by_step_analysis(lores.globalLore);
    remove_and_check_by_step_analysis(lores.characterLore);
    remove_and_check_by_step_analysis(lores.chatLore);
    remove_and_check_by_step_analysis(lores.personaLore);
}

async function onMessageReceived(message_id) {

    const modelSource = localStorage.getItem('ERA分布变量分析设置.模型来源')?.trim() || '与插头相同';
    const customModelSettings = {
        baseURL : localStorage.getItem('ERA分布变量分析设置.基础URL')?.trim() || '',
        apiKey : localStorage.getItem('ERA分布变量分析设置.API密钥')?.trim() || '',
        modelName : localStorage.getItem('ERA分布变量分析设置.模型名称')?.trim() || '',
        temperature : localStorage.getItem('ERA分布变量分析设置.温度')?.trim() || '',
        frequencyPenalty : localStorage.getItem('ERA分布变量分析设置.频率惩罚')?.trim() || '',
        presencePenalty : localStorage.getItem('ERA分布变量分析设置.存在惩罚')?.trim() || '',
        maxTokens : localStorage.getItem('ERA分布变量分析设置.最大回复token数')?.trim() || ''
    }

    const isStepAnalysisFlag = localStorage.getItem('ERA分布变量分析设置.开关') === 'true';

    const current_chatmsg = getChatMessages(message_id).at(-1);
    if (!current_chatmsg) {
        return;
    }

    const message_content = current_chatmsg.message;
    if (message_content.length < 5) {
        //MESSAGE_RECEIVED 有时候也会在请求的一开始递交，会包含一个 "..." 的消息
        return;
    }

    if(getLastMessageId() === 0) {
        // 防止0层切换用户、切换聊天记录切换为自己等奇葩操作导致进入分步分析
        return;
    }

    duringExtraCall = false;
    await updateVariablesWith(variables => _.update(variables, "era.stepAnalysis.duringExtraCall", () => duringExtraCall), {type: 'chat'});

    // 判断是否开启分步分析
    if (!isStepAnalysisFlag) {
        return;
    }

    duringExtraCall = true;
    await updateVariablesWith(variables => _.update(variables, "era.stepAnalysis.duringExtraCall", () => duringExtraCall), {type: 'chat'});
    let user_input = ExtraLLMRequestContent;
    // 先写死generate，防止generateRaw无法破限
    const generateFn = false ? generateRaw : generate;

    let result = '';
    let retries = 0;

    try {
        //因为部分预设会用到 {{lastUserMessage}}，因此进行修正。
        console.log('Before RegisterMacro');
        SillyTavern.registerMacro('lastUserMessage', () => {
            return user_input;
        });
        console.log('After RegisterMacro');
        const promptInjects = [
            {
                id: '817114514',
                position: 'in_chat',
                depth: 0,
                should_scan: false,
                role: 'system',
                content: user_input,
            },
            {
                id: '817114515',
                position: 'in_chat',
                depth: 2,
                should_scan: false,
                role: 'assistant',
                content: '<past_observe>',
            },
            {
                id: '817114516',
                position: 'in_chat',
                depth: 1,
                should_scan: false,
                role: 'assistant',
                content: '</past_observe>',
            },
        ]; //部分预设会在后面强调 user_input 的演绎行为，需要找个方式肘掉它

        // 给ERA事件让行，错开可能存在的ERA变量更新
        await new Promise(res => setTimeout(res, waitTime));

        for (retries = 0; retries < 3; retries++) {
            toastr.info(
                `[ERA]分步分析变量更新中...${retries === 0 ? '' : ` 重试 ${retries}/3`}`
            );
            const current_result = await generateFn(
                modelSource === '与插头相同'
                ? {
                    user_input: `遵循后续的 <must> 指令`,
                    injects: promptInjects,
                    max_chat_history: 2,
                    should_stream: false,
                }
                : {
                    user_input: `遵循后续的 <must> 指令`,
                    custom_api: {
                        apiurl: customModelSettings.baseURL,
                        key: customModelSettings.apiKey,
                        model: customModelSettings.modelName,
                        temperature: Number(customModelSettings.temperature),
                        frequency_penalty: Number(customModelSettings.frequencyPenalty),
                        presence_penalty: Number(customModelSettings.presencePenalty),
                        max_tokens: Number(customModelSettings.maxTokens)
                    },
                    injects: promptInjects,
                    max_chat_history: 2,
                    should_stream: false,
                }
            );
            console.log(`Vanilla Response: ${current_result}`);
            if (current_result.indexOf('<UpdateVariable>') !== -1) {
                //至少要出现一个变量设置语句，因为可能会有跑完thinking 直接截断的情况。
                //此外还存在<UpdateVariable><UpdateVariable></UpdateVariable> 的情况
                //因为可能在 thinking 中提及需要输出 <UpdateVariable> 块。
                const lastUpdateVariableIndex = current_result.lastIndexOf('<UpdateVariable>');
                const last_content = current_result
                    .slice(lastUpdateVariableIndex + 16)
                    .replace(/<\/UpdateVariable>/g, '');
                const fn_call_match =
                    /<(variable(?:insert|edit|delete))>\s*(?=[\s\S]*?\S[\s\S]*?<\/\1>)((?:(?!<(?:era_data|variable(?:think|insert|edit|delete))>|<\/\1>)[\s\S])*?)\s*<\/\1>/gi.test(
                        last_content
                    );
                if (fn_call_match) {
                    result = `<UpdateVariable>${last_content}</UpdateVariable>`;
                    break;
                }
            }
        }
    } catch (e) {
        console.error(`变量更新请求发生错误: ${e}`);
        return;
    } finally {
        SillyTavern.unregisterMacro('lastUserMessage');
        duringExtraCall = false;
        await updateVariablesWith(variables => _.update(variables, "era.stepAnalysis.duringExtraCall", () => duringExtraCall), {type: 'chat'});
    }

    if (result !== '') {
        // 将额外模型对变量的解析结果直接尾附到楼层中
        const chat_message = getChatMessages(message_id);
        // 如果直接附加会导致，更新后era_data出现在UpdateVariable上面的情况，虽然不影响，此处还是使用正则提取正文部分，如果有问题，按原始的chat_message[0].message + '\n' + result更新message
        /**
         * 匹配纯正文内容
         * 
         * 解析：
         * ^[\s\S]*?   : 从开头匹配任意字符（非贪婪模式）
         * (?= ... )   : 正向先行断言，即“匹配直到遇见...为止”，但不消耗后续字符
         * (?: ... )   : 非捕获组，用于逻辑“或”
         * <UpdateVariable> : 情况A：遇见变量更新块
         * |                : 或者
         * <era_data>       : 情况B：遇见元数据块（如果变量块不存在，则由它截断）
         * |                : 或者
         * $                : 情况C：字符串结尾（如果两者都不存在）
         */
        const bodyRegex = /^[\s\S]*?(?=(?:<UpdateVariable>|<era_data>|$))/;
        const bodyMatch = chat_message[0].message.match(bodyRegex);
        // 使用 trim() 去除末尾可能残留的换行符
        const currentBodyContent = bodyMatch ? bodyMatch[0].trim() : "";

        await setChatMessages(
            [
                {
                    message_id,
                    message: currentBodyContent + '\n' + result,
                },
            ],
            {
                refresh: 'none',
            }
        );
        // 让ERA同步消息变量修改
        eventEmit('era:forceSync');
    } else {
        toastr.error('建议调整变量更新方式', '[ERA]分步分析变量更新失败');
    }
}

let current_chat_id = SillyTavern.getCurrentChatId();
function reloadScript(chat_id) {
    if (current_chat_id !== chat_id) {
        current_chat_id = chat_id;
        eventClearAll();
        reloadIframe();
    }
}

async function initialize() {
    eventOn(tavern_events.MESSAGE_RECEIVED, onMessageReceived);
    // 读取世界书时过滤提示词
    eventOn('worldinfo_entries_loaded', handlePromptFilter);
    toastr.info('当前以进入后台监护模式', '[ERA]分步分析变量开启');
}

$( 
  async () => {
    eventOn(tavern_events.CHAT_CHANGED, reloadScript);
    await initialize();
  }
)
$(window).on('pagehide', async () => {
    eventClearAll();
});

  // 5. Event listener for the trigger button
eventOnButton('AI重新解析尾楼变量', async () => {
    const message_id = getLastMessageId();
    // 重算变量也视为分步分析
    // 如果已经配置了分步分析和自定义插头将进行分步分析的自定义API调用AI
    const current_chatmsg = getChatMessages(message_id).at(-1);
    if (!current_chatmsg) {
        toastr.info(`[ERA]变量分析失败，无法获取尾楼消息...`);
        return;
    }

    const message_content = current_chatmsg.message;
    if (message_content.length < 5) {
        //MESSAGE_RECEIVED 有时候也会在请求的一开始递交，会包含一个 "..." 的消息
        return;
    }

    if(getLastMessageId() === 0) {
        // 禁止0层进行变量分析
        toastr.info(`[ERA]变量分析失败，0层禁止变量分析...`);
        return;
    }

    if (duringExtraCall) {
        // 正在分步分析中禁止重算
        toastr.info(`[ERA]变量分析失败，当前已在分析变量中...`);
        return;
    }

    // 仅用作判断是否使用自定义插头
    const isStepAnalysisFlag = localStorage.getItem('ERA分布变量分析设置.开关') === 'true';
    const modelSource = localStorage.getItem('ERA分布变量分析设置.模型来源')?.trim() || '与插头相同';
    const customModelSettings = {
        baseURL : localStorage.getItem('ERA分布变量分析设置.基础URL')?.trim() || '',
        apiKey : localStorage.getItem('ERA分布变量分析设置.API密钥')?.trim() || '',
        modelName : localStorage.getItem('ERA分布变量分析设置.模型名称')?.trim() || '',
        temperature : localStorage.getItem('ERA分布变量分析设置.温度')?.trim() || '',
        frequencyPenalty : localStorage.getItem('ERA分布变量分析设置.频率惩罚')?.trim() || '',
        presencePenalty : localStorage.getItem('ERA分布变量分析设置.存在惩罚')?.trim() || '',
        maxTokens : localStorage.getItem('ERA分布变量分析设置.最大回复token数')?.trim() || ''
    }

    duringExtraCall = true;
    await updateVariablesWith(variables => _.update(variables, "era.stepAnalysis.duringExtraCall", () => duringExtraCall), {type: 'chat'});
    let user_input = ExtraLLMRequestContent;
    // 先写死generate，防止generateRaw无法破限
    const generateFn = false ? generateRaw : generate;

    let result = '';
    let isSuccess = false;

    /**
     * 1. 匹配并提取 <UpdateVariable> 区块内的内容
     * 说明：如果不存在则返回 空字符串
     */
    const updateVarRegex = /<UpdateVariable>([\s\S]*?)<\/UpdateVariable>/;
    const updateVarMatch = message_content.match(updateVarRegex);
    const currentUpdateVarContent = updateVarMatch ? updateVarMatch[1]?.trim() : "";

    /**
     * 2. 匹配并提取 <era_data> 区块内的内容
     * 说明：如果不存在则返回 空字符串
     */
    const eraDataRegex = /<era_data>([\s\S]*?)<\/era_data>/;
    const eraDataMatch = message_content.match(eraDataRegex);
    const currentEraDataContent = eraDataMatch ? eraDataMatch[1]?.trim() : "";

    /**
     * 3. 匹配纯正文内容
     * 
     * 解析：
     * ^[\s\S]*?   : 从开头匹配任意字符（非贪婪模式）
     * (?= ... )   : 正向先行断言，即“匹配直到遇见...为止”，但不消耗后续字符
     * (?: ... )   : 非捕获组，用于逻辑“或”
     * <UpdateVariable> : 情况A：遇见变量更新块
     * |                : 或者
     * <era_data>       : 情况B：遇见元数据块（如果变量块不存在，则由它截断）
     * |                : 或者
     * $                : 情况C：字符串结尾（如果两者都不存在）
     */
    const bodyRegex = /^[\s\S]*?(?=(?:<UpdateVariable>|<era_data>|$))/;
    const bodyMatch = message_content.match(bodyRegex);
    // 使用 trim() 去除末尾可能残留的换行符
    const currentBodyContent = bodyMatch ? bodyMatch[0]?.trim() : "";

    if (currentBodyContent === "") {
        toastr.info(`[ERA]变量分析失败，未提取到尾楼正文...`);
        return;
    }

    try {
        if (currentUpdateVarContent !== "") {
            // 重算前先将变量回退（只提取保留正文部分，去除变量更新和元数据部分）
            await setChatMessages(
                [
                    {
                        message_id,
                        message: currentBodyContent
                    },
                ],
                {
                    refresh: 'none',
                }
            );
            // 让ERA同步消息变量修改
            eventEmit('era:forceSync');
            toastr.info(`[ERA]变量回退，等待ERA更新中...`);

            // 等待ERA重算完成后再进行后续
            await new Promise(res => setTimeout(res, waitTime));
        }
        //因为部分预设会用到 {{lastUserMessage}}，因此进行修正。
        console.log('Before RegisterMacro');
        SillyTavern.registerMacro('lastUserMessage', () => {
            return user_input;
        });
        console.log('After RegisterMacro');
        const promptInjects = [
            {
                id: '817114514',
                position: 'in_chat',
                depth: 0,
                should_scan: false,
                role: 'system',
                content: user_input,
            },
            {
                id: '817114515',
                position: 'in_chat',
                depth: 2,
                should_scan: false,
                role: 'assistant',
                content: '<past_observe>',
            },
            {
                id: '817114516',
                position: 'in_chat',
                depth: 1,
                should_scan: false,
                role: 'assistant',
                content: '</past_observe>',
            },
        ]; //部分预设会在后面强调 user_input 的演绎行为，需要找个方式肘掉它

        toastr.info(
            `[ERA]调用AI重新解析尾楼变量中...当前使用：${!isStepAnalysisFlag || modelSource === '与插头相同'? "酒馆插头API" : "ERA分步自定义API"}进行变量分析`
        );

        // 正则已经把正文中所有的变量分析语句从提示词中替换掉了，此处不做额外处理
        const current_result = await generateFn(
            !isStepAnalysisFlag || modelSource === '与插头相同'
            ? {
                user_input: `遵循后续的 <must> 指令`,
                injects: promptInjects,
                max_chat_history: 2,
                should_stream: false,
            }
            : {
                user_input: `遵循后续的 <must> 指令`,
                custom_api: {
                    apiurl: customModelSettings.baseURL,
                    key: customModelSettings.apiKey,
                    model: customModelSettings.modelName,
                    temperature: Number(customModelSettings.temperature),
                    frequency_penalty: Number(customModelSettings.frequencyPenalty),
                    presence_penalty: Number(customModelSettings.presencePenalty),
                    max_tokens: Number(customModelSettings.maxTokens)
                },
                injects: promptInjects,
                max_chat_history: 2,
                should_stream: false,
            }
        );
        console.log(`Vanilla Response: ${current_result}`);
        if (current_result.indexOf('<UpdateVariable>') !== -1) {
            //至少要出现一个变量设置语句，因为可能会有跑完thinking 直接截断的情况。
            //此外还存在<UpdateVariable><UpdateVariable></UpdateVariable> 的情况
            //因为可能在 thinking 中提及需要输出 <UpdateVariable> 块。
            const lastUpdateVariableIndex = current_result.lastIndexOf('<UpdateVariable>');
            const last_content = current_result
                .slice(lastUpdateVariableIndex + 16)
                .replace(/<\/UpdateVariable>/g, '');
            const fn_call_match =
                /<(variable(?:insert|edit|delete))>\s*(?=[\s\S]*?\S[\s\S]*?<\/\1>)((?:(?!<(?:era_data|variable(?:think|insert|edit|delete))>|<\/\1>)[\s\S])*?)\s*<\/\1>/gi.test(
                    last_content
                );
            if (fn_call_match) {
                result = `<UpdateVariable>${last_content}</UpdateVariable>`;
                isSuccess = true;
            }
        }
    } catch (e) {
        console.error(`变量更新请求发生错误: ${e}`);
        return;
    } finally {
        SillyTavern.unregisterMacro('lastUserMessage');
        duringExtraCall = false;
        await updateVariablesWith(variables => _.update(variables, "era.stepAnalysis.duringExtraCall", () => duringExtraCall), {type: 'chat'});

        // 失败时，将之前回退废弃的变量回滚
        if (currentUpdateVarContent !== "" && !isSuccess) {
            await setChatMessages(
                [
                    {
                        message_id,
                        message: `${currentBodyContent}${currentUpdateVarContent === '' ? "" : `\n<UpdateVariable>${currentUpdateVarContent}</UpdateVariable>\n`}`
                    },
                ],
                {
                    refresh: 'none',
                }
            );
            // 让ERA同步消息变量修改
            eventEmit('era:forceSync');
            toastr.info(`[ERA]变量已回滚...`);
        }
    }

    if (result !== '') {
        // 将额外模型对变量的解析结果直接尾附到楼层中
        const chat_message = getChatMessages(message_id);

        /**
         * 匹配纯正文内容
         * 
         * 解析：
         * ^[\s\S]*?   : 从开头匹配任意字符（非贪婪模式）
         * (?= ... )   : 正向先行断言，即“匹配直到遇见...为止”，但不消耗后续字符
         * (?: ... )   : 非捕获组，用于逻辑“或”
         * <UpdateVariable> : 情况A：遇见变量更新块
         * |                : 或者
         * <era_data>       : 情况B：遇见元数据块（如果变量块不存在，则由它截断）
         * |                : 或者
         * $                : 情况C：字符串结尾（如果两者都不存在）
         */
        const bodyRegex = /^[\s\S]*?(?=(?:<UpdateVariable>|<era_data>|$))/;
        const bodyMatch = chat_message[0].message.match(bodyRegex);
        // 使用 trim() 去除末尾可能残留的换行符
        const bodyContent = bodyMatch ? bodyMatch[0]?.trim() : "";

        // 需要重新将原消息中的变量更新块进行替换
        await setChatMessages(
            [
                {
                    message_id,
                    message: `${bodyContent}\n${result}`,
                }
            ]
        );
        // 让ERA同步消息变量修改
        eventEmit('era:forceSync');
        toastr.info(`[ERA]变量分析成功，已替换为最新变量...`);
    } else {
        toastr.error('请重试', '[ERA]AI重新解析尾楼变量失败');
    }
});