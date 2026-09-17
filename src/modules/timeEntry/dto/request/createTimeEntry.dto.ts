import { ApiProperty } from '@nestjs/swagger';
import { PunchType } from '@prisma/client';

export class CreateTimeEntryDto {
  @ApiProperty({
    required: false,
    enum: PunchType,
    description: 'Se omitido, o servidor infere o próximo tipo no ciclo do dia',
  })
  type?: PunchType;
  @ApiProperty({
    required: false,
    description: 'Horário do dispositivo no momento da marcação (ISO 8601)',
    example: '2001-01-01T00:00:00.000Z',
  })
  deviceTimestamp?: string;
  @ApiProperty({
    required: false,
    description: 'Id único gerado pelo app para evitar duplicidade',
  })
  clientGeneratedId?: string;
  @ApiProperty({ required: false, example: -23.55052 })
  latitude?: number;
  @ApiProperty({ required: false, example: -46.633308 })
  longitude?: number;
  @ApiProperty({ required: false, example: '2001-01-01T00:00:00.000Z' })
  locationCapturedAt?: string;
}
