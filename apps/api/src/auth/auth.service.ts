import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectDrizzle } from '../common/database/database.module';
import type { NodeDatabase } from '@mambaPanel/db';
import { users, refreshTokens, emailVerificationTokens, passwordResetTokens } from '@mambaPanel/db';
import { eq, and, gt } from '@mambaPanel/db';
import { hash, compare } from 'bcrypt';
import {
  generateRefreshToken,
  hashRefreshToken,
  generateTokenFamily,
  createAccessTokenPayload,
  JWT_EXPIRY,
  generateToken,
} from '@mambaPanel/security';

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
  };
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectDrizzle() private readonly db: NodeDatabase,
    private readonly jwtService: JwtService
  ) {}

  async register(email: string, password: string, name?: string) {
    const [existingUser] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    const passwordHash = await hash(password, 10);

    const [user] = await this.db
      .insert(users)
      .values({
        email,
        passwordHash,
        name: name || null,
        role: 'user',
      })
      .returning();

    await this.generateEmailVerificationToken(user.id);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await compare(password, user.passwordHash);

    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { accessToken, refreshToken } = await this.generateTokens(user);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async refresh(token: string): Promise<RefreshResponse> {
    const hashedToken = hashRefreshToken(token);

    const [storedToken] = await this.db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.token, hashedToken),
          gt(refreshTokens.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!storedToken) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (storedToken.used) {
      await this.revokeTokenFamily(storedToken.family);
      throw new UnauthorizedException(
        'Token reuse detected. All tokens in this family have been revoked.'
      );
    }

    if (storedToken.revokedAt) {
      throw new UnauthorizedException('Token has been revoked');
    }

    await this.db
      .update(refreshTokens)
      .set({ used: true })
      .where(eq(refreshTokens.id, storedToken.id));

    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, storedToken.userId))
      .limit(1);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const { accessToken, refreshToken: newRefreshToken } = await this.generateTokens(
      user,
      storedToken.family
    );

    await this.db
      .update(refreshTokens)
      .set({ replacedBy: hashedToken })
      .where(eq(refreshTokens.id, storedToken.id));

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(token: string): Promise<void> {
    const hashedToken = hashRefreshToken(token);

    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.token, hashedToken));
  }

  private async generateTokens(
    user: { id: string; email: string; role: string },
    existingFamily?: string
  ) {
    const accessPayload = createAccessTokenPayload({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    const accessToken = await this.jwtService.signAsync(accessPayload, {
      expiresIn: JWT_EXPIRY.ACCESS_TOKEN,
    });

    const refreshToken = generateRefreshToken();
    const hashedRefreshToken = hashRefreshToken(refreshToken);
    const family = existingFamily || generateTokenFamily();

    await this.db.insert(refreshTokens).values({
      token: hashedRefreshToken,
      userId: user.id,
      family,
      used: false,
      expiresAt: new Date(Date.now() + JWT_EXPIRY.REFRESH_TOKEN * 1000),
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  private async revokeTokenFamily(family: string): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.family, family));
  }

  async generateEmailVerificationToken(userId: string): Promise<string> {
    const token = generateToken(32);

    await this.db.insert(emailVerificationTokens).values({
      userId,
      token,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    return token;
  }

  async verifyEmail(token: string): Promise<void> {
    const [verificationToken] = await this.db
      .select()
      .from(emailVerificationTokens)
      .where(
        and(
          eq(emailVerificationTokens.token, token),
          gt(emailVerificationTokens.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!verificationToken) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    if (verificationToken.verifiedAt) {
      throw new BadRequestException('Email already verified');
    }

    await this.db
      .update(users)
      .set({ emailVerified: new Date() })
      .where(eq(users.id, verificationToken.userId));

    await this.db
      .update(emailVerificationTokens)
      .set({ verifiedAt: new Date() })
      .where(eq(emailVerificationTokens.id, verificationToken.id));
  }

  async generatePasswordResetToken(email: string): Promise<string> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      throw new BadRequestException('If the email exists, a reset link will be sent');
    }

    const token = generateToken(32);

    await this.db.insert(passwordResetTokens).values({
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    return token;
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const [resetToken] = await this.db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.token, token),
          gt(passwordResetTokens.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!resetToken) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (resetToken.usedAt) {
      throw new BadRequestException('Reset token already used');
    }

    const passwordHash = await hash(newPassword, 10);

    await this.db
      .update(users)
      .set({ passwordHash })
      .where(eq(users.id, resetToken.userId));

    await this.db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, resetToken.id));

    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.userId, resetToken.userId));
  }
}
