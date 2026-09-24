import { ApiProperty } from '@nestjs/swagger';

export class ReportQueryDto {
  @ApiProperty({
    example: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    description: 'Funcionário do relatório',
  })
  userId: string;
  @ApiProperty({ example: 2026 })
  year: number;
  @ApiProperty({
    example: 2,
    description:
      'Mês de ciclo da aba de ponto (2 = JAN/FEV, de 21/01 a 20/02). As abas de banco de horas e horas pagas cobrem o ano inteiro.',
  })
  month: number;
}
