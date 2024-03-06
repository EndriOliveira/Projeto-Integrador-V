import { ApiProperty } from '@nestjs/swagger';

export class CreateScheduleResponseDto {
  @ApiProperty({ example: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' })
  id: string;
  @ApiProperty({ example: '2001-01-01T00:00:00.000Z' })
  entry: Date;
  @ApiProperty({ example: '2001-01-01T00:00:00.000Z' })
  exit: Date;
  @ApiProperty({ example: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' })
  userId: string;
  @ApiProperty({ example: '2001-01-01T00:00:00.000Z' })
  createdAt: Date;
  @ApiProperty({ example: '2001-01-01T00:00:00.000Z' })
  updatedAt: Date;
}
