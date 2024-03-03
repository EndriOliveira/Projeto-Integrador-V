import { ApiProperty } from '@nestjs/swagger';

export class BaseQueryParametersDto {
  @ApiProperty({
    required: true,
    description: 'The page number for pagination',
    default: 1,
  })
  page: number;
  @ApiProperty({
    required: true,
    description: 'Limit of items to be returned in a request',
    default: 10,
  })
  limit: number;
  @ApiProperty({
    required: false,
    enum: ['asc', 'desc'],
    description: 'Order type',
    default: 'desc',
  })
  sortType: string;
}
