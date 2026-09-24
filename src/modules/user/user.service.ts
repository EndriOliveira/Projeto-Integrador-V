import {
  BadRequestException,
  ConflictException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Role, User } from '@prisma/client';
import * as dayjs from 'dayjs';
import { newUserTemplate } from 'src/templates/newUser.template';
import { generateRandomCode } from 'src/utils/generateRandomCode';
import { encryptPassword } from '../../utils/encryption';
import { parseDateOnly } from '../../utils/parseDateOnly';
import { removeNonNumbersCharacters } from '../../utils/removeNonNumbersCharacters';
import { validateCPF } from '../../utils/validateCpf';
// import { sendMail } from '../sendGrid/sendGrid.service';
import { CreateUserDto } from './dto/request/createUser.dto';
import { FindUsersQueryDto } from './dto/request/findUsersQuery.dto';
import { UpdateManagerDto } from './dto/request/updateManager.dto';
import { UpdateUserDto } from './dto/request/updateUserDto';
import { CreateUserResponseDto } from './dto/response/createUser.response.dto';
import { FindUserResponseDto } from './dto/response/findUser.response.dto';
import { FindUsersResponseDto } from './dto/response/findUsers.response.dto';
import { UpdateUserResponseDto } from './dto/response/updateUser.response.dto';
import { validateCreateUser } from './schema/createUser.schema';
import { validateGetUsers } from './schema/getUsers.schema';
import { validateUpdateManager } from './schema/updateManager.schema';
import { validateUpdateUser } from './schema/updateUser.schema';
import userRepository from './user.repository';

const getUserById = async (id: string): Promise<FindUserResponseDto> => {
  Logger.log(`Searching for user with id: ${id}`, 'getUserById');
  const user = await userRepository.getOneUser({ id });
  if (!user) {
    Logger.error(`User ${id} not found`, 'getUserById');
    throw new NotFoundException('Usuário Não Encontrado');
  }

  delete user.password;
  Logger.log(`User found`, 'getUserById');
  return user;
};

const assertManagerIsValid = async (managerId: string): Promise<void> => {
  const manager = await userRepository.getOneUser({ id: managerId }, [
    'id',
    'role',
    'active',
  ]);
  if (!manager || !manager.active) {
    Logger.error(`Manager ${managerId} not found`, 'assertManagerIsValid');
    throw new NotFoundException('Gestor Não Encontrado');
  }
  if (manager.role !== Role.GESTOR && manager.role !== Role.RH) {
    Logger.error(`User ${managerId} is not a manager`, 'assertManagerIsValid');
    throw new BadRequestException(
      'Usuário informado não possui perfil de Gestor ou RH',
    );
  }
};

const getUsers = async (
  query: FindUsersQueryDto,
): Promise<FindUsersResponseDto> => {
  Logger.log(`Searching for users`, 'getUsers');
  validateGetUsers(query);

  const users = await userRepository.getUsers(query);
  Logger.log(`Users found`, 'getUsers');
  return users;
};

const getManagedUsers = async (
  manager: User,
  query: FindUsersQueryDto,
): Promise<FindUsersResponseDto> => {
  Logger.log(`Searching for users managed by ${manager.id}`, 'getManagedUsers');
  validateGetUsers(query);

  const users = await userRepository.getUsers({
    ...query,
    managerId: manager.id,
  });
  Logger.log(`Managed users found`, 'getManagedUsers');
  return users;
};

const editUser = async (
  userId: string,
  updateUserDto: UpdateUserDto,
): Promise<UpdateUserResponseDto> => {
  Logger.log(`Editing user with id: ${userId}`, 'editUser');
  validateUpdateUser(updateUserDto);

  const { cpf, name, phone } = updateUserDto;
  const user = await userRepository.getOneUser({ id: userId });
  if (!user) {
    Logger.error(`User not found`, 'editUser');
    throw new NotFoundException('Usuário Não Encontrado');
  }

  if (cpf && removeNonNumbersCharacters(cpf) != user.cpf) {
    validateCPF(removeNonNumbersCharacters(cpf));

    const cpfExists = await userRepository.getOneUser(
      { cpf: removeNonNumbersCharacters(cpf) },
      ['id', 'cpf'],
    );
    if (cpfExists) {
      Logger.error(`CPF already exists`, 'editUser');
      throw new ConflictException('CPF já existe');
    }
  }

  const updatedUser = await userRepository.updateUser(user.id, {
    name: name ? name : user.name,
    cpf: cpf ? removeNonNumbersCharacters(cpf) : user.cpf,
    phone: phone ? removeNonNumbersCharacters(phone) : user.phone,
    birthDate: updateUserDto.birthDate
      ? (dayjs(updateUserDto.birthDate) as any)
      : user.birthDate,
    department: updateUserDto.department
      ? updateUserDto.department
      : user.department,
    role: updateUserDto.role ? updateUserDto.role : user.role,
    active:
      updateUserDto.active !== undefined ? updateUserDto.active : user.active,
    dailyWorkMinutes:
      updateUserDto.dailyWorkMinutes !== undefined
        ? updateUserDto.dailyWorkMinutes
        : user.dailyWorkMinutes,
    workWeekdays: updateUserDto.workWeekdays
      ? updateUserDto.workWeekdays
      : user.workWeekdays,
    rg: updateUserDto.rg !== undefined ? updateUserDto.rg || null : user.rg,
    registrationNumber:
      updateUserDto.registrationNumber !== undefined
        ? updateUserDto.registrationNumber || null
        : user.registrationNumber,
    admissionDate:
      updateUserDto.admissionDate !== undefined
        ? updateUserDto.admissionDate
          ? parseDateOnly(updateUserDto.admissionDate)
          : null
        : user.admissionDate,
  });
  delete updatedUser.password;
  Logger.log(`User updated`, 'editUser');
  return updatedUser;
};

