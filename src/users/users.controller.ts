import { Body, Controller, Post } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('auth')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('register')
  register(@Body() payload: Record<string, unknown>) {
    return this.usersService.register(payload);
  }

  @Post('verify')
  verify(@Body() payload: Record<string, unknown>) {
    return this.usersService.verifyOtp(payload);
  }
}
