import { ApiProperty } from '@nestjs/swagger';

export class CreateScheduleDto {
  @ApiProperty({ example: '01/31/2001' })
  entryDate: string;
  @ApiProperty({ example: '00:00' })
  entryTime: string;
  @ApiProperty({ example: '01/31/2001' })
  exitDate: string;
  @ApiProperty({ example: '00:00' })
  exitTime: string;
}
