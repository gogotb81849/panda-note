/**
 * 统一错误码定义
 * 格式：ABCxxx
 * - A: 错误级别 (1=提示, 4=客户端错误, 5=服务器错误)
 * - BC: 错误类别
 * - xxx: 具体错误编号
 */

/**
 * 错误码枚举
 * 400xxx: 参数/请求错误
 * 401xxx: 认证/登录错误
 * 403xxx: 权限/禁止访问错误
 * 404xxx: 资源不存在错误
 * 409xxx: 冲突错误（如重复数据）
 * 422xxx: 业务逻辑错误
 * 500xxx: 服务器内部错误
 */
export enum ErrorCode {
  // ========== 400xxx: 参数/请求错误 ==========
  // 通用参数错误
  PARAM_INVALID = '400001',
  PARAM_MISSING = '400002',
  PARAM_TYPE_ERROR = '400003',
  PARAM_VALUE_OUT_OF_RANGE = '400004',

  // 特定业务参数错误
  DATE_FORMAT_INVALID = '400101',
  DATE_RANGE_INVALID = '400102',
  TEAM_CODE_INVALID = '400103',
  USER_ID_INVALID = '400104',
  SHIP_ID_INVALID = '400105',

  // ========== 401xxx: 认证/登录错误 ==========
  AUTH_TOKEN_MISSING = '401001',
  AUTH_TOKEN_INVALID = '401002',
  AUTH_TOKEN_EXPIRED = '401003',
  AUTH_CREDENTIALS_INVALID = '401004',
  AUTH_ACCOUNT_LOCKED = '401005',
  AUTH_ACCOUNT_DISABLED = '401006',

  // ========== 403xxx: 权限/禁止访问错误 ==========
  FORBIDDEN_NO_PERMISSION = '403001',
  FORBIDDEN_ROLE_NOT_ALLOWED = '403002',
  FORBIDDEN_RESOURCE_OWNED_BY_OTHER = '403003',
  FORBIDDEN_OPERATION_NOT_ALLOWED = '403004',

  // ========== 404xxx: 资源不存在错误 ==========
  NOT_FOUND_GENERIC = '404000',
  NOT_FOUND_USER = '404001',
  NOT_FOUND_SHIP = '404002',
  NOT_FOUND_DIARY = '404003',
  NOT_FOUND_SCHEDULE = '404004',
  NOT_FOUND_TASK = '404005',
  NOT_FOUND_FILE = '404006',
  NOT_FOUND_EXPERIENCE = '404007',
  NOT_FOUND_PARTY_ACTIVITY = '404008',
  NOT_FOUND_CREW = '404009',

  // ========== 409xxx: 冲突错误 ==========
  CONFLICT_DUPLICATE_ENTRY = '409001',
  CONFLICT_DATA_ALREADY_EXISTS = '409002',
  CONFLICT_STATUS_TRANSITION_INVALID = '409003',

  // ========== 422xxx: 业务逻辑错误 ==========
  BUSINESS_LOGIC_ERROR = '422000',
  DIARY_ALREADY_EXISTS_FOR_DATE = '422001',
  SCHEDULE_ALREADY_COMPLETED = '422002',
  INVALID_STATUS_TRANSITION = '422003',
  OPERATION_NOT_ALLOWED_CURRENT_STATUS = '422004',

  // ========== 500xxx: 服务器内部错误 ==========
  INTERNAL_SERVER_ERROR = '500000',
  DATABASE_ERROR = '500001',
  EXTERNAL_SERVICE_ERROR = '500002',
  FILE_UPLOAD_ERROR = '500003',
}

/**
 * 错误码到友好消息的映射
 */
