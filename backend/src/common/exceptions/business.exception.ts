import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode, getErrorMessage } from '../error-codes';

/**
 * 业务异常类
 * 用于抛出带有统一错误码的异常
 */
export class BusinessException extends HttpException {
  private readonly code: string;
  private readonly details: any;

  constructor(
    code: string,
    message?: string,
    details?: any,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    const finalMessage = message || getErrorMessage(code) || '业务处理失败';
    super(
      {
        code,
        message: finalMessage,
        details,
      },
      status,
    );
    this.code = code;
    this.details = details;
  }

  getCode(): string {
    return this.code;
  }

  getDetails(): any {
    return this.details;
  }

  /**
   * 静态工厂方法：创建参数错误异常
   */
  static paramInvalid(message?: string, details?: any): BusinessException {
    return new BusinessException(ErrorCode.PARAM_INVALID, message, details);
  }

  static paramMissing(paramName: string): BusinessException {
    return new BusinessException(
      ErrorCode.PARAM_MISSING,
      `缺少必要参数: ${paramName}`,
    );
  }

  /**
   * 静态工厂方法：创建认证异常
   */
  static authTokenExpired(): BusinessException {
    return new BusinessException(
      ErrorCode.AUTH_TOKEN_EXPIRED,
      undefined,
      undefined,
      HttpStatus.UNAUTHORIZED,
    );
  }

  static authCredentialsInvalid(): BusinessException {
    return new BusinessException(
      ErrorCode.AUTH_CREDENTIALS_INVALID,
      undefined,
      undefined,
      HttpStatus.UNAUTHORIZED,
    );
  }

  /**
   * 静态工厂方法：创建权限异常
   */
  static forbidden(message?: string): BusinessException {
    return new BusinessException(
      ErrorCode.FORBIDDEN_NO_PERMISSION,
      message,
      undefined,
      HttpStatus.FORBIDDEN,
    );
  }

  static forbiddenOperation(message: string): BusinessException {
    return new BusinessException(
      ErrorCode.FORBIDDEN_OPERATION_NOT_ALLOWED,
      message,
      undefined,
      HttpStatus.FORBIDDEN,
    );
  }

  /**
   * 静态工厂方法：创建资源不存在异常
   */
  static notFound(resource: string, id?: number | string): BusinessException {
    const message = id ? `${resource} ${id} 不存在` : `${resource}不存在`;
    return new BusinessException(
      ErrorCode.NOT_FOUND_GENERIC,
      message,
      undefined,
      HttpStatus.NOT_FOUND,
    );
  }

  /**
   * 静态工厂方法：创建冲突异常
   */
  static conflict(message: string, details?: any): BusinessException {
    return new BusinessException(
      ErrorCode.CONFLICT_DUPLICATE_ENTRY,
      message,
      details,
      HttpStatus.CONFLICT,
    );
  }

  /**
   * 静态工厂方法：创建业务逻辑异常
   */
  static businessError(message: string, code: ErrorCode = ErrorCode.BUSINESS_LOGIC_ERROR): BusinessException {
    return new BusinessException(code, message, undefined, HttpStatus.UNPROCESSABLE_ENTITY);
  }

  /**
   * 静态工厂方法：创建服务器内部异常
   */
  static internal(message?: string): BusinessException {
    return new BusinessException(
      ErrorCode.INTERNAL_SERVER_ERROR,
      message,
      undefined,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
