import { ApiProperty } from '@nestjs/swagger';

export class DeleteTimeEntryDto {
  @ApiProperty({
    description: 'Motivo da exclusão manual, para fins de auditoria',
    example: 'Marcação duplicada por falha do aplicativo',
  })
  reason: string;
}
