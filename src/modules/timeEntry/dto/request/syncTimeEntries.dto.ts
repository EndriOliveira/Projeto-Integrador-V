import { ApiProperty } from '@nestjs/swagger';
import { SyncTimeEntryItemDto } from './syncTimeEntryItem.dto';

export class SyncTimeEntriesDto {
  @ApiProperty({ type: [SyncTimeEntryItemDto] })
  entries: SyncTimeEntryItemDto[];
}
