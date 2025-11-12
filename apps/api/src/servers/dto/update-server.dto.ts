import { IsString, IsNumber, IsOptional, MinLength, MaxLength, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateServerDto {
  @ApiPropertyOptional({
    description: 'Server name',
    example: 'My Updated Server',
    minLength: 2,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Server description',
    example: 'Updated description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'CPU limit in millicores',
    example: 3000,
    minimum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(100)
  cpuLimitMillicores?: number;

  @ApiPropertyOptional({
    description: 'Memory limit in MB',
    example: 4096,
    minimum: 256,
  })
  @IsOptional()
  @IsNumber()
  @Min(256)
  memLimitMb?: number;

  @ApiPropertyOptional({
    description: 'Disk limit in GB',
    example: 20,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  diskGb?: number;
}
