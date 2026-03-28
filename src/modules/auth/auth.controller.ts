import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { HealthService } from './services/health.service';

@Controller()
export class AuthController {
    constructor(private readonly healthService: HealthService) { }
    @GrpcMethod('AuthService', 'HealthCheck')
    healthCheck() {
        return { status: this.healthService.healthCheck() };
    }
}
