import { ApiProperty } from '@nestjs/swagger';

export class ReportQueryDto {
  @ApiProperty({ example: '01/01/2001', description: 'Início do período' })
  rangeStart: string;
  @ApiProperty({ example: '01/31/2001', description: 'Fim do período' })
  rangeEnd: string;
  @ApiProperty({
    required: false,
    description:
      'Restringe o relatório a um único funcionário. Se omitido, RH gera para todos e Gestor para sua equipe.',
  })
  userId?: string;
}
