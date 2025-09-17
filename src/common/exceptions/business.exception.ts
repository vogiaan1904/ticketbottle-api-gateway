import { ErrorCode, ErrorCodeEnum } from '@constants/error-code.constant';
import { HttpException } from '@nestjs/common';

export class BusinessException extends HttpException {
  constructor(code: ErrorCodeEnum) {
    const [message, status] = ErrorCode[code];
    super(HttpException.createBody({ code, message }), status);
  }
}
