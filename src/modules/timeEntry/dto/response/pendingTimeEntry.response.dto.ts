import { ApiProperty } from '@nestjs/swagger';
import { TimeEntryResponseDto } from './timeEntry.response.dto';

class PendingTimeEntryUserDto {
  @ApiProperty({ example: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' })
  id: string;
  @ApiProperty({ example: 'Maria Silva' })
  name: string;
  @ApiProperty({ example: 'maria@email.com' })
  email: string;
  @ApiProperty({ example: 'Operações' })
  department: string;
}

export class PendingTimeEntryResponseDto extends TimeEntryResponseDto {
  @ApiProperty({ type: PendingTimeEntryUserDto })
  user: PendingTimeEntryUserDto;
}
