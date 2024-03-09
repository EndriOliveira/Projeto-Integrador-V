import { ApiProperty } from '@nestjs/swagger';

export class UpdateScheduleDto {
  @ApiProperty({ example: '00:00' })
  entryTime?: string;
  @ApiProperty({ example: '00:00' })
  intervalEntryTime?: string;
  @ApiProperty({ example: '00:00' })
  intervalExitTime?: string;
  @ApiProperty({ example: '00:00' })
  exitTime?: string;
}
