import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateMemberRoleDto {
  @ApiProperty({
    description: 'New role for the member',
    enum: ['admin', 'support', 'member'],
    example: 'admin',
  })
  @IsEnum(['admin', 'support', 'member'])
  role!: 'admin' | 'support' | 'member';
}
