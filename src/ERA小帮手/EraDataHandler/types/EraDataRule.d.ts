export interface EraDataRule{
  [key:string]:{
      path: string //要修改的路径，支持.*匹配 角色.*.特殊状态.好感度
      enable: boolean //是否启用
      order: number //处理顺序，将所有规则按照顺序处理，值越小越先处理。默认为0
      range?: [number, number] //数据范围 [0,100]
      limit?: [number, number] //数据限制 [-5,10]
      handle?:{ //处理函数
        [key: string]:{
          "op":string //操作符 //add subtract multiply divide
          "path":string //要处理的路径: this.path [op] handle.path
        }
      }
      setIf?:{ //设置函数，当判断路径满足条件时，将此路径的值设置为keyValue
        path:string //判断路径
        if:string //判断条件[==,>,<,<=,>=]
        ifValue:any //判断值
        keyValue:any //要设置的值
      }
  }

  /**
   * 优先级：1.setIf 2.handle 3.range 4.limit
   */
}
