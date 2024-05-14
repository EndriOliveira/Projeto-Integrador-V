import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { User } from '@prisma/client';
import * as dayjs from 'dayjs';
import { newUserTemplate } from 'src/templates/newUser.template';
import { generateRandomCode } from 'src/utils/generateRandomCode';
import { encryptPassword } from '../../utils/encryption';
import { removeNonNumbersCharacters } from '../../utils/removeNonNumbersCharacters';
import { validateCPF } from '../../utils/validateCpf';
import { sendMail } from '../sendGrid/sendGrid.service';
import { CreateUserDto } from './dto/request/createUser.dto';
import { FindUsersQueryDto } from './dto/request/findUsersQuery.dto';
import { UpdateUserDto } from './dto/request/updateUserDto';
import { CreateUserResponseDto } from './dto/response/createUser.response.dto';
import { FindUserResponseDto } from './dto/response/findUser.response.dto';
import { FindUsersResponseDto } from './dto/response/findUsers.response.dto';
import { UpdateUserResponseDto } from './dto/response/updateUser.response.dto';
import { validateCreateUser } from './schema/createUser.schema';
import { validateGetUsers } from './schema/getUsers.schema';
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

const getUsers = async (
  query: FindUsersQueryDto,
  hrUser: User,
): Promise<FindUsersResponseDto> => {
  Logger.log(`Searching for users`, 'getUsers');
  validateGetUsers(query);

  if (!hrUser.isHumanResources) {
    Logger.error(`User is not HR`, 'getUsers');
    throw new ForbiddenException('Usuário deve pertencer ao RH');
  }

  const users = await userRepository.getUsers(query);
  Logger.log(`Users found`, 'getUsers');
  return users;
};

const editUser = async (
  userId: string,
  hrUser: User,
  updateUserDto: UpdateUserDto,
): Promise<UpdateUserResponseDto> => {
  Logger.log(`Editing user with id: ${userId}`, 'editUser');
  validateUpdateUser(updateUserDto);

  if (!hrUser.isHumanResources) {
    Logger.error(`User is not HR`, 'editUser');
    throw new ForbiddenException('Usuário deve pertencer ao RH');
  }

  const { cpf, name, phone } = updateUserDto;
  const user = await userRepository.getOneUser({ id: userId }, [
    'id',
    'name',
    'cpf',
    'phone',
    'email',
    'department',
    'isHumanResources',
    'birthDate',
    'hourBalance',
  ]);
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
    isHumanResources: updateUserDto.isHumanResources
      ? updateUserDto.isHumanResources
      : user.isHumanResources,
    hourBalance: updateUserDto.hourBalance
      ? updateUserDto.hourBalance
      : user.hourBalance,
  });
  Logger.log(`User updated`, 'editUser');
  return updatedUser;
};

const createUser = async (
  hrUser: User,
  createUserDto: CreateUserDto,
): Promise<CreateUserResponseDto> => {
  Logger.log(`Creating user`, 'createUser');
  validateCreateUser(createUserDto);

  if (!hrUser.isHumanResources) {
    Logger.error(`User is not HR`, 'createUser');
    throw new ForbiddenException('Usuário deve pertencer ao RH');
  }

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
  });

  const mail = newUserTemplate({
    email: newUser.email,
    name: newUser.name.split(' ')[0],
    password,
  });
  await sendMail(mail);

  Logger.log(`User created`, 'createUser');
  return newUser;
};

const deleteUser = async (id: string, hrUser: User): Promise<void> => {
  if (!hrUser.isHumanResources) {
    Logger.error(`User is not HR`, 'deleteUser');
    throw new ForbiddenException('Usuário deve pertencer ao RH');
  }
  if (hrUser.id === id) {
    Logger.error(`User is trying to delete itself`, 'deleteUser');
    throw new BadRequestException('Não é possível deletar a si mesmo');
  }

  const userExists = await userRepository.getOneUser({ id });
  if (!userExists) {
    Logger.error(`User not found`, 'deleteUser');
    throw new NotFoundException('Usuário Não Encontrado');
  }

  await userRepository.deleteUser(id);
  Logger.log(`User deleted`, 'deleteUser');
};

const userService = {
  createUser,
  getUserById,
  getUsers,
  editUser,
  deleteUser,
};
export default userService;
