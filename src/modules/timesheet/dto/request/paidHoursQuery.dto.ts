import { ApiProperty } from '@nestjs/swagger';

export class PaidHoursQueryDto {
  @ApiProperty({ example: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' })
  userId: string;
  @ApiProperty({ example: 2026 })
  year: number;
}
