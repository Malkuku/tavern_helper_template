const sendPrompt = async(user_input: string,
                         promptInjects: any[],
                         max_chat_history: number,
                         is_should_stream: boolean,
                         customModelSettings: any) =>{
  //因为部分预设会用到 {{lastUserMessage}}，因此进行修正。
  console.log('Before RegisterMacro');
  SillyTavern.registerMacro('lastUserMessage', () => {
    return user_input;
  });
  console.log('After RegisterMacro');

  // 发送请求以获取结果
  return await generate({
    user_input,
    injects: promptInjects,
    max_chat_history,
    should_stream: is_should_stream,
    ...(customModelSettings && {
      custom_api: {
        apiurl: customModelSettings.baseURL,
        key: customModelSettings.apiKey,
        model: customModelSettings.modelName,
        temperature: Number(customModelSettings.temperature),
        frequency_penalty: Number(customModelSettings.frequencyPenalty),
        presence_penalty: Number(customModelSettings.presencePenalty),
        max_tokens: Number(customModelSettings.maxTokens),
      },
    }),
  });
}


export const PromptUtil = {
  sendPrompt,
}
