import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PowerActionDto {
  @ApiProperty({
    description: 'Power action to perform',
    enum: ['start', 'stop', 'restart', 'kill'],
    example: 'start',
  })
  @IsEnum(['start', 'stop', 'restart', 'kill'])
  action: 'start' | 'stop' | 'restart' | 'kill';
}
