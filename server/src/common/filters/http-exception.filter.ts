import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const excResponse = exception.getResponse();
      const payload =
        typeof excResponse === 'string'
          ? { message: excResponse }
          : (excResponse as Record<string, any>);

      // Standardized response shape
      const body: any = {
        ok: false,
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: req.url,
        error: payload?.error ?? (status === HttpStatus.FORBIDDEN ? 'Forbidden' : undefined),
        message: payload?.message ?? payload,
      };

      // Attach structured fields if provided by guard/exception (e.g. missingPermissions)
      if (payload?.missingPermissions) {
        body.missingPermissions = payload.missingPermissions;
      }
      if (payload?.requiredPermissions) {
        body.requiredPermissions = payload.requiredPermissions;
      }

      res.status(status).json(body);
      return;
    }

    // Non-HTTP exception -> 500
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      ok: false,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      timestamp: new Date().toISOString(),
      path: req.url,
      error: 'Internal Server Error',
      message: (exception as any)?.message ?? 'Unexpected error',
    });
  }
}
