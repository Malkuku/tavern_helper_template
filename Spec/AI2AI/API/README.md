# API 索引

## 外部宿主契约

- Tavern Helper、SillyTavern、MVU 与 iframe 全局接口：以仓库 `@types/` 声明为当前类型契约。
- STScript 命令目录：仓库根部 `slash_command.txt`。

## 内部共享契约

- `src/util/script.ts`：后台脚本挂载、样式传送与聊天切换重载工具。
- `src/util/floatingUi.ts`：脚本浮层的 Vue/Pinia/插件挂载、样式传送、区域初始化与卸载清理。
- `src/Utils/MvuUtil.ts`：MVU 数据解析、覆盖和差分更新适配。
- `src/Utils/MessageUtil.ts`：聊天消息读取与内容合并/删除适配。
- `src/Utils/VariableLogParser.ts`：variable 标签、JSON Patch 与可选 UpdateVariable 日志的统一解析。
- `src/Utils/WorldInfoUtil.ts`：角色世界书查询与条目内容更新适配。
