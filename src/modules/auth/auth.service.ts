import { CreateUserRequest, USER_SERVICE_NAME, UserServiceClient } from '@/protogen/user.pb';
import { ErrorCodeEnum } from '@/shared/constants/error-code.constant';
import { RefreshTokenData, TokenPair, TokenPayload } from '@/shared/interfaces/token.interface';
import { AppConfigService } from '@/shared/services/config.service';
import { BadRequestException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { SignupDto } from './dto/signup.dto';
import { ErrorCodeEnum as UserErrorCodeEnum } from '@/shared/microservices/users/error-code.constants';
import * as argon2 from 'argon2';
import { convertToMilliseconds, convertToSeconds } from '@/shared/utils/time.util';
import { randomBytes } from 'crypto';
import Redis from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { SigninDto } from './dto/signin.dto';

@Injectable()
export class AuthService {
  private userService: UserServiceClient;
  private readonly accessTokenExpiry: number;
  private readonly refreshTokenExpiry: number;

  constructor(
    @Inject(USER_SERVICE_NAME) private userServiceClient: ClientGrpc,
    private readonly configService: AppConfigService,
    private readonly jwtService: JwtService,
    @InjectRedis() private readonly redis: Redis,
  ) {
    this.accessTokenExpiry = convertToSeconds(this.configService.appConfig.jwtAccessExpiration);
    this.refreshTokenExpiry = convertToSeconds(this.configService.appConfig.jwtRefreshExpiration);
  }

  public onModuleInit(): void {
    this.userService = this.userServiceClient.getService<UserServiceClient>(USER_SERVICE_NAME);
  }

  private hashData(data: string) {
    return argon2.hash(data);
  }

  private generateSecureToken(): string {
    return randomBytes(32).toString('hex');
  }

  private getRefreshTokenKey(token: string): string {
    return `refresh_token:${token}`;
  }

  private getUserTokensKey(userId: string): string {
    return `user_tokens:${userId}`;
  }

  private getTokenVersionKey(userId: string): string {
    return `token_version:${userId}`;
  }

  private async getTokenVersion(userId: string): Promise<number> {
    const version = await this.redis.get(this.getTokenVersionKey(userId));
    return version ? parseInt(version) : 0;
  }

  async generateTokenPair(userId: string, email: string): Promise<TokenPair> {
    const payload: TokenPayload = {
      sub: userId,
      email,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.generateSecureToken();

    const refreshTokenData: RefreshTokenData = {
      userId,
      email,
      tokenVersion: await this.getTokenVersion(userId),
      createdAt: Date.now(),
    };

    const refreshKey = this.getRefreshTokenKey(refreshToken);
    const userTokensKey = this.getUserTokensKey(userId);

    const multi = this.redis.multi();
    multi.setex(refreshKey, this.refreshTokenExpiry, JSON.stringify(refreshTokenData));

    multi.sadd(userTokensKey, refreshToken);
    multi.expire(userTokensKey, this.refreshTokenExpiry);

    await multi.exec();

    return {
      accessToken,
      refreshToken,
      expiresIn: this.accessTokenExpiry,
    };
  }

  async validate(token: string): Promise<TokenPayload> {
    var decoded: TokenPayload;
    try {
      decoded = await this.jwtService.verifyAsync(token);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException(ErrorCodeEnum.TokenExpired);
      }
      throw new UnauthorizedException(ErrorCodeEnum.InvalidToken);
    }

    try {
      await firstValueFrom(this.userService.findOne({ id: decoded.sub }));
    } catch (error) {
      if (error.code === UserErrorCodeEnum.UserNotFound) {
        throw new UnauthorizedException(ErrorCodeEnum.InvalidToken);
      }
      throw error;
    }

    return decoded;
  }

  async signup(dto: SignupDto): Promise<TokenPair> {
    const { email, firstName, lastName, password } = dto;
    const findOneResp = await firstValueFrom(this.userService.findOne({ email }));
    if (findOneResp.user != null) {
      throw new BadRequestException(ErrorCodeEnum.UserAlreadyExists);
    }

    const hashed = await this.hashData(password);
    const req: CreateUserRequest = {
      email: email,
      password: hashed,
      firstName: firstName,
      lastName: lastName,
      avatar: '',
    };

    const createResp = await firstValueFrom(this.userService.create(req));

    const tokens = await this.generateTokenPair(createResp.user.id, email);
    return tokens;
  }

  async signin(dto: SigninDto): Promise<TokenPair> {
    const { email, password } = dto;

    const findOneResp = await firstValueFrom(this.userService.findOne({ email }));
    if (findOneResp.user == null) {
      throw new BadRequestException(ErrorCodeEnum.InvalidCredentials);
    }

    const isValidPassword = await argon2.verify(findOneResp.user.password, password);
    if (!isValidPassword) {
      throw new BadRequestException(ErrorCodeEnum.InvalidCredentials);
    }

    const tokens = await this.generateTokenPair(findOneResp.user.id, email);
    return tokens;
  }

  async refreshAccessToken(refreshToken: string): Promise<TokenPair> {
    const refreshKey = this.getRefreshTokenKey(refreshToken);
    const tokenDataStr = await this.redis.get(refreshKey);
    if (!tokenDataStr) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    let tokenData: RefreshTokenData;
    try {
      tokenData = JSON.parse(tokenDataStr);
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token format');
    }

    const currentVersion = await this.getTokenVersion(tokenData.userId);
    if (tokenData.tokenVersion !== currentVersion) {
      await this.invalidateRefreshToken(refreshToken);
      throw new UnauthorizedException('Token has been revoked');
    }

    const maxAge = convertToMilliseconds(this.configService.appConfig.jwtRefreshSlidingWindow);
    if (Date.now() - tokenData.createdAt > maxAge) {
      await this.invalidateRefreshToken(refreshToken);
      return this.generateTokenPair(tokenData.userId, tokenData.email);
    }

    const payload: TokenPayload = {
      sub: tokenData.userId,
      email: tokenData.email,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.accessTokenExpiry,
    };
  }

  async invalidateRefreshToken(refreshToken: string): Promise<void> {
    const refreshKey = this.getRefreshTokenKey(refreshToken);
    const tokenDataStr = await this.redis.get(refreshKey);

    if (tokenDataStr) {
      const tokenData: RefreshTokenData = JSON.parse(tokenDataStr);
      const userTokensKey = this.getUserTokensKey(tokenData.userId);

      const multi = this.redis.multi();
      multi.del(refreshKey);
      multi.srem(userTokensKey, refreshToken);

      await multi.exec();
    }
  }

  async invalidateAllUserTokens(userId: string): Promise<void> {
    const userTokensKey = this.getUserTokensKey(userId);
    const refreshTokens = await this.redis.smembers(userTokensKey);

    if (refreshTokens.length > 0) {
      const multi = this.redis.multi();

      // Delete all refresh token data
      refreshTokens.forEach((token) => {
        multi.del(this.getRefreshTokenKey(token));
      });

      // Delete user tokens set
      multi.del(userTokensKey);

      // Increment token version to invalidate any cached tokens
      multi.incr(this.getTokenVersionKey(userId));

      await multi.exec();
    }
  }
}
