import { ApiProperty } from '@nestjs/swagger';
import { PunchType } from '@prisma/client';
import { BaseQueryParametersDto } from '../../../../shared/dto/baseQueryParameters.dto';

export class FindTimeEntriesQueryDto extends BaseQueryParametersDto {
  @ApiProperty({
    required: false,
    description:
      'Funcionário a ser consultado. Se omitido, RH vê todos, Gestor vê sua equipe e Funcionário vê apenas si mesmo.',
  })
  userId?: string;
  @ApiProperty({
    required: false,
    description: 'Início do período (baseado no horário do dispositivo)',
    example: '01/31/2001',
  })
  rangeStart?: string;
  @ApiProperty({
    required: false,
    description: 'Fim do período (baseado no horário do dispositivo)',
    example: '01/31/2001',
  })
  rangeEnd?: string;
  @ApiProperty({ required: false, enum: PunchType })
  type?: PunchType;
}
