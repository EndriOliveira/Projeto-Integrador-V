import { ApiProperty } from '@nestjs/swagger';

export class FindSchedulesQueryDto {
  @ApiProperty({
    required: true,
    description: 'Range start date',
    example: '01/31/2001',
  })
  rangeStart: Date;
  @ApiProperty({
    required: true,
    description: 'Range end date',
    example: '01/31/2001',
  })
  rangeEnd: Date;
}
