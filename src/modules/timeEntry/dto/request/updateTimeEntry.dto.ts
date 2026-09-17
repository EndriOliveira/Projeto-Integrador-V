import { ApiProperty } from '@nestjs/swagger';
import { PunchType } from '@prisma/client';

export class UpdateTimeEntryDto {
  @ApiProperty({ required: false, enum: PunchType })
  type?: PunchType;
  @ApiProperty({ required: false, example: '2001-01-01T00:00:00.000Z' })
  deviceTimestamp?: string;
  @ApiProperty({ required: false, example: -23.55052 })
  latitude?: number;
  @ApiProperty({ required: false, example: -46.633308 })
  longitude?: number;
  @ApiProperty({
    description: 'Motivo da alteração manual, para fins de auditoria',
    example: 'Ajuste solicitado pelo funcionário via ticket #123',
  })
  reason: string;
}
