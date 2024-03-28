import { ApiProperty } from '@nestjs/swagger';
import { Schedule } from '@prisma/client';
import { CreateUserResponseDto } from '../../../user/dto/response/createUser.response.dto';

export class MeResponseDto extends CreateUserResponseDto {
  @ApiProperty({
    example: {
      id: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      entry: '2001-01-01T00:00:00.000Z',
      intervalEntry: '2001-01-01T00:00:00.000Z',
      intervalExit: '2001-01-01T00:00:00.000Z',
      exit: null,
      createdAt: '2001-01-01T00:00:00.000Z',
      updatedAt: '2001-01-01T00:00:00.000Z',
    },
  })
  schedule: Schedule;
}
