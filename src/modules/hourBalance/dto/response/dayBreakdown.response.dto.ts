import { ApiProperty } from '@nestjs/swagger';
import { DayType } from '@prisma/client';

export class DayBreakdownResponseDto {
  @ApiProperty({ example: '2001-01-31' })
  date: string;
  @ApiProperty({ enum: DayType, example: DayType.WEEKDAY })
  dayType: DayType;
  @ApiProperty({ example: 480 })
  workedMinutes: number;
  @ApiProperty({ example: 480 })
  expectedMinutes: number;
  @ApiProperty({ example: 0 })
  balanceMinutes: number;
  @ApiProperty({ example: 0 })
  bankMinutes: number;
  @ApiProperty({ example: 0 })
  paymentMinutes: number;
  @ApiProperty({ example: null, nullable: true })
  paymentPercentage: number | null;
  @ApiProperty({ example: 0 })
  bankBalanceAfterMinutes: number;
}
