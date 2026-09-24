import { ApiProperty } from '@nestjs/swagger';

export class AllReportsQueryDto {
  @ApiProperty({ example: 2026 })
  year: number;
  @ApiProperty({
    example: 2,
    description: 'Mês de ciclo da aba de ponto (2 = JAN/FEV, de 21/01 a 20/02)',
  })
  month: number;
}
