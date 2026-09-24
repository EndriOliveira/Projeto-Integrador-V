import { ApiProperty } from '@nestjs/swagger';

export class UpsertPaidHoursDto {
  @ApiProperty({ example: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' })
  userId: string;
  @ApiProperty({ example: 2026 })
  year: number;
  @ApiProperty({ example: 2, description: 'Mês de ciclo (1 = DEZ/JAN)' })
  month: number;
  @ApiProperty({ example: 0, description: 'Horas pagas a 60%, em minutos' })
  paid60Minutes: number;
  @ApiProperty({ example: 0, description: 'Horas pagas a 70%, em minutos' })
  paid70Minutes: number;
  @ApiProperty({
    example: 1080,
    description: 'Horas pagas a 100%, em minutos',
  })
  paid100Minutes: number;
  @ApiProperty({ example: true, description: 'Bloqueia o mês para edição' })
  locked: boolean;
}
