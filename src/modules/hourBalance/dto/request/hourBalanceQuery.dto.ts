import { ApiProperty } from '@nestjs/swagger';

export class HourBalanceQueryDto {
  @ApiProperty({
    required: false,
    description:
      'Início do período detalhado (o saldo do banco sempre considera o histórico completo)',
    example: '01/01/2001',
  })
  rangeStart?: string;
  @ApiProperty({
    required: false,
    description: 'Fim do período detalhado',
    example: '01/31/2001',
  })
  rangeEnd?: string;
}
