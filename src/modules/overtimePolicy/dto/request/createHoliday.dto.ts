import { ApiProperty } from '@nestjs/swagger';

export class CreateHolidayDto {
  @ApiProperty({ example: '01/01/2027', description: 'Data do feriado' })
  date: string;
  @ApiProperty({ example: 'Confraternização Universal' })
  name: string;
}
