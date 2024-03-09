import { ApiProperty } from '@nestjs/swagger';
import { Schedule } from '@prisma/client';

export class GetSchedulesResponseDto {
  @ApiProperty({
    example: [
      {
        id: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
        entry: '2001-01-01T00:00:00.000Z',
        intervalEntry: '2001-01-01T00:00:00.000Z',
        intervalExit: '2001-01-01T00:00:00.000Z',
        exit: '2001-01-01T00:00:00.000Z',
        hourBalance: 0,
        userId: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
        createdAt: '2001-01-01T00:00:00.000Z',
        updatedAt: '2001-01-01T00:00:00.000Z',
      },
    ],
  })
  schedules: Schedule[];
  @ApiProperty({ example: 1 })
  total: number;
  @ApiProperty({ example: 1 })
  page: number;
  @ApiProperty({ example: 1 })
  pages: number;
}
