import { ApiProperty } from '@nestjs/swagger';

export class PaidHoursResponseDto {
  @ApiProperty({ example: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' })
  id: string;
  @ApiProperty({ example: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' })
  userId: string;
  @ApiProperty({ example: 2026 })
  year: number;
  @ApiProperty({ example: 2 })
  month: number;
  @ApiProperty({ example: 0 })
  paid60Minutes: number;
  @ApiProperty({ example: 0 })
  paid70Minutes: number;
  @ApiProperty({ example: 1080 })
  paid100Minutes: number;
  @ApiProperty({ example: true })
  locked: boolean;
  @ApiProperty({ example: '2001-01-01T00:00:00.000Z' })
  createdAt: Date;
  @ApiProperty({ example: '2001-01-01T00:00:00.000Z' })
  updatedAt: Date;
}
