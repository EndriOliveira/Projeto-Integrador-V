import { ApiProperty } from '@nestjs/swagger';

export class CreateCodeDto {
  @ApiProperty()
  userId: string;
  @ApiProperty()
  code: string;
}
