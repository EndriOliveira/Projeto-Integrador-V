import { ApiProperty } from '@nestjs/swagger';

export class WorkDayQueryDto {
  @ApiProperty({ example: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' })
  userId: string;
  @ApiProperty({ example: 2026 })
  year: number;
  @ApiProperty({
    example: 2,
    description: 'Mês de ciclo (2 = JAN/FEV, de 21/01 a 20/02)',
  })
  month: number;
}
