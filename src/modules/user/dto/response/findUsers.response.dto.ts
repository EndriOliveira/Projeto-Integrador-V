import { ApiProperty } from '@nestjs/swagger';
import { User } from '@prisma/client';

export class FindUsersResponseDto {
  @ApiProperty({
    example: [
      {
        id: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
        name: 'John Doe',
        cpf: '99999999999',
        phone: '999999999',
        email: 'john.doe@email.com',
        birthDate: '2001-01-01T00:00:00.000Z',
        department: 'Developer',
        isHumanResources: false,
        createdAt: '2001-01-01T00:00:00.000Z',
        updatedAt: '2001-01-01T00:00:00.000Z',
      },
    ],
  })
  users: User[];
  @ApiProperty({ example: 1 })
  total: number;
  @ApiProperty({ example: 1 })
  page: number;
  @ApiProperty({ example: 1 })
  pages: number;
}
