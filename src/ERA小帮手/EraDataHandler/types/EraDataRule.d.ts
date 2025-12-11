export interface EraDataRule {
  [key: string]: {
    path: string; //要修改的路径，支持.*匹配 角色.*.特殊状态.好感度
    enable: boolean; //是否启用
    order: number; //处理顺序，将所有规则按照顺序处理，值越小越先处理。默认为0
    loop?: number; //循环次数，默认为1且不能小于1，最大值为1000 //如果配置了if表达式，当结果为false时，直接终止循环
    range?: [number, number]; //数据范围 [0,100]
    limit?: [number, number]; //数据限制 [-5,10]
    if?: string; //判断条件，控制rule下所有的handle是否执行；不影响上面的range和limit
    handle?: {
      //处理函数 //要求类型必须相同，否则操作将被跳过
      [key: string]: {
        order: number; //处理顺序，将所有规则按照顺序处理，值越小越先处理。默认为0
        loop?: number; //循环次数，默认为1且不能小于1，最大值为1000 //如果配置了if表达式，当结果为false时，直接终止循环
        //判断可选条件表达式<<if>  >
        // <<if> $[path1] ?[==] $[path2]>
        // <<if> ($[path1] ?[<=] $[path2]) ?[&&] ($[path2] ?(==) &[{num}2])>
        // ?[] 写判断符号,支持== > < <= >= 符号 和 && || 逻辑运算符,()表示优先级
        // $[] 用path表示一个完整路径
        // &[{}] 表示一个值，可以是number,string,boolean,null
        // 比如&[{num}1],符号为{num},{str},{bool},{null}
        if?: string;
        //操作表达式 <<op> >
        // <<op> $[path] #[+] $[path]>
        // 用#[]表示操作符号,支持+ - * / % ** =运算符
        // #[{}],表示一些特殊的符号,支持ln,log2,sqrt,abs,floor,ceil,max,min
        // 比如#[{ln}$[path]] 表示ln(path)，#[{max}$[path1]$[path2]],将计算path1和path2的最大值，可以多个值，比如#[{max}$[path1]$[path2]$[path3]]
        // $[] 里面写路径，同上
        // &[] 表示一个值，同上
        op: string;
      };
    };
  };

  /**
   * 优先级 1.handle 2.limit 3.range
   * 通配符的执行逻辑：
   * 当第一次通过通配符匹配到某个具体路径时，记录当前层的名称，后面遇到同层的时，替换成为这个名称
   * 简单地说：
   * 当执行：角色.*.好感度 +角色.*.好感度 时，相当于每个角色的好感度各自翻倍
   * 而不是 每个角色累加了所有角色的好感度
   */

  /**
   * handle表达式并不是把rule的路径给赋值上value，
   * 而是基于返回的结果数组进行操作
   * 比如{"success":true,"value":[{"path":"角色.星宫诗羽.特殊状态.好感度","value":10}]}
   * 就是将角色.星宫诗羽.特殊状态.好感度的值设置为10
   * 相对独立于rule
   */

  /**
   * 核心执行顺序：for(rule in rules){ //rule按照rule.order执行
   *   for(rule: loop循环){
   *     if(rule.if == false){
   *        data = data -> 执行 range
   *        data = data -> 执行 limit
   *        break;
   *     }
   *     for(handle in handles){ //handle按照handle.order执行
   *       for(handle: loop循环){
   *         if(handle.if == false) break;
   *         data = data -> 执行 handle
   *       }
   *     }
   *     data = data -> 执行 range
   *     data = data -> 执行 limit
   *   }
   * }
   */

  /**
   * 注意：
   * - handle的loop循环是先重复执行这一条handle，直到loop次数达到上限或者if结果为false
   * - dsl处理器不支持连续执行if/op，一条规则只能执行一个if/op，
   *  比如在写等级提升时，应该先写升级的handle，再写扣经验值的handle
   * - op执行后对data的修改会立刻生效，比如在写等级提升时，应该先升级再扣经验值
   * - 语句是直接赋值的，比如 <<op>$[角色.*.好感度] #[+] &[{num}10] >就是让所有角色的好感度+=10
   */

  /**
   * 有且只能出现以下符号：
   * 路径符号 $[path] 使用逗号路径表示，允许通配符 *
   * 判断符号 ?[==] ?[>] ?[<] ?[<=] ?[>=]
   * 值符号 &[{num}10] &[{str}hello] &[{bool}true] &[{null}]
   * 操作符号 #[+] #[-] #[*] #[/] #[%] #[**] #[=]        运算符,#[{ln}$[path]]
   */
}

export interface EraDataRuleHandle{
  [key: string]:{
    order: number
    if?:string
    op:string
  }
}
