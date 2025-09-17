export enum ErrorCodeEnum {
  PermissionDenied,
  TokenExpired,
  InvalidToken,

  UserAlreadyExists,
  InvalidCredentials,
}

export const ErrorCode = Object.freeze<Record<ErrorCodeEnum, [string, number]>>({
  [ErrorCodeEnum.PermissionDenied]: ['Permission denied', 403],

  [ErrorCodeEnum.TokenExpired]: ['Token expired', 401],

  [ErrorCodeEnum.InvalidToken]: ['Invalid token', 401],

  [ErrorCodeEnum.UserAlreadyExists]: ['User already exists', 400],

  [ErrorCodeEnum.InvalidCredentials]: ['Invalid credentials', 400],
});
