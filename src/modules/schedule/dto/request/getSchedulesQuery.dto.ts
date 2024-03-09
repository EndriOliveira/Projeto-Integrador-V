import { ApiProperty } from '@nestjs/swagger';
import { BaseQueryParametersDto } from '../../../../shared/dto/baseQueryParameters.dto';

export class FindSchedulesQueryDto extends BaseQueryParametersDto {
  @ApiProperty({
    required: false,
    description: 'Range start date',
    example: '01/31/2001',
  })
  rangeStart?: Date;
  @ApiProperty({
    required: false,
    description: 'Range end date',
    example: '01/31/2001',
  })
  rangeEnd?: Date;
  @ApiProperty({
    required: false,
    description: 'Field to be ordered by',
    enum: ['createdAt', 'hourBalance'],
    default: 'createdAt',
  })
  sortBy?: string;
}
