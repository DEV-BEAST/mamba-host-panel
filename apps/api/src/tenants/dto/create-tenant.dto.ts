import { IsString, MinLength, MaxLength, Matches, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTenantDto {
  @ApiProperty({
    description: 'Tenant name',
    example: 'Acme Gaming',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({
    description: 'Unique slug for the tenant (auto-generated from name if not provided)',
    example: 'acme-gaming',
    minLength: 2,
    maxLength: 50,
    pattern: '^[a-z0-9-]+$',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug?: string;

  @ApiPropertyOptional({
    description: 'Plan tier for the tenant',
    enum: ['free', 'starter', 'pro', 'enterprise'],
    default: 'free',
  })
  @IsOptional()
  @IsEnum(['free', 'starter', 'pro', 'enterprise'])
  planTier?: 'free' | 'starter' | 'pro' | 'enterprise';
}
