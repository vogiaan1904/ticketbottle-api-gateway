import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { AppConfigService } from '@services/config.service';
import { LoggerService } from '@services/logger.service';
import { Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly configService: AppConfigService,
    private readonly loggerService: LoggerService,
  ) {}
  catch(exception: HttpException | Error, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const message =
      exception instanceof HttpException ? exception.message : 'Internal server error';

    // Extract only the stack trace (without error message)
    const stackOnly =
      exception instanceof Error && exception.stack
        ? // ? exception.stack.split('\n').slice(1).join('\n') // Remove first line (error message)
          exception.stack
        : undefined;

    this.loggerService.error(message, stackOnly);

    // console.log(exception);

    GlobalExceptionFilter.handleResponse(response, exception);
  }

  private static handleResponse(response: Response, exception: HttpException | Error): void {
    let responseBody: any = { message: 'Internal server error' };
    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;

    if (exception instanceof HttpException) {
      responseBody = exception.getResponse();
      statusCode = exception.getStatus();
    } else if (exception instanceof Error) {
      responseBody = {
        statusCode: statusCode,
        message: exception.stack,
      };
    }

    response.status(statusCode).json(responseBody);
  }
}
