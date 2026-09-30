import { Logger } from '@nestjs/common';
import { User } from '@prisma/client';
import { PushTokenDto } from './dto/request/pushToken.dto';
import { NotificationListResponseDto } from './dto/response/notification.response.dto';
import { sendPushToUsers } from './expoPush.service';
import notificationRepository from './notification.repository';
import { validatePushToken } from './schemas/pushToken.schema';

export const NotificationType = {
  APPROVAL_REQUESTED: 'APPROVAL_REQUESTED',
  APPROVAL_APPROVED: 'APPROVAL_APPROVED',
  APPROVAL_REJECTED: 'APPROVAL_REJECTED',
} as const;

type NotifyData = {
  type: string;
  title: string;
  message: string;
  timeEntryId?: string;
};

// Grava o aviso para cada destinatário (sino no web) e dispara o push no celular.
// O push não é aguardado: a resposta da API não depende do serviço do Expo.
const notifyUsers = async (
  userIds: string[],
  data: NotifyData,
): Promise<void> => {
  const uniqueIds = [...new Set(userIds)];
  if (uniqueIds.length === 0) return;

  await notificationRepository.createNotifications(
    uniqueIds.map((userId) => ({ userId, ...data })),
  );
  void sendPushToUsers(uniqueIds, {
    title: data.title,
    body: data.message,
    data: { type: data.type, timeEntryId: data.timeEntryId },
  });
  Logger.log(
    `Notification ${data.type} sent to ${uniqueIds.length} user(s)`,
    'notifyUsers',
  );
};

const listNotifications = async (
  user: User,
  unreadOnly: boolean,
): Promise<NotificationListResponseDto> => {
  const [notifications, unreadCount] = await Promise.all([
    notificationRepository.listNotifications(user.id, 30, unreadOnly),
    notificationRepository.countUnread(user.id),
  ]);
  return { notifications, unreadCount };
};

const markAsRead = async (user: User, id?: string): Promise<void> => {
  await notificationRepository.markAsRead(user.id, id);
};

const clearApprovalRequests = async (timeEntryId: string): Promise<void> => {
  await notificationRepository.markTypeAsReadForTimeEntry(
    timeEntryId,
    NotificationType.APPROVAL_REQUESTED,
  );
};

const registerPushToken = async (
  user: User,
  pushTokenDto: PushTokenDto,
): Promise<void> => {
  validatePushToken(pushTokenDto);
  await notificationRepository.upsertPushToken(user.id, pushTokenDto.token);
  Logger.log(`Push token registered for user ${user.id}`, 'registerPushToken');
};

const removePushToken = async (
  user: User,
  pushTokenDto: PushTokenDto,
): Promise<void> => {
  validatePushToken(pushTokenDto);
  await notificationRepository.deletePushTokens([pushTokenDto.token], user.id);
};

const notificationService = {
  notifyUsers,
  listNotifications,
  markAsRead,
  clearApprovalRequests,
  registerPushToken,
  removePushToken,
};

export default notificationService;
