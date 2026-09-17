import { ApiProperty } from '@nestjs/swagger';

export class SyncTimeEntryResultDto {
  @ApiProperty()
  clientGeneratedId: string;
  @ApiProperty({ enum: ['created', 'duplicate', 'error'] })
  status: 'created' | 'duplicate' | 'error';
  @ApiProperty({ required: false })
  id?: string;
  @ApiProperty({ required: false })
  message?: string;
}

export class SyncTimeEntriesResponseDto {
  @ApiProperty({ type: [SyncTimeEntryResultDto] })
  results: SyncTimeEntryResultDto[];
}
