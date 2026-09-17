import { ApiProperty } from '@nestjs/swagger';
import { DayBreakdownResponseDto } from './dayBreakdown.response.dto';

export class HourBalanceResponseDto {
  @ApiProperty({
    description:
      'Saldo atual do banco de horas, em minutos (teto de 3600 = 60h)',
    example: 120,
  })
  currentBankBalanceMinutes: number;
  @ApiProperty({
    description: 'Detalhamento dia a dia do período consultado',
    type: [DayBreakdownResponseDto],
  })
  days: DayBreakdownResponseDto[];
}
