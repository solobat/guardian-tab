export interface Navigation {
  id: string
  name: string
  url: string
  icon?: string
  clickCount: number
  createdAt: number
  /** 显式排序索引，手动拖拽顺序的优先级高于点击次数，数值越小越靠前。旧数据迁移时会根据原数组顺序自动补全 */
  orderIndex?: number
} 