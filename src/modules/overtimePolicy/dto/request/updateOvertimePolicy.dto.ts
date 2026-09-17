import { ApiProperty } from '@nestjs/swagger';

export class UpdateOvertimePolicyDto {
  @ApiProperty({
    example: 0.5,
    description: 'Percentual de adicional (0.5 = 50%)',
  })
  percentage?: number;
  @ApiProperty({ example: true })
  active?: boolean;
}
