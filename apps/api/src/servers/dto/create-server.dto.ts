import { IsString, IsNumber, IsUUID, IsOptional, MinLength, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateServerDto {
  @ApiProperty({
    description: 'Server name',
    example: 'My Minecraft Server',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({
    description: 'Server description',
    example: 'A survival server for friends',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Blueprint ID for server template',
    example: 'uuid-here',
  })
  @IsUUID()
  blueprintId!: string;

  @ApiProperty({
    description: 'Node ID where server will be deployed',
    example: 'uuid-here',
  })
  @IsUUID()
  nodeId!: string;

  @ApiProperty({
    description: 'CPU limit in millicores (1000 = 1 core)',
    example: 2000,
    minimum: 100,
  })
  @IsNumber()
  @Min(100)
  cpuLimitMillicores!: number;

  @ApiProperty({
    description: 'Memory limit in MB',
    example: 2048,
    minimum: 256,
  })
  @IsNumber()
  @Min(256)
  memLimitMb!: number;

  @ApiProperty({
    description: 'Disk limit in GB',
    example: 10,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  diskGb!: number;
}
