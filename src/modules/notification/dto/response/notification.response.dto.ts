import { ApiProperty } from '@nestjs/swagger';

export class NotificationResponseDto {
  @ApiProperty({ example: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' })
  id: string;
  @ApiProperty({ example: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' })
  userId: string;
  @ApiProperty({ example: 'APPROVAL_REQUESTED' })
  type: string;
  @ApiProperty({ example: 'Marcação aguardando aprovação' })
  title: string;
  @ApiProperty({
    example: 'Maria Silva registrou manualmente Entrada em 30/09 às 08:00',
  })
  message: string;
  @ApiProperty({
    example: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    nullable: true,
  })
  timeEntryId: string | null;
  @ApiProperty({ example: '2001-01-01T00:00:00.000Z', nullable: true })
  readAt: Date | null;
  @ApiProperty({ example: '2001-01-01T00:00:00.000Z' })
  createdAt: Date;
}

export class NotificationListResponseDto {
  @ApiProperty({ type: [NotificationResponseDto] })
  notifications: NotificationResponseDto[];
  @ApiProperty({ example: 2 })
  unreadCount: number;
}