export const ErrorMessageMap: Record<string, string> = {
  // 400xxx
  [ErrorCode.PARAM_INVALID]: '参数无效',
  [ErrorCode.PARAM_MISSING]: '缺少必要参数',
  [ErrorCode.PARAM_TYPE_ERROR]: '参数类型错误',
  [ErrorCode.PARAM_VALUE_OUT_OF_RANGE]: '参数值超出范围',
  [ErrorCode.DATE_FORMAT_INVALID]: '日期格式无效',
  [ErrorCode.DATE_RANGE_INVALID]: '日期范围无效',
  [ErrorCode.TEAM_CODE_INVALID]: '团队代码无效',
  [ErrorCode.USER_ID_INVALID]: '用户ID无效',
  [ErrorCode.SHIP_ID_INVALID]: '船舶ID无效',

  // 401xxx
  [ErrorCode.AUTH_TOKEN_MISSING]: '未提供认证令牌',
  [ErrorCode.AUTH_TOKEN_INVALID]: '认证令牌无效',
  [ErrorCode.AUTH_TOKEN_EXPIRED]: '认证令牌已过期，请重新登录',
  [ErrorCode.AUTH_CREDENTIALS_INVALID]: '用户名或密码错误',
  [ErrorCode.AUTH_ACCOUNT_LOCKED]: '账户已被锁定，请稍后再试',
  [ErrorCode.AUTH_ACCOUNT_DISABLED]: '账户已被禁用',

  // 403xxx
  [ErrorCode.FORBIDDEN_NO_PERMISSION]: '您没有执行此操作的权限',
  [ErrorCode.FORBIDDEN_ROLE_NOT_ALLOWED]: '您的角色无权执行此操作',
  [ErrorCode.FORBIDDEN_RESOURCE_OWNED_BY_OTHER]: '该资源不属于您，无权操作',
  [ErrorCode.FORBIDDEN_OPERATION_NOT_ALLOWED]: '此操作不被允许',

  // 404xxx
  [ErrorCode.NOT_FOUND_GENERIC]: '请求的资源不存在',
  [ErrorCode.NOT_FOUND_USER]: '用户不存在',
  [ErrorCode.NOT_FOUND_SHIP]: '船舶不存在',
  [ErrorCode.NOT_FOUND_DIARY]: '日记不存在',
  [ErrorCode.NOT_FOUND_SCHEDULE]: '日程不存在',
  [ErrorCode.NOT_FOUND_TASK]: '任务不存在',
  [ErrorCode.NOT_FOUND_FILE]: '文件不存在',
  [ErrorCode.NOT_FOUND_EXPERIENCE]: '经验分享不存在',
  [ErrorCode.NOT_FOUND_PARTY_ACTIVITY]: '党建活动不存在',
  [ErrorCode.NOT_FOUND_CREW]: '船员不存在',

  // 409xxx
  [ErrorCode.CONFLICT_DUPLICATE_ENTRY]: '数据已存在，请勿重复创建',
  [ErrorCode.CONFLICT_DATA_ALREADY_EXISTS]: '相同数据已存在',
  [ErrorCode.CONFLICT_STATUS_TRANSITION_INVALID]: '状态转换无效',

  // 422xxx
  [ErrorCode.BUSINESS_LOGIC_ERROR]: '业务处理失败',
  [ErrorCode.DIARY_ALREADY_EXISTS_FOR_DATE]: '该日期的日记已存在',
  [ErrorCode.SCHEDULE_ALREADY_COMPLETED]: '日程已完成，无需重复操作',
  [ErrorCode.INVALID_STATUS_TRANSITION]: '状态流转无效',
  [ErrorCode.OPERATION_NOT_ALLOWED_CURRENT_STATUS]: '当前状态下不允许此操作',

  // 500xxx
  [ErrorCode.INTERNAL_SERVER_ERROR]: '服务器内部错误，请稍后再试',
  [ErrorCode.DATABASE_ERROR]: '数据库操作失败',
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: '外部服务调用失败',
  [ErrorCode.FILE_UPLOAD_ERROR]: '文件上传失败',
};

/**
 * 获取错误码对应的友好消息
 */
export function getErrorMessage(code: string): string {
  return ErrorMessageMap[code] || '未知错误';
}
