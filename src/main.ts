import { AppModule } from './modules/app.module';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';

async function bootstrap() {
  console.log(__dirname);
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.GRPC,
      options: {
        package: ['user'],
        protoPath: [join(__dirname, '../shared/proto/user.proto')],
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
