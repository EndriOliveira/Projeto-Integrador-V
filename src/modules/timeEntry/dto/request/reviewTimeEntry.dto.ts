import { ApiProperty } from '@nestjs/swagger';

export class ReviewTimeEntryDto {
  @ApiProperty({ description: 'true aprova, false recusa', example: true })
  approved: boolean;
  @ApiProperty({
    required: false,
    description: 'Observação do aprovador (obrigatória ao recusar)',
    example: 'Não houve expediente neste horário',
  })
  note?: string;
}
