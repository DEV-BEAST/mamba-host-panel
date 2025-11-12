import { IsEmail, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InviteMemberDto {
  @ApiProperty({
    description: 'Email address of the user to invite',
    example: 'user@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Role to assign to the member',
    enum: ['admin', 'support', 'member'],
    example: 'member',
  })
  @IsEnum(['admin', 'support', 'member'])
  role: 'admin' | 'support' | 'member';
}
