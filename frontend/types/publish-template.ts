/**
 * 任务发布系统类型定义
 * 统一前后端数据结构，避免字段名不一致问题
 */

/**
 * 字段类型枚举
 */
export type FieldType = 
  | 'text' 
  | 'textarea' 
  | 'number' 
  | 'date' 
  | 'select' 
  | 'multi_select'
  | 'checkbox'
  | 'rating'
  | 'attachment'
  | 'section'
  | 'photo'
  | 'geolocation'
  | 'group'

/**
 * 条件逻辑配置
 */
export interface ShowWhen {
  field: string
  value?: string
  not?: string
}

/**
 * 字段验证规则
 */
export interface FieldValidation {
  minLength?: number
  maxLength?: number
  min?: number
  max?: number
  pattern?: string
  patternMsg?: string
}

/**
 * 模板字段定义（前端统一格式）
 */
export interface TemplateField {
  fieldName: string
  fieldLabel: string
  fieldType: FieldType
  fieldOptions?: string  // JSON字符串格式
  options?: string[]     // 数组格式（运行时使用）
  isRequired: boolean
  sortOrder: number
  helpText?: string
  showWhen?: ShowWhen | null
  validation?: FieldValidation | null
  maxCount?: number | null
}

/**
 * 后端字段定义格式
 */
export interface BackendField {
  name: string
  label: string
  type: FieldType
  options?: string[]
  required?: boolean
  helpText?: string
  showWhen?: ShowWhen
  validation?: FieldValidation
  maxCount?: number
}

/**
 * 模板类型枚举
 */
export type TemplateType = 
  | 'checklist'      // 勾选清单
  | 'form_collect'   // 收集表
  | 'photo_checkin'  // 拍照打卡
  | 'file_collect'   // 文件收集
  | 'ai_survey'      // AI分析收集

/**
 * 模板基础信息
 */
export interface TemplateBase {
  id?: number
  title: string
  templateType: TemplateType
  templateDesc?: string | null
  coverImage?: string | null
  categoryId?: number | null
  isSystem: boolean
  isDraft: boolean
  isPublished: boolean
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

/**
 * 完整模板定义（含字段列表）
 */
export interface PublishTemplate extends TemplateBase {
  items: TemplateField[]
  teamCode: string
  targetShips?: number[] | null
  triggerDays?: number | null
  frequencyType?: 'once' | 'daily' | 'weekly' | 'monthly'
  frequencyCron?: string | null
  reminderEnabled?: boolean
  reminderDaysBefore?: number | null
  deadline?: string | null
  aiEnabled?: boolean
  aiPromptTemplate?: string | null
  aiOutputFormat?: 'summary' | 'full_report' | 'analysis'
  dashboardMetrics?: any | null
  fileNamingRule?: string | null
  allowedTypes?: string[] | null
  progressTracking?: boolean
  sortOrder?: number
}

/**
 * 船舶任务状态
 */
export type ShipTaskStatus = 'pending' | 'draft' | 'in_progress' | 'completed' | 'overdue'

/**
 * 船舶任务记录
 */
export interface ShipTask {
  id: number
  shipId: number
  ship?: {
    id: number
    cnShipName: string
  }
  shipName?: string
  templateId: number
  template?: {
    id: number
    title: string
    templateType: string
  }
  templateType: string
  status: ShipTaskStatus
  totalItems: number
  completedItems: number
  progress: number
  triggerDate?: string | null
  respondedBy?: number | null
  respondedAt?: string | null
  submittedAt?: string | null
  createdAt?: string
  updatedAt?: string
  responseData?: Record<string, any>
  checklistProgress?: any[]
  fileList?: any[]
  geoLat?: number | null
  geoLng?: number | null
  geoAddress?: string | null
  deviceInfo?: any
}

/**
 * 任务统计信息
 */
export interface TaskStats {
  total: number
  completed: number
  pending: number
  draft: number
  completionRate: number
}

/**
 * 催填通知请求
 */
export interface RemindRequest {
  type: 'task_reminder'
  templateId: number
  shipIds: number[]
  message?: string
}

/**
 * 文件下载项
 */
export interface FileDownloadItem {
  filePath: string
  fileName: string
  shipName: string
}

/**
 * 字段类型映射工具函数
 */
export function mapBackendFieldToFrontend(backendField: BackendField, index: number): TemplateField {
  return {
    fieldName: backendField.name || `field_${index}`,
    fieldLabel: backendField.label || '',
    fieldType: backendField.type || 'text',
    fieldOptions: Array.isArray(backendField.options) ? JSON.stringify(backendField.options) : '',
    options: backendField.options || [],
    isRequired: backendField.required ?? false,
    sortOrder: index,
    helpText: backendField.helpText || '',
    showWhen: backendField.showWhen || null,
    validation: backendField.validation || null,
    maxCount: backendField.maxCount || null,
  }
}

/**
 * 批量字段映射
 */
export function mapBackendFieldsToFrontend(backendFields: BackendField[]): TemplateField[] {
  return backendFields.map(mapBackendFieldToFrontend)
}