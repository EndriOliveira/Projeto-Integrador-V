import { ApiProperty } from '@nestjs/swagger';
import { ApprovalAction, ApprovalStatus, PunchType } from '@prisma/client';

export class TimeEntryResponseDto {
  @ApiProperty({ example: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' })
  id: string;
  @ApiProperty({ example: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' })
  userId: string;
  @ApiProperty({ enum: PunchType, example: PunchType.ENTRADA })
  type: PunchType;
  @ApiProperty({ example: '2001-01-01T00:00:00.000Z' })
  deviceTimestamp: Date;
  @ApiProperty({ example: '2001-01-01T00:00:00.000Z' })
  serverReceivedAt: Date;
  @ApiProperty({ example: false })
  originatedOffline: boolean;
  @ApiProperty({ example: -23.55052, nullable: true })
  latitude: number | null;
  @ApiProperty({ example: -46.633308, nullable: true })
  longitude: number | null;
  @ApiProperty({ example: '2001-01-01T00:00:00.000Z', nullable: true })
  locationCapturedAt: Date | null;
  @ApiProperty({
    example: 'Avenida Paulista, 1578 – Bela Vista, São Paulo/SP',
    nullable: true,
  })
  locationAddress: string | null;
  @ApiProperty({ example: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' })
  clientGeneratedId: string;
  @ApiProperty({ example: false })
  editedManually: boolean;
  @ApiProperty({ enum: ApprovalStatus, example: ApprovalStatus.APPROVED })
  approvalStatus: ApprovalStatus;
  @ApiProperty({ enum: ApprovalAction, nullable: true })
  pendingAction: ApprovalAction | null;
  @ApiProperty({ enum: PunchType, nullable: true })
  pendingType: PunchType | null;
  @ApiProperty({ example: '2001-01-01T00:00:00.000Z', nullable: true })
  pendingDeviceTimestamp: Date | null;
  @ApiProperty({ example: 'Esqueci de bater a entrada', nullable: true })
  requestReason: string | null;
  @ApiProperty({ nullable: true })
  reviewedById: string | null;
  @ApiProperty({ example: '2001-01-01T00:00:00.000Z', nullable: true })
  reviewedAt: Date | null;
  @ApiProperty({ nullable: true })
  reviewNote: string | null;
  @ApiProperty({ example: '2001-01-01T00:00:00.000Z' })
  createdAt: Date;
  @ApiProperty({ example: '2001-01-01T00:00:00.000Z' })
  updatedAt: Date;
}
