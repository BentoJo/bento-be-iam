import { AppModule } from './modules/app.module';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.GRPC,
      options: {
        package: ['session', 'auth', 'user', 'device'],
        protoPath: [
          join(__dirname, '../proto/session.proto'),
          join(__dirname, '../proto/auth.proto'),
          join(__dirname, '../proto/user.proto'),
          join(__dirname, '../proto/device.proto'),
        ],
        url: '0.0.0.0:50052',
        loader: {
          keepCase: true,
          defaults: true,
          longs: String,
        },
      },
    },
  );
  await app.listen();
}
bootstrap();
