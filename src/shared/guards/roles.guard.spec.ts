import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { buildUser } from '../../../test/factories';
import { RolesGuard } from './roles.guard';

const contextWithUser = (user: unknown): ExecutionContext =>
  ({
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext);

describe('RolesGuard', () => {
  const reflector = new Reflector();
  const guard = new RolesGuard(reflector);
  const requireRoles = (roles: Role[] | undefined) =>
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(roles);

  afterEach(() => jest.restoreAllMocks());

  it('deve liberar quando a rota não exige papel', () => {
    // Arrange
    requireRoles(undefined);

    // Act / Assert
    expect(guard.canActivate(contextWithUser(undefined))).toBe(true);
  });

  it('deve liberar quando o usuário tem um dos papéis exigidos', () => {
    // Arrange
    requireRoles([Role.RH, Role.GESTOR]);

    // Act / Assert
    expect(
      guard.canActivate(contextWithUser(buildUser({ role: Role.GESTOR }))),
    ).toBe(true);
  });

  it('deve bloquear quando o usuário não tem o papel exigido', () => {
    // Arrange
    requireRoles([Role.RH]);

    // Act / Assert
    expect(
      guard.canActivate(contextWithUser(buildUser({ role: Role.FUNCIONARIO }))),
    ).toBe(false);
  });

  it('deve bloquear quando não há usuário autenticado', () => {
    // Arrange
    requireRoles([Role.RH]);

    // Act / Assert
    expect(guard.canActivate(contextWithUser(undefined))).toBe(false);
  });
});
