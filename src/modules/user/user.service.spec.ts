import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { buildUser } from '../../../test/factories';
import { encryptPassword } from '../../utils/encryption';
import userRepository from './user.repository';
import userService from './user.service';

jest.mock('./user.repository');
jest.mock('../../utils/encryption');

const repo = jest.mocked(userRepository);

describe('userService', () => {
  const rh = buildUser({ id: 'rh-1', role: Role.RH });
  const gestor = buildUser({ id: 'gestor-1', role: Role.GESTOR });

  beforeEach(() => {
    jest.resetAllMocks();
    jest.mocked(encryptPassword).mockResolvedValue('hash');
    repo.createUser.mockImplementation(async (data) =>
      buildUser({ ...(data as object), id: 'novo' }),
    );
    repo.updateUser.mockImplementation(async (id, data) =>
      buildUser({ ...(data as object), id }),
    );
  });

  describe('createUser', () => {
    const body = {
      name: 'João Pereira',
      cpf: '529.982.247-25',
      phone: '(11) 98888-7777',
      email: 'joao@empresa.com',
      department: 'Campo',
      role: Role.FUNCIONARIO,
      birthDate: '05/10/1995',
    };

    it('deve criar o usuário com CPF/telefone limpos e senha criptografada', async () => {
      // Arrange
      repo.getOneUser.mockResolvedValue(null);

      // Act
      const created = await userService.createUser(body);

      // Assert
      expect(repo.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          cpf: '52998224725',
          phone: '11988887777',
          password: 'hash',
        }),
      );
      expect(created).not.toHaveProperty('password');
    });

    it('deve lançar BadRequest quando o CPF é inválido', async () => {
      // Act / Assert
      await expect(
        userService.createUser({ ...body, cpf: '111.111.111-11' }),
      ).rejects.toThrow(BadRequestException);
      expect(repo.createUser).not.toHaveBeenCalled();
    });

    it('deve lançar Conflict quando CPF ou e-mail já existem', async () => {
      // Arrange
      repo.getOneUser.mockResolvedValue(buildUser());

      // Act / Assert
      await expect(userService.createUser(body)).rejects.toThrow(
        ConflictException,
      );
    });

    it('deve lançar BadRequest quando o e-mail é inválido', async () => {
      // Act / Assert
      await expect(
        userService.createUser({ ...body, email: 'nao-e-email' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve lançar NotFound quando o gestor informado não existe ou está inativo', async () => {
      // Arrange
      repo.getOneUser
        .mockResolvedValueOnce(null) // CPF/e-mail livres
        .mockResolvedValueOnce(
          buildUser({ id: 'g', role: Role.GESTOR, active: false }),
        );

      // Act / Assert
      await expect(
        userService.createUser({ ...body, managerId: 'g' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('deve lançar BadRequest quando o gestor informado tem perfil Funcionário', async () => {
      // Arrange
      repo.getOneUser
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(buildUser({ id: 'f', role: Role.FUNCIONARIO }));

      // Act / Assert
      await expect(
        userService.createUser({ ...body, managerId: 'f' }),
      ).rejects.toThrow('Usuário informado não possui perfil de Gestor ou RH');
    });
  });

  describe('getUserById', () => {
    it('deve devolver o usuário sem a senha', async () => {
      // Arrange
      repo.getOneUser.mockResolvedValue(buildUser());

      // Act
      const user = await userService.getUserById('user-1');

      // Assert
      expect(user.id).toBe('user-1');
      expect(user).not.toHaveProperty('password');
    });

    it('deve lançar NotFound quando o usuário não existe', async () => {
      // Arrange
      repo.getOneUser.mockResolvedValue(null);

      // Act / Assert
      await expect(userService.getUserById('x')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getManagedUsers', () => {
    it('deve filtrar pelos funcionários vinculados ao gestor', async () => {
      // Arrange
      const query = { page: '1', limit: '10' } as never;

      // Act
      await userService.getManagedUsers(gestor, query);

      // Assert
      expect(repo.getUsers).toHaveBeenCalledWith(
        expect.objectContaining({ managerId: gestor.id }),
      );
    });
  });

  describe('editUser', () => {
    const existing = buildUser({
      id: 'user-1',
      cpf: '52998224725',
      name: 'Maria',
    });

    it('deve manter os campos não informados e atualizar os informados', async () => {
      // Arrange
      repo.getOneUser.mockResolvedValue(existing);

      // Act
      await userService.editUser('user-1', { dailyWorkMinutes: 360 });

      // Assert
      expect(repo.updateUser).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          name: 'Maria',
          cpf: '52998224725',
          dailyWorkMinutes: 360,
        }),
      );
    });

    it('deve limpar a data de admissão quando recebe null', async () => {
      // Arrange
      repo.getOneUser.mockResolvedValue(
        buildUser({ admissionDate: new Date('2020-01-01T00:00:00.000Z') }),
      );

      // Act
      await userService.editUser('user-1', { admissionDate: null });

      // Assert
      expect(repo.updateUser).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ admissionDate: null }),
      );
    });

    it('deve lançar Conflict quando o novo CPF já pertence a outro usuário', async () => {
      // Arrange
      repo.getOneUser
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(buildUser({ id: 'outro' }));

      // Act / Assert
      await expect(
        userService.editUser('user-1', { cpf: '168.995.350-09' }),
      ).rejects.toThrow(ConflictException);
    });

    it('deve lançar BadRequest quando o novo CPF é inválido', async () => {
      // Arrange
      repo.getOneUser.mockResolvedValue(existing);

      // Act / Assert
      await expect(
        userService.editUser('user-1', { cpf: '123.456.789-00' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve lançar NotFound quando o usuário não existe', async () => {
      // Arrange
      repo.getOneUser.mockResolvedValue(null);

      // Act / Assert
      await expect(userService.editUser('x', { name: 'Novo' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateManager', () => {
    it('deve vincular o funcionário a um gestor válido', async () => {
      // Arrange
      repo.getOneUser
        .mockResolvedValueOnce(buildUser({ id: 'user-1' }))
        .mockResolvedValueOnce(gestor);

      // Act
      await userService.updateManager('user-1', { managerId: gestor.id });

      // Assert
      expect(repo.updateUser).toHaveBeenCalledWith('user-1', {
        managerId: gestor.id,
      });
    });

    it('deve remover o vínculo quando o gestor é null', async () => {
      // Arrange
      repo.getOneUser.mockResolvedValue(buildUser({ id: 'user-1' }));

      // Act
      await userService.updateManager('user-1', { managerId: null });

      // Assert
      expect(repo.updateUser).toHaveBeenCalledWith('user-1', {
        managerId: null,
      });
    });

    it('deve lançar BadRequest quando o funcionário é gestor de si mesmo', async () => {
      // Arrange
      repo.getOneUser.mockResolvedValue(buildUser({ id: 'user-1' }));

      // Act / Assert
      await expect(
        userService.updateManager('user-1', { managerId: 'user-1' }),
      ).rejects.toThrow('Um funcionário não pode ser gestor de si mesmo');
    });

    it('deve lançar NotFound quando o funcionário não existe', async () => {
      // Arrange
      repo.getOneUser.mockResolvedValue(null);

      // Act / Assert
      await expect(
        userService.updateManager('x', { managerId: null }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('inactivateUser', () => {
    it('deve inativar o usuário', async () => {
      // Arrange
      repo.getOneUser.mockResolvedValue(buildUser({ id: 'user-1' }));

      // Act
      await userService.inactivateUser('user-1', rh);

      // Assert
      expect(repo.updateUser).toHaveBeenCalledWith('user-1', { active: false });
    });

    it('deve lançar BadRequest quando o RH tenta inativar a si mesmo', async () => {
      // Act / Assert
      await expect(userService.inactivateUser(rh.id, rh)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve lançar NotFound quando o usuário não existe', async () => {
      // Arrange
      repo.getOneUser.mockResolvedValue(null);

      // Act / Assert
      await expect(userService.inactivateUser('x', rh)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
