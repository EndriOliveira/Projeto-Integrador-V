import { InternalServerErrorException } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { v4 as uuidV4 } from 'uuid';
import client from '../../database/client';
import { removeNonNumbersCharacters } from '../../utils/removeNonNumbersCharacters';
import { totalPages } from '../../utils/totalPages';
import { CreateUserDto } from './dto/request/createUser.dto';
import { FindUsersQueryDto } from './dto/request/findUsersQuery.dto';
import { FindUsersResponseDto } from './dto/response/findUsers.response.dto';

const getOneUser = async <Key extends keyof User>(
  where: Prisma.UserWhereInput,
  keys: Key[] = [
    'id',
    'name',
    'cpf',
    'phone',
    'email',
    'password',
    'birthDate',
    'department',
    'isHumanResources',
    'hourBalance',
    'createdAt',
    'updatedAt',
  ] as Key[],
): Promise<Pick<User, Key>> => {
  try {
    return (await client.user.findFirst({
      where,
      select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {}),
    })) as Pick<User, Key>;
  } catch (error) {
    throw new InternalServerErrorException('Internal Server Error');
  }
};

const createUser = async (createUserDto: CreateUserDto): Promise<User> => {
  const {
    name,
    phone,
    cpf,
    email,
    password,
    birthDate,
    department,
    isHumanResources,
  } = createUserDto;

  try {
    return (await client.user.create({
      data: {
        id: uuidV4(),
        name,
        phone,
        cpf,
        email,
        department,
        isHumanResources,
        birthDate,
        password,
      },
      select: {
        id: true,
        name: true,
        cpf: true,
        phone: true,
        email: true,
        birthDate: true,
        department: true,
        isHumanResources: true,
        hourBalance: true,
        createdAt: true,
        updatedAt: true,
      },
    })) as User;
  } catch (error) {
    throw new InternalServerErrorException('Internal Server Error');
  }
};

const getUsers = async (
  query: FindUsersQueryDto,
): Promise<FindUsersResponseDto> => {
  let { limit, page } = query;
  const { sortBy, sortType, cpf, email, name, phone, department } = query;
  limit = Number(limit) || 10;
  page = Number(page) || 1;

  const where = {
    AND: [
      { email: email ? { contains: email, mode: 'insensitive' } : undefined },
      { name: name ? { contains: name, mode: 'insensitive' } : undefined },
      {
        department: department
          ? { contains: department, mode: 'insensitive' }
          : undefined,
      },
      {
        cpf: cpf ? { contains: removeNonNumbersCharacters(cpf) } : undefined,
      },
      {
        phone: phone
          ? { contains: removeNonNumbersCharacters(phone) }
          : undefined,
      },
    ],
  } as Prisma.UserWhereInput;

  try {
    const [users, count] = await client.$transaction([
      client.user.findMany({
        where,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        select: {
          id: true,
          name: true,
          cpf: true,
          phone: true,
          email: true,
          birthDate: true,
          department: true,
          isHumanResources: true,
          hourBalance: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: sortBy && sortType ? { [sortBy]: sortType } : undefined,
      }),
      client.user.count({ where }),
    ]);

    return {
      users: users as User[],
      total: Number(count),
      page: Number(page),
      pages: Number(totalPages(count, limit)),
    };
  } catch (error) {
    throw new InternalServerErrorException('Internal Server Error');
  }
};

const updateUser = async (
  userId: string,
  updateUserArgs: Prisma.UserUpdateInput,
): Promise<User> => {
  try {
    return (await client.user.update({
      where: { id: userId },
      data: updateUserArgs,
      select: {
        id: true,
        name: true,
        cpf: true,
        phone: true,
        email: true,
        birthDate: true,
        department: true,
        isHumanResources: true,
        hourBalance: true,
        createdAt: true,
        updatedAt: true,
      },
    })) as User;
  } catch (error) {
    throw new InternalServerErrorException('Internal Server Error');
  }
};

const deleteUser = async (userId: string): Promise<void> => {
  try {
    await client.user.delete({
      where: { id: userId },
    });
  } catch (error) {
    throw new InternalServerErrorException('Internal Server Error');
  }
};

const userRepository = {
  getOneUser,
  createUser,
  getUsers,
  updateUser,
  deleteUser,
};
export default userRepository;
