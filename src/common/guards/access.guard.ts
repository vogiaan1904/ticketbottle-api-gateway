import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { RequestWithUser } from '@/shared/types/request-user.type';
import { AuthService } from '@/modules/auth/auth.service';
import { TokenPayload } from '@/shared/interfaces/token.interface';

@Injectable()
export class AccessGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  public async canActivate(ctx: ExecutionContext): Promise<boolean> | never {
    const request: RequestWithUser = ctx.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    const payload: TokenPayload = await this.authService.validate(token);

    request.user = { id: payload.sub, email: payload.email };
    return true;
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
