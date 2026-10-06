import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { buildUser } from '../../test/factories';
import userRepository from '../modules/user/user.repository';
import { assertCanAccessEmployee } from './access-control';

jest.mock('../modules/user/user.repository', () => ({
  __esModule: true,
  default: { getOneUser: jest.fn() },
}));

const userRepo = jest.mocked(userRepository);

describe('assertCanAccessEmployee', () => {
  const rh = buildUser({ id: 'rh-1', role: Role.RH });
  const gestor = buildUser({ id: 'gestor-1', role: Role.GESTOR });
  const funcionario = buildUser({ id: 'func-1', role: Role.FUNCIONARIO });

  beforeEach(() => jest.resetAllMocks());

  it('deve permitir quando quem acessa é RH', async () => {
    // Act / Assert
    await expect(
      assertCanAccessEmployee(rh, 'qualquer'),
    ).resolves.toBeUndefined();
    expect(userRepo.getOneUser).not.toHaveBeenCalled();
  });

  it.each([
    ['funcionário', funcionario],
    ['gestor', gestor],
  ])('deve permitir quando o %s acessa os próprios dados', async (_, user) => {
    // Act / Assert
    await expect(
      assertCanAccessEmployee(user, user.id),
    ).resolves.toBeUndefined();
  });

  it('deve permitir quando o gestor acessa um funcionário vinculado a ele', async () => {
    // Arrange
    userRepo.getOneUser.mockResolvedValue(
      buildUser({ id: 'func-1', managerId: gestor.id }),
    );

    // Act / Assert
    await expect(
      assertCanAccessEmployee(gestor, 'func-1'),
    ).resolves.toBeUndefined();
  });

  it('deve lançar Forbidden quando o gestor acessa funcionário de outra equipe', async () => {
    // Arrange
    userRepo.getOneUser.mockResolvedValue(
      buildUser({ id: 'func-2', managerId: 'outro-gestor' }),
    );

    // Act / Assert
    await expect(assertCanAccessEmployee(gestor, 'func-2')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('deve lançar NotFound quando o gestor acessa um usuário inexistente', async () => {
    // Arrange
    userRepo.getOneUser.mockResolvedValue(null);

    // Act / Assert
    await expect(assertCanAccessEmployee(gestor, 'nao-existe')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('deve lançar Forbidden quando o funcionário acessa dados de outro', async () => {
    // Act / Assert
    await expect(
      assertCanAccessEmployee(funcionario, 'func-2'),
    ).rejects.toThrow(ForbiddenException);
    expect(userRepo.getOneUser).not.toHaveBeenCalled();
  });
});
