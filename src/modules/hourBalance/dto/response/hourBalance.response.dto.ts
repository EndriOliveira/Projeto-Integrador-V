import { ApiProperty } from '@nestjs/swagger';
import { CycleSummaryResponseDto } from './cycleSummary.response.dto';
import { DayBreakdownResponseDto } from './dayBreakdown.response.dto';

export class HourBalanceResponseDto {
  @ApiProperty({
    description:
      'Saldo do ciclo atual, em minutos: extras já abatidas das horas a menos. Negativo quando não houve de onde abater.',
    example: 120,
  })
  currentBankBalanceMinutes: number;
  @ApiProperty({
    description:
      'Horas presas no ano do banco (ciclos já fechados), pagas a 70% no DEZ/JAN',
    example: 3600,
  })
  heldYearMinutes: number;
  @ApiProperty({
    description: 'Ciclo em andamento (valores parciais até o dia 20)',
    type: CycleSummaryResponseDto,
    nullable: true,
  })
  currentCycle: CycleSummaryResponseDto | null;
  @ApiProperty({
    description: 'Ciclos do período consultado (padrão: ano do banco atual)',
    type: [CycleSummaryResponseDto],
  })
  cycles: CycleSummaryResponseDto[];
  @ApiProperty({
    description: 'Detalhamento dia a dia do período consultado',
    type: [DayBreakdownResponseDto],
  })
  days: DayBreakdownResponseDto[];
}
