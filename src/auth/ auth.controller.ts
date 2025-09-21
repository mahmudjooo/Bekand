import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guard/jwt-auth.guard';
import { ChangePasswordDto } from './dto/change-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private service: AuthService) {}

  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.service.login(loginDto.email, loginDto.password);
  }
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  changePassword(@Req() req: any, @Body() updateDto: ChangePasswordDto) {
    return this.service.changePassword(
      req.user.sub,
      updateDto.currentPassword,
      updateDto.newPassword,
    );
  }
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: any) {
    return {
      id: req.user.sub,
      email: req.user.email,
      role: req.user.role,
      mustChangePassword: req.user.mustChangePassword,
    };
  }
}
