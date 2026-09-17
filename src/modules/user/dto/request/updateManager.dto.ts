import { ApiProperty } from '@nestjs/swagger';

export class UpdateManagerDto {
  @ApiProperty({
    description:
      'Id do gestor a ser vinculado ao funcionário. Envie null para desvincular.',
    example: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    nullable: true,
  })
  managerId: string | null;
}
