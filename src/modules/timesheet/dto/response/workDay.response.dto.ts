import { ApiProperty } from '@nestjs/swagger';
import { HazardType } from '@prisma/client';

export class WorkDayResponseDto {
  @ApiProperty({ example: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' })
  id: string;
  @ApiProperty({ example: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' })
  userId: string;
  @ApiProperty({ example: '2026-02-03T00:00:00.000Z' })
  date: Date;
  @ApiProperty({ example: 'SIEMENS', nullable: true })
  client: string | null;
  @ApiProperty({ example: 'PROJETO PIRAQUE - LOTE 3', nullable: true })
  project: string | null;
  @ApiProperty({ enum: HazardType, nullable: true })
  hazardType: HazardType | null;
  @ApiProperty({ example: false })
  rdoPending: boolean;
  @ApiProperty({ example: '2001-01-01T00:00:00.000Z' })
  createdAt: Date;
  @ApiProperty({ example: '2001-01-01T00:00:00.000Z' })
  updatedAt: Date;
}
