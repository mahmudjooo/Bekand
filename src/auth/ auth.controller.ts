import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guard/jwt-auth.guard';
import { ChangePasswordDto } from './dto/change-password.dto';
import type { Response } from 'express';
import type { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private service: AuthService) {}

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, user } = await this.service.login(
      dto.email,
      dto.password,
    );

    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('rt', refreshToken, {
      httpOnly: true,
      secure: isProd, // dev: false, prod/ngrok: true
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { access_token: accessToken, user };
  }

  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rt = req.cookies?.rt;
    if (!rt) return { access_token: null };

    const { accessToken, refreshToken, user } = await this.service.refresh(rt);

    // yangi RT cookie (rotatsiya)
    res.cookie('rt', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { access_token: accessToken, user };
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
  @Post('logout')
  async logout(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    res.clearCookie('rt');
    await this.service.logout(req.user.sub);
    return { message: 'Logged out' };
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
