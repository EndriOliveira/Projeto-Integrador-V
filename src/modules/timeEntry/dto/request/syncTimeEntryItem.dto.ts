import { ApiProperty } from '@nestjs/swagger';
import { PunchType } from '@prisma/client';

export class SyncTimeEntryItemDto {
  @ApiProperty({ description: 'Id único gerado pelo app (idempotência)' })
  clientGeneratedId: string;
  @ApiProperty({ enum: PunchType })
  type: PunchType;
  @ApiProperty({
    description: 'Horário do dispositivo no momento da marcação (ISO 8601)',
    example: '2001-01-01T00:00:00.000Z',
  })
  deviceTimestamp: string;
  @ApiProperty({ required: false, example: -23.55052 })
  latitude?: number;
  @ApiProperty({ required: false, example: -46.633308 })
  longitude?: number;
  @ApiProperty({ required: false, example: '2001-01-01T00:00:00.000Z' })
  locationCapturedAt?: string;
}
