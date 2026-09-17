import { ApiProperty } from '@nestjs/swagger';
import { DayType } from '@prisma/client';

export class OvertimePolicyResponseDto {
  @ApiProperty({ example: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' })
  id: string;
  @ApiProperty({ enum: DayType, example: DayType.WEEKDAY })
  dayType: DayType;
  @ApiProperty({ example: 0.5 })
  percentage: number;
  @ApiProperty({ example: true })
  active: boolean;
  @ApiProperty({ example: '2001-01-01T00:00:00.000Z' })
  updatedAt: Date;
}
