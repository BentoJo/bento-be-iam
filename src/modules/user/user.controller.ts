import { Controller, Get } from '@nestjs/common';
import { TestService } from './services/test.service';

@Controller()
export class UserController {
  constructor(private readonly testService: TestService) {}

  @Get()
  getHello(): string {
    return this.testService.getHello();
  }
}
