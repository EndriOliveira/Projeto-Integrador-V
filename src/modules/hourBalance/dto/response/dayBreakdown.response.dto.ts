import { ApiProperty } from '@nestjs/swagger';
import { DayType } from '@prisma/client';
import { OvertimeCategory } from '../../../hourCalculation/hourCalculation.types';

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
  @ApiProperty({
    description: 'Hora extra do dia, que entra no banco do ciclo',
  })
  overtimeMinutes: number;
  @ApiProperty({
    enum: ['H100', 'H60', 'BANK'],
    nullable: true,
    description: 'Saldo para onde vai a hora extra do dia',
  })
  overtimeCategory: OvertimeCategory | null;
  @ApiProperty({ description: 'Horas a menos no dia (falta conta o dia todo)' })
  negativeMinutes: number;
  // Campos mantidos para os apps já instalados: o pagamento agora é por ciclo
  // (ver CycleSummaryResponseDto), então paymentMinutes é sempre 0 no dia.
  @ApiProperty({ example: 0, deprecated: true })
  bankMinutes: number;
  @ApiProperty({ example: 0, deprecated: true })
  paymentMinutes: number;
  @ApiProperty({ example: null, nullable: true, deprecated: true })
  paymentPercentage: number | null;
  @ApiProperty({ description: 'Saldo do ciclo após o dia', example: 0 })
  bankBalanceAfterMinutes: number;
}
