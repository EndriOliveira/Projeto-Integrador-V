import { ApiProperty } from '@nestjs/swagger';
import { TimeEntryResponseDto } from './timeEntry.response.dto';

export class FindTimeEntriesResponseDto {
  @ApiProperty({ type: [TimeEntryResponseDto] })
  timeEntries: TimeEntryResponseDto[];
  @ApiProperty({ example: 1 })
  total: number;
  @ApiProperty({ example: 1 })
  page: number;
  @ApiProperty({ example: 1 })
  pages: number;
}
