import { ApiProperty } from '@nestjs/swagger';
import { PunchType } from '@prisma/client';

export class CreateManualTimeEntryDto {
  @ApiProperty({ enum: PunchType })
  type: PunchType;
  @ApiProperty({
    description: 'Data e hora da marcação esquecida (ISO 8601)',
    example: '2001-01-01T08:00:00.000-03:00',
  })
  deviceTimestamp: string;
  @ApiProperty({
    description: 'Motivo da marcação manual, para fins de auditoria',
    example: 'Esqueci de bater a entrada',
  })
  reason: string;
}
