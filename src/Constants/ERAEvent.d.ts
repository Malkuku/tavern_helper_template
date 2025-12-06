declare const ERAEvents :{
  /**
   * 非破坏性地插入一个或多个变量。
   */
  INSERT_BY_OBJECT: 'era:insertByObject',
  /**
   * 通过对象合并的方式，修改一个或多个已存在的变量。
   */
  UPDATE_BY_OBJECT: 'era:updateByObject',
  /**
   * 根据一个描述性的对象结构，删除一个或多个已存在的变量。
   */
  DELETE_BY_OBJECT: 'era:deleteByObject',
  /**
   * 获取快照消息
   */
  GET_SNAPSHOT_AT_MK : 'era:getSnapshotAtMk',
}
