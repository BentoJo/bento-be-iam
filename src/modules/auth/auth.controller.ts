import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';

@Controller()
export class AuthController {
    @GrpcMethod('AuthService', 'HealthCheck')
    healthCheck() {
        return { status: 'SERVING' };
    }
}
