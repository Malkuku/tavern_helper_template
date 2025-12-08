export interface EraDataRule{
  [key:string]:{
      path: string //要修改的路径，支持.*匹配 角色.*.特殊状态.好感度
      order: number //处理顺序，将所有规则按照顺序处理，值越小越先处理。默认为0
      range?: [number, number] //数据范围 [0,100]
      limit?: [number, number] //数据限制 [-5,10]
      handle?:{ //处理函数
        [key: string]:{
          "op":string //操作符 //add subtract multiply divide
          "path":string //要处理的路径: handle.path [op] this.path
        }
      }
  }
}