const updateManager = async (
  userId: string,
  updateManagerDto: UpdateManagerDto,
): Promise<UpdateUserResponseDto> => {
  Logger.log(`Updating manager for user ${userId}`, 'updateManager');
  validateUpdateManager(updateManagerDto);

  const user = await userRepository.getOneUser({ id: userId }, ['id']);
  if (!user) {
    Logger.error(`User not found`, 'updateManager');
    throw new NotFoundException('Usuário Não Encontrado');
  }

  const { managerId } = updateManagerDto;
  if (managerId) {
    if (managerId === userId) {
      Logger.error(`User cannot be its own manager`, 'updateManager');
      throw new BadRequestException(
        'Um funcionário não pode ser gestor de si mesmo',
      );
    }
    await assertManagerIsValid(managerId);
  }

  const updatedUser = await userRepository.updateUser(userId, {
    managerId: managerId || null,
  });
  delete updatedUser.password;
  Logger.log(`Manager updated for user ${userId}`, 'updateManager');
  return updatedUser;
};

const createUser = async (
  createUserDto: CreateUserDto,
): Promise<CreateUserResponseDto> => {
  Logger.log(`Creating user`, 'createUser');
  validateCreateUser(createUserDto);

  validateCPF(removeNonNumbersCharacters(createUserDto.cpf));

  const userExists = await userRepository.getOneUser({
    OR: [
      { cpf: removeNonNumbersCharacters(createUserDto.cpf) },
      { email: createUserDto.email },
    ],
  });
  if (userExists) {
    Logger.error(`User already exists`, 'createUser');
    throw new ConflictException('Usuário já existe');
  }

  if (createUserDto.managerId) {
    await assertManagerIsValid(createUserDto.managerId);
  }

  const password = generateRandomCode({
    length: 6,
    lowerCaseLetters: true,
    upperCaseLetters: true,
    numbers: true,
  });

  const newUser = await userRepository.createUser({
    ...createUserDto,
    phone: removeNonNumbersCharacters(createUserDto.phone),
    cpf: removeNonNumbersCharacters(createUserDto.cpf),
    password: await encryptPassword(password),
    birthDate: dayjs(createUserDto.birthDate) as any,
    admissionDate: createUserDto.admissionDate
      ? (parseDateOnly(createUserDto.admissionDate) as any)
      : undefined,
  });

  const mail = newUserTemplate({
    email: newUser.email,
    name: newUser.name.split(' ')[0],
    password,
  });
  // await sendMail(mail);

  delete newUser.password;
  Logger.log(`User created`, 'createUser');
  return newUser;
};

const inactivateUser = async (id: string, hrUser: User): Promise<void> => {
  Logger.log(`Inactivating user ${id}`, 'inactivateUser');
  if (hrUser.id === id) {
    Logger.error(`User is trying to inactivate itself`, 'inactivateUser');
    throw new BadRequestException('Não é possível inativar a si mesmo');
  }

  const userExists = await userRepository.getOneUser({ id }, ['id']);
  if (!userExists) {
    Logger.error(`User not found`, 'inactivateUser');
    throw new NotFoundException('Usuário Não Encontrado');
  }

  await userRepository.updateUser(id, { active: false });
  Logger.log(`User inactivated`, 'inactivateUser');
};

const userService = {
  createUser,
  getUserById,
  getUsers,
  getManagedUsers,
  editUser,
  updateManager,
  inactivateUser,
};
export default userService;
