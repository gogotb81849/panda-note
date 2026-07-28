import { ExceptionFilter, Catch, ArgumentsHost, Logger } from '@nestjs/common';
import { HttpException } from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const errorResponse = {
      success: false,
      code: status,
      message: typeof exceptionResponse === 'string' 
        ? exceptionResponse 
        : (exceptionResponse as any).message || '服务器内部错误',
      timestamp: new Date().toISOString(),
    };

    this.logger.error(`HTTP Exception: ${status} - ${errorResponse.message}`);

    response.status(status).json(errorResponse);
  }
}