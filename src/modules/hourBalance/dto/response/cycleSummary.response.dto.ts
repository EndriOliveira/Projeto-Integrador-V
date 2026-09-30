import { ApiProperty } from '@nestjs/swagger';

// Fechamento de um mês de ciclo (dia 21 ao dia 20). Valores em minutos.
export class CycleSummaryResponseDto {
  @ApiProperty({ example: 2026 })
  year: number;
  @ApiProperty({ description: '1 = DEZ/JAN ... 12 = NOV/DEZ', example: 10 })
  month: number;
  @ApiProperty({ example: '2026-09-21' })
  start: string;
  @ApiProperty({ example: '2026-10-20' })
  end: string;
  @ApiProperty({ description: 'false = ciclo em andamento (valores parciais)' })
  closed: boolean;
  @ApiProperty({ description: 'Extras de domingo/feriado (100%)' })
  overtime100Minutes: number;
  @ApiProperty({ description: 'Extras em dia de campo (60%)' })
  overtime60Minutes: number;
  @ApiProperty({ description: 'Extras só de banco (sem adicional)' })
  overtimeBankMinutes: number;
  @ApiProperty({ description: 'Horas a menos no ciclo (inclui faltas)' })
  negativeMinutes: number;
  @ApiProperty({ description: 'Negativa que veio do ciclo anterior' })
  carriedNegativeInMinutes: number;
  @ApiProperty()
  abated100Minutes: number;
  @ApiProperty()
  abated60Minutes: number;
  @ApiProperty()
  abatedBankMinutes: number;
  @ApiProperty({ description: 'Excedente de 60h pago a 100%' })
  paid100Minutes: number;
  @ApiProperty({ description: 'Excedente de 60h pago a 60%' })
  paid60Minutes: number;
  @ApiProperty({ description: 'Excedente de 60h pago a 70% (só no DEZ/JAN)' })
  paid70Minutes: number;
  @ApiProperty({
    description: 'Horas que ficam presas no banco anual (até 60h)',
  })
  heldMinutes: number;
  @ApiProperty({
    description: 'Negativa sem de onde abater, levada para o próximo ciclo',
  })
  negativeBalanceMinutes: number;
  @ApiProperty({ description: 'Total preso no ano do banco até este ciclo' })
  heldYearMinutes: number;
}
