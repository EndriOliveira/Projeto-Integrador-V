import { ApiProperty } from '@nestjs/swagger';
import { PunchType, TimeEntry } from '@prisma/client';
import { CreateUserResponseDto } from '../../../user/dto/response/createUser.response.dto';

export class MeResponseDto extends CreateUserResponseDto {
  @ApiProperty({
    description: 'Marcações do dia atual do funcionário',
    example: [
      {
        id: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
        type: 'ENTRADA',
        deviceTimestamp: '2001-01-01T00:00:00.000Z',
        serverReceivedAt: '2001-01-01T00:00:00.000Z',
      },
    ],
  })
  todayEntries: TimeEntry[];
  @ApiProperty({
    description: 'Próximo tipo de marcação esperado, seguindo o ciclo diário',
    example: PunchType.ENTRADA,
    enum: PunchType,
  })
  nextExpectedType: PunchType;
}
