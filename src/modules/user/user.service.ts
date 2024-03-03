import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { verifyPassword } from '../../utils/encryption';
import { removeNonNumbersCharacters } from '../../utils/removeNonNumbersCharacters';
import { validateCPF } from '../../utils/validateCpf';
import { FindUsersResponseDto } from './dto/findUsers.response.dto';
import { FindUsersQueryDto } from './dto/findUsersQuery.dto';
import { UpdateUserDto } from './dto/updateUserDto';
import { validateGetUsers } from './schema/getUsers.schema';
import { validateUpdateUser } from './schema/updateUser.schema';
import userRepository from './user.repository';

const getUserById = async (id: string): Promise<User> => {
  const user = await userRepository.getOneUser({ id });
  if (!user) throw new NotFoundException('User Not Found');

  delete user.password;
  return user;
};

const getUsers = async (
  query: FindUsersQueryDto,
): Promise<FindUsersResponseDto> => {
  validateGetUsers(query);

  return await userRepository.getUsers(query);
};

const editUser = async (
  userId: string,
  updateUserDto: UpdateUserDto,
): Promise<User> => {
  validateUpdateUser(updateUserDto);

  const { cpf, name, password, phone } = updateUserDto;
  const user = await userRepository.getOneUser({ id: userId }, [
    'id',
    'name',
    'cpf',
    'phone',
    'email',
    'department',
    'isHumanResources',
    'birthDate',
    'password',
  ]);
  if (!user) throw new NotFoundException('User Not Found');

  const passwordMatch = await verifyPassword(password, user.password);
  if (!passwordMatch) throw new UnauthorizedException('Invalid Credentials');

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
      ? new Date(updateUserDto.birthDate)
      : user.birthDate,
    department: updateUserDto.department
      ? updateUserDto.department
      : user.department,
    isHumanResources: updateUserDto.isHumanResources
      ? updateUserDto.isHumanResources
      : user.isHumanResources,
  });
};

const userService = {
  getUserById,
  getUsers,
  editUser,
};
export default userService;
