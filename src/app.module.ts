import { GlobalExceptionFilter } from '@filters/global-exception.filter';
import { ResponseInterceptor } from '@interceptors/response.interceptor';
import { TransformInterceptor } from '@interceptors/transfrom.interceptor';
import { LoggerMiddleware } from '@middlewares/logging.middleware';
import {
  ClassSerializerInterceptor,
  MiddlewareConsumer,
  Module,
  RequestMethod,
} from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { SharedModule } from './shared.module';
import { EventsModule } from './modules/events/events.module';

@Module({
  imports: [SharedModule, AuthModule, UsersModule, EventsModule],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes({ path: '*path', method: RequestMethod.ALL });
  }
}
