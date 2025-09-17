import { Body, Controller, Get, Post, Req, Request, Res, UseGuards } from '@nestjs/common';
import { SignupDto } from './dto/signup.dto';
import { TokenPair, TokenPayload } from '@/shared/interfaces/token.interface';
import { AuthService } from './auth.service';
import { RequestWithUser } from '@/shared/types/request-user.type';
import { SigninDto } from './dto/signin.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AccessGuard } from '@/common/guards/access.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  async signup(@Body() dto: SignupDto): Promise<TokenPair> {
    return this.authService.signup(dto);
  }

  @Post('signin')
  async signin(@Body() dto: SigninDto): Promise<TokenPair> {
    return this.authService.signin(dto);
  }

  @Get('me')
  @UseGuards(AccessGuard)
  async me(@Request() req: any): Promise<TokenPayload> {
    return req.user;
  }

  @Post('refresh')
  async refreshToken(@Body() dto: RefreshTokenDto): Promise<TokenPair> {
    return this.authService.refreshAccessToken(dto.refreshToken);
  }

  @Post('logout')
  @UseGuards(AccessGuard)
  async logout(@Body() dto: RefreshTokenDto): Promise<{ message: string }> {
    await this.authService.invalidateRefreshToken(dto.refreshToken);
    return { message: 'Logged out successfully' };
  }

  @Post('logout-all')
  @UseGuards(AccessGuard)
  async logoutAll(@Request() req): Promise<{ message: string }> {
    await this.authService.invalidateAllUserTokens(req.user.sub);
    return { message: 'Logged out from all devices' };
  }
}
