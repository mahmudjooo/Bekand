import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'prisma/prisma.service';

type JwtPayload = { sub: string; email: string; role: string };

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const userPass = await bcrypt.compare(password, user.passwordHash);
    if (!userPass) throw new UnauthorizedException('Invalid credentials');
    if (!user.isActive) throw new UnauthorizedException('User is inactive');
    return user;
  }
  private async signTokens(payload: JwtPayload) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN,
      }),
      this.jwt.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
      }),
    ]);
    return { accessToken, refreshToken };
  }

  private async saveRefreshHash(userId: string, rt: string) {
    const hash = await bcrypt.hash(rt, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: hash },
    });
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role as any,
    };
    const { accessToken, refreshToken } = await this.signTokens(payload);

    await this.saveRefreshHash(user.id, refreshToken);

    return {
      accessToken,
      refreshToken, // Controller cookie qilib qo‘yadi
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
    };
  }

  async refresh(rt: string) {
    try {
      const decoded = await this.jwt.verifyAsync<JwtPayload>(rt, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      const user = await this.prisma.user.findUnique({
        where: { id: decoded.sub },
        select: {
          id: true,
          email: true,
          role: true,
          refreshTokenHash: true,
          mustChangePassword: true,
        },
      });
      if (!user || !user.refreshTokenHash) throw new UnauthorizedException();

      const match = await bcrypt.compare(rt, user.refreshTokenHash);
      if (!match) throw new UnauthorizedException();

      // ROTATE (yangi RT beramiz)
      const payload: JwtPayload = {
        sub: user.id,
        email: user.email,
        role: user.role as any,
      };
      const { accessToken, refreshToken } = await this.signTokens(payload);
      await this.saveRefreshHash(user.id, refreshToken);

      return {
        accessToken,
        refreshToken, // Controller cookie’ga qo‘yadi
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
        },
      };
    } catch {
      throw new UnauthorizedException();
    }
  }
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    const userPass = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!userPass)
      throw new BadRequestException('Current password is incorrect');

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, mustChangePassword: false },
    });
    return { message: 'Password changed' };
  }
  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });
    return { message: 'Logged out' };
  }
}
