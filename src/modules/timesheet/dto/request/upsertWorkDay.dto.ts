import { ApiProperty } from '@nestjs/swagger';
import { HazardType } from '@prisma/client';

export class UpsertWorkDayDto {
  @ApiProperty({ example: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' })
  userId: string;
  @ApiProperty({ example: '02/03/2026', description: 'Dia (MM/DD/YYYY)' })
  date: string;
  @ApiProperty({ required: false, nullable: true, example: 'SIEMENS' })
  client?: string | null;
  @ApiProperty({
    required: false,
    nullable: true,
    example: 'PROJETO PIRAQUE - LOTE 3',
  })
  project?: string | null;
  @ApiProperty({ required: false, nullable: true, enum: HazardType })
  hazardType?: HazardType | null;
  @ApiProperty({ required: false, example: false })
  rdoPending?: boolean;
}
