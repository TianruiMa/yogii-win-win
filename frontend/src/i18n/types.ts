// 支持的语言类型
export type LocaleType = 'zh' | 'en'

// 嵌套对象的键路径类型
export type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}` | `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`
}[keyof ObjectType & (string | number)]

// 翻译函数类型
export type TranslateFunction = (key: string, params?: Record<string, string | number>) => string

// 语言包接口
export interface LocaleMessages {
  [key: string]: string | LocaleMessages
}
