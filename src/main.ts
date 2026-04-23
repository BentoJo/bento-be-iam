import 'dotenv/config';
import { AppModule } from './modules/app.module';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';

async function bootstrap() {
  const grpcPort = process.env.GRPC_PORT || '50052';
  const httpPort = process.env.HTTP_PORT || '5001';

  const app = await NestFactory.create(AppModule);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: ['session', 'user', 'auth', 'device'],
      protoPath: [
        join(__dirname, '../src/shared/proto/user.proto'),
        join(__dirname, '../src/shared/proto/auth.proto'),
        join(__dirname, '../src/shared/proto/device.proto'),
        join(__dirname, '../src/shared/proto/session.proto'),
      ],
      url: `0.0.0.0:${grpcPort}`,
      loader: {
        keepCase: true,
        defaults: true,
        longs: String,
      },
    },
  });

  // 3. Start both transports
  await app.startAllMicroservices();
  await app.listen(httpPort);

  console.log(`IAM HTTP server running on port ${httpPort}`);
  console.log(`IAM gRPC microservice running on port ${grpcPort}`);
}
bootstrap();
