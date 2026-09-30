import { InternalServerErrorException, Logger } from '@nestjs/common';
import { Notification, PushToken } from '@prisma/client';
import { v4 as uuidV4 } from 'uuid';
import client from '../../database/client';

type CreateNotificationData = {
  userId: string;
  type: string;
  title: string;
  message: string;
  timeEntryId?: string;
};

const createNotifications = async (
  data: CreateNotificationData[],
): Promise<void> => {
  if (data.length === 0) return;
  try {
    await client.notification.createMany({
      data: data.map((item) => ({ id: uuidV4(), ...item })),
    });
  } catch (error) {
    Logger.error(error.message, 'createNotifications');
    throw new InternalServerErrorException('Erro Interno de Servidor');
  }
};

const listNotifications = async (
  userId: string,
  limit: number,
  unreadOnly: boolean,
): Promise<Notification[]> => {
  try {
    return await client.notification.findMany({
      where: { userId, readAt: unreadOnly ? null : undefined },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  } catch (error) {
    Logger.error(error.message, 'listNotifications');
    throw new InternalServerErrorException('Erro Interno de Servidor');
  }
};

const countUnread = async (userId: string): Promise<number> => {
  try {
    return await client.notification.count({
      where: { userId, readAt: null },
    });
  } catch (error) {
    Logger.error(error.message, 'countUnread');
    throw new InternalServerErrorException('Erro Interno de Servidor');
  }
};

// Sem id: marca todas do usuário. O filtro por userId impede marcar as de outro.
const markAsRead = async (userId: string, id?: string): Promise<void> => {
  try {
    await client.notification.updateMany({
      where: { userId, id, readAt: null },
      data: { readAt: new Date() },
    });
  } catch (error) {
    Logger.error(error.message, 'markAsRead');
    throw new InternalServerErrorException('Erro Interno de Servidor');
  }
};

// Quando um aprovador decide, o aviso some do sino dos demais aprovadores.
const markTypeAsReadForTimeEntry = async (
  timeEntryId: string,
  type: string,
): Promise<void> => {
  try {
    await client.notification.updateMany({
      where: { timeEntryId, type, readAt: null },
      data: { readAt: new Date() },
    });
  } catch (error) {
    Logger.error(error.message, 'markTypeAsReadForTimeEntry');
    throw new InternalServerErrorException('Erro Interno de Servidor');
  }
};

// O mesmo aparelho pode trocar de conta: o token passa a ser do último usuário logado.
const upsertPushToken = async (
  userId: string,
  token: string,
): Promise<void> => {
  try {
    await client.pushToken.upsert({
      where: { token },
      create: { id: uuidV4(), userId, token },
      update: { userId },
    });
  } catch (error) {
    Logger.error(error.message, 'upsertPushToken');
    throw new InternalServerErrorException('Erro Interno de Servidor');
  }
};

const deletePushTokens = async (
  tokens: string[],
  userId?: string,
): Promise<void> => {
  if (tokens.length === 0) return;
  try {
    await client.pushToken.deleteMany({
      where: { token: { in: tokens }, userId },
    });
  } catch (error) {
    Logger.error(error.message, 'deletePushTokens');
    throw new InternalServerErrorException('Erro Interno de Servidor');
  }
};

const getPushTokens = async (userIds: string[]): Promise<PushToken[]> => {
  if (userIds.length === 0) return [];
  try {
    return await client.pushToken.findMany({
      where: { userId: { in: userIds } },
    });
  } catch (error) {
    Logger.error(error.message, 'getPushTokens');
    throw new InternalServerErrorException('Erro Interno de Servidor');
  }
};

const notificationRepository = {
  createNotifications,
  listNotifications,
  countUnread,
  markAsRead,
  markTypeAsReadForTimeEntry,
  upsertPushToken,
  deletePushTokens,
  getPushTokens,
};

export default notificationRepository;
