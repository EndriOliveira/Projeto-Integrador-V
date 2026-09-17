import { ForbiddenException, Logger, NotFoundException } from '@nestjs/common';
import { Role, User } from '@prisma/client';
import userRepository from '../modules/user/user.repository';

// RH acessa qualquer funcionário; Gestor só quem está vinculado a ele
// (User.managerId); Funcionário só a si mesmo. Usado por timeEntry,
// hourBalance e report para restringir consultas por funcionário.
export const assertCanAccessEmployee = async (
  actingUser: User,
  targetUserId: string,
): Promise<void> => {
  if (actingUser.role === Role.RH) return;
  if (actingUser.id === targetUserId) return;

  if (actingUser.role === Role.GESTOR) {
    const targetUser = await userRepository.getOneUser({ id: targetUserId }, [
      'id',
      'managerId',
    ]);
    if (!targetUser) {
      Logger.error(`User ${targetUserId} not found`, 'assertCanAccessEmployee');
      throw new NotFoundException('Usuário Não Encontrado');
    }
    if (targetUser.managerId === actingUser.id) return;
  }

  Logger.error(
    `User ${actingUser.id} cannot access data from user ${targetUserId}`,
    'assertCanAccessEmployee',
  );
  throw new ForbiddenException('Acesso não permitido a este funcionário');
};
