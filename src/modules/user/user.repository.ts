import { InternalServerErrorException, Logger } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { v4 as uuidV4 } from 'uuid';
import client from '../../database/client';
import { totalPages } from '../../utils/totalPages';
import { CreateUserDto } from './dto/request/createUser.dto';
import { FindUsersQueryDto } from './dto/request/findUsersQuery.dto';
import { FindUsersResponseDto } from './dto/response/findUsers.response.dto';

// Inclui password: usado por getOneUser, de onde os fluxos de autenticação
// (signIn, changePassword) precisam ler o hash. Chamadas que devolvem o
// usuário para o cliente usam safeSelect ou apagam o campo manualmente.
const defaultSelect = {
  id: true,
  name: true,
  cpf: true,
  phone: true,
  email: true,
  password: true,
  birthDate: true,
  department: true,
  role: true,
  active: true,
  dailyWorkMinutes: true,
  workWeekdays: true,
  managerId: true,
  createdAt: true,
  updatedAt: true,
};

const safeSelect = {
  id: true,
  name: true,
  cpf: true,
  phone: true,
  email: true,
  birthDate: true,
  department: true,
  role: true,
  active: true,
  dailyWorkMinutes: true,
  workWeekdays: true,
  managerId: true,
  createdAt: true,
  updatedAt: true,
};

const getOneUser = async <Key extends keyof User>(
  where: Prisma.UserWhereInput,
  keys: Key[] = Object.keys(defaultSelect) as Key[],
): Promise<Pick<User, Key>> => {
  try {
    return (await client.user.findFirst({
      where,
      select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {}),
    })) as Pick<User, Key>;
  } catch (error) {
    Logger.error(error.message, 'getOneUser');
    throw new InternalServerErrorException('Erro Interno de Servidor');
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
    role,
    managerId,
    dailyWorkMinutes,
    workWeekdays,
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
        role,
        birthDate,
        password,
        managerId: managerId || null,
        dailyWorkMinutes,
        workWeekdays,
      },
      select: safeSelect,
    })) as User;
  } catch (error) {
    Logger.error(error.message, 'createUser');
    throw new InternalServerErrorException('Erro Interno de Servidor');
  }
};

const getUsers = async (
  query: FindUsersQueryDto,
): Promise<FindUsersResponseDto> => {
  let { limit, page } = query;
  const { sortBy, sortType, search, role, active, managerId } = query;
  limit = Number(limit) || 10;
  page = Number(page) || 1;

  const where: Prisma.UserWhereInput = {
    AND: [
      search
        ? {
            OR: [
              { email: { contains: search, mode: 'insensitive' } },
              { name: { contains: search, mode: 'insensitive' } },
              { department: { contains: search, mode: 'insensitive' } },
              { cpf: { contains: search } },
              { phone: { contains: search } },
            ],
          }
        : {},
      role ? { role } : {},
      active !== undefined
        ? { active: active === ('true' as any) || active === true }
        : {},
      managerId ? { managerId } : {},
    ],
  };

  try {
    const [users, count] = await client.$transaction([
      client.user.findMany({
        where,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        select: safeSelect,
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
    Logger.error(error.message, 'getUsers');
    throw new InternalServerErrorException('Erro Interno de Servidor');
  }
};

const updateUser = async (
  userId: string,
  updateUserArgs: Prisma.UserUncheckedUpdateInput,
): Promise<User> => {
  try {
    return (await client.user.update({
      where: { id: userId },
      data: updateUserArgs,
      select: safeSelect,
    })) as User;
  } catch (error) {
    Logger.error(error.message, 'updateUser');
    throw new InternalServerErrorException('Erro Interno de Servidor');
  }
};

const userRepository = {
  getOneUser,
  createUser,
  getUsers,
  updateUser,
};
export default userRepository;
