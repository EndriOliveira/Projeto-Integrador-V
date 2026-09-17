import { ApiProperty } from '@nestjs/swagger';

export class HolidayResponseDto {
  @ApiProperty({ example: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' })
  id: string;
  @ApiProperty({ example: '2001-01-01T00:00:00.000Z' })
  date: Date;
  @ApiProperty({ example: 'Confraternização Universal' })
  name: string;
  @ApiProperty({ example: '2001-01-01T00:00:00.000Z' })
  createdAt: Date;
}
