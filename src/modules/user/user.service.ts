import {
  ConflictException,
  ForbiddenException,
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
  const user = await userRepository.getOneUser({ id });
  if (!user) throw new NotFoundException('User Not Found');

  delete user.password;
  return user;
};

const getUsers = async (
  query: FindUsersQueryDto,
  user: User,
): Promise<FindUsersResponseDto> => {
  validateGetUsers(query);

  if (!user.isHumanResources) throw new ForbiddenException('Must be HR');

  return await userRepository.getUsers(query);
};

const editUser = async (
  userId: string,
  hrUser: User,
  updateUserDto: UpdateUserDto,
): Promise<UpdateUserResponseDto> => {
  validateUpdateUser(updateUserDto);

  if (!hrUser.isHumanResources) throw new ForbiddenException('Must be HR');

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
  ]);
  if (!user) throw new NotFoundException('User Not Found');

  if (cpf && removeNonNumbersCharacters(cpf) != user.cpf) {
    validateCPF(removeNonNumbersCharacters(cpf));

    const cpfExists = await userRepository.getOneUser(
      { cpf: removeNonNumbersCharacters(cpf) },
      ['id', 'cpf'],
    );
    if (cpfExists) throw new ConflictException('CPF Already Exists');
  }

  return await userRepository.updateUser(user.id, {
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
  });
};

const createUser = async (
  user: User,
  createUserDto: CreateUserDto,
): Promise<CreateUserResponseDto> => {
  validateCreateUser(createUserDto);

  if (!user.isHumanResources) throw new ForbiddenException('Must be HR');

  validateCPF(removeNonNumbersCharacters(createUserDto.cpf));

  const userExists = await userRepository.getOneUser({
    OR: [
      { cpf: removeNonNumbersCharacters(createUserDto.cpf) },
      { email: createUserDto.email },
    ],
  });
  if (userExists) throw new ConflictException('User Already Exists');

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

  return newUser;
};

const userService = {
  createUser,
  getUserById,
  getUsers,
  editUser,
};
export default userService;
