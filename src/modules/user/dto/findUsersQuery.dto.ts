import { ApiProperty } from '@nestjs/swagger';
import { BaseQueryParametersDto } from '../../../shared/dto/baseQueryParameters.dto';

export class FindUsersQueryDto extends BaseQueryParametersDto {
  @ApiProperty({ required: false, description: 'Name of the user' })
  name?: string;
  @ApiProperty({ required: false, description: 'Email of the user' })
  email?: string;
  @ApiProperty({ required: false, description: 'CPF of the user' })
  cpf?: string;
  @ApiProperty({ required: false, description: 'Phone of the user' })
  phone?: string;
  @ApiProperty({ required: false, description: 'Department of the user' })
  department?: string;
  @ApiProperty({
    required: false,
    description: 'Field to be ordered by',
    enum: ['name', 'email', 'cpf', 'createdAt', 'updatedAt'],
    default: 'name',
  })
  sortBy?: string;
}
