export interface EraDataRule{
  [key:string]:{
      path: string //要修改的路径，支持.*匹配 角色.*.特殊状态.好感度
      enable: boolean //是否启用
      order: number //处理顺序，将所有规则按照顺序处理，值越小越先处理。默认为0
      range?: [number, number] //数据范围 [0,100]
      limit?: [number, number] //数据限制 [-5,10]
      handle?:{ //处理函数
        [key: string]:{
          order: number //处理顺序，将所有规则按照顺序处理，值越小越先处理。默认为0
          //判断可选条件表达式<<if>  >
          // <<if> $[path] ?[==] $[$this]>
          // <<if> ($[path1] ?[<=] $[$this]) ?[&&] ($[$this] ?(==) &[])>
          // ?[] 写判断符号,支持== > < <= >= 符号 和 && || 逻辑运算符,()表示优先级
          // $[] 里面写路径$this表示当前路径,否则用path表示一个完整路径
          // &[{}] 表示一个值，可以是number,string,boolean,null,array,object
          // 比如&[{num}1],符号为{num},{str},{bool},{null},{arr},{obj}
          if?:string
          //操作表达式 <<op> >
          // <<op> $[path] #[+] $($this)>
          // 用#[]表示操作符号,支持+ - * / % ** 运算符
          // #[{}],表示一些特殊的符号,支持ln,log2,sqrt,abs,floor,ceil
          // 比如#[{ln}$(path)] 表示ln(path)
          // $[] 里面写路径，同上
          // &[] 表示一个值，同上
          op:string
        }
      }
  }

  /**
   * 优先级 1.handle 2.limit 3.range
   */
}
