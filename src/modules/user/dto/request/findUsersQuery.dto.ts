import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
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
  @ApiProperty({ required: false, enum: Role })
  role?: Role;
  @ApiProperty({ required: false, description: 'Filtra por status ativo' })
  active?: boolean;
  @ApiProperty({
    required: false,
    description: 'Filtra funcionários vinculados a este gestor',
  })
  managerId?: string;
}
