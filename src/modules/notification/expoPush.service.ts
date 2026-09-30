import { Logger } from '@nestjs/common';
import notificationRepository from './notification.repository';

// Envio pelo serviço de push do Expo (sem credencial no servidor: o Expo repassa
// ao FCM/APNs com as credenciais cadastradas no projeto EAS do app).
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
// Limite do Expo por requisição.
const CHUNK_SIZE = 100;

type PushMessage = {
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

type ExpoTicket = {
  status: 'ok' | 'error';
  message?: string;
  details?: { error?: string };
};

// Best-effort: nunca lança. Falha de push não pode desfazer a marcação nem a aprovação.
export const sendPushToUsers = async (
  userIds: string[],
  message: PushMessage,
): Promise<void> => {
  try {
    const pushTokens = await notificationRepository.getPushTokens(userIds);
    const tokens = pushTokens.map((pushToken) => pushToken.token);

    for (let i = 0; i < tokens.length; i += CHUNK_SIZE) {
      const chunk = tokens.slice(i, i + CHUNK_SIZE);
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          chunk.map((to) => ({
            to,
            title: message.title,
            body: message.body,
            data: message.data,
            sound: 'default',
            priority: 'high',
            channelId: 'default',
          })),
        ),
      });
      if (!response.ok) {
        Logger.error(`Expo push HTTP ${response.status}`, 'sendPushToUsers');
        continue;
      }

      // Aparelho desinstalou o app ou revogou a permissão: descarta o token.
      const { data: tickets } = (await response.json()) as {
        data: ExpoTicket[];
      };
      const invalidTokens = chunk.filter(
        (_, index) =>
          tickets?.[index]?.details?.error === 'DeviceNotRegistered',
      );
      await notificationRepository.deletePushTokens(invalidTokens);
      tickets
        ?.filter((ticket) => ticket.status === 'error')
        .forEach((ticket) => Logger.error(ticket.message, 'sendPushToUsers'));
    }
  } catch (error) {
    Logger.error(error.message, 'sendPushToUsers');
  }
};
