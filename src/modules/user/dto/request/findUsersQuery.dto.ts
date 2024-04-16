import { ApiProperty } from '@nestjs/swagger';
import { BaseQueryParametersDto } from '../../../../shared/dto/baseQueryParameters.dto';

export class FindUsersQueryDto extends BaseQueryParametersDto {
  @ApiProperty({ required: false, description: 'Search field' })
  search?: string;
  @ApiProperty({
    required: false,
    description: 'Field to be ordered by',
    enum: ['name', 'email', 'createdAt'],
    default: 'name',
  })
  sortBy?: string;
}
