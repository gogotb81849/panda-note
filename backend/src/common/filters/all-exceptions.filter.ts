import { ExceptionFilter, Catch, ArgumentsHost, Logger } from '@nestjs/common';
import { HttpException } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      const errorResponse = {
        success: false,
        code: status,
        message: typeof exceptionResponse === 'string' 
          ? exceptionResponse 
          : (exceptionResponse as any).message || '服务器内部错误',
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
      };

      this.logger.error(`[${request.method}] ${request.url} - HTTP ${status}: ${errorResponse.message}`);
      response.status(status).json(errorResponse);
    } else {
      const error = exception as Error;
      const errorResponse = {
        success: false,
        code: 500,
        message: process.env.NODE_ENV === 'production' 
          ? '服务器内部错误，请稍后重试' 
          : error.message || '未知错误',
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
      };

      this.logger.error(`[${request.method}] ${request.url} - Unexpected Error: ${error.message}`, error.stack);
      response.status(500).json(errorResponse);
    }
  }
}