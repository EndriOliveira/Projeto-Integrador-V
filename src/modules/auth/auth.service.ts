import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { RefreshToken, User } from '@prisma/client';
import * as dayjs from 'dayjs';
import envConfig from '../../config/env.config';
import { MessageResponseDto } from '../../shared/dto/message.response.dto';
import { forgotPasswordTemplate } from '../../templates/forgotPassword.template';
import { newUserTemplate } from '../../templates/newUser.template';
import { encryptPassword, verifyPassword } from '../../utils/encryption';
import { generateJwt } from '../../utils/jwt';
import { removeNonNumbersCharacters } from '../../utils/removeNonNumbersCharacters';
import { validateCPF } from '../../utils/validateCpf';
import codeService from '../code/code.service';
import refreshTokenRepository from '../refreshToken/refreshToken.repository';
import refreshTokenService from '../refreshToken/refreshToken.service';
import { sendMail } from '../sendGrid/sendGrid.service';
import userRepository from '../user/user.repository';
import userService from '../user/user.service';
import { ChangePasswordDto } from './dto/request/changePassword.dto';
import { CreateUserDto } from './dto/request/createUser.dto';
import { CredentialsDto } from './dto/request/credentials.dto';
import { ForgotPasswordDto } from './dto/request/forgotPassword.dto';
import { ResetPasswordDto } from './dto/request/resetPassword.dto';
import { CreateUserResponseDto } from './dto/response/createUser.response.dto';
import { SignInResponseDto } from './dto/response/signIn.response.dto';
import { validateChangePassword } from './schemas/changePassword.schema';
import { validateCreateUser } from './schemas/createUser.schema';
import { validateSignIn } from './schemas/credentials.schema';
import { validateForgotPassword } from './schemas/forgotPassword.schema';
import { validateResetPassword } from './schemas/resetPassword.schema';

const createUser = async (
  createUserDto: CreateUserDto,
): Promise<CreateUserResponseDto> => {
  validateCreateUser(createUserDto);

  const { password, passwordConfirmation } = createUserDto;
  if (password !== passwordConfirmation)
    throw new BadRequestException('Passwords do not match');

  validateCPF(removeNonNumbersCharacters(createUserDto.cpf));

  const userExists = await userRepository.getOneUser({
    OR: [
      { cpf: removeNonNumbersCharacters(createUserDto.cpf) },
      { email: createUserDto.email },
    ],
  });
  if (userExists) throw new ConflictException('User Already Exists');

  const user = await userRepository.createUser({
    ...createUserDto,
    phone: removeNonNumbersCharacters(createUserDto.phone),
    cpf: removeNonNumbersCharacters(createUserDto.cpf),
    password: await encryptPassword(createUserDto.password),
    birthDate: dayjs(createUserDto.birthDate) as any,
  });

  const mail = newUserTemplate({
    email: user.email,
    name: user.name.split(' ')[0],
  });
  await sendMail(mail);

  return user;
};

const signIn = async (
  credentialsDto: CredentialsDto,
): Promise<SignInResponseDto> => {
  validateSignIn(credentialsDto);

  const { email, password } = credentialsDto;
  const user = await userRepository.getOneUser({ email }, [
    'id',
    'password',
    'updatedAt',
  ]);
  if (!user) throw new UnauthorizedException('Invalid Credentials');

  const passwordMatch = await verifyPassword(password, user.password);
  if (!passwordMatch) throw new UnauthorizedException('Invalid Credentials');

  return {
    accessToken: generateJwt(
      envConfig.jwt.accessSecret,
      { id: user.id },
      envConfig.jwt.accessExpirationTime,
    ),
    refreshToken: await refreshTokenService.createRefreshToken(user.id),
  };
};

const logout = async (
  refreshToken: RefreshToken,
): Promise<MessageResponseDto> => {
  const { id, userId } = refreshToken;

  const refreshTokenExists = await refreshTokenRepository.getOneRefreshToken({
    id,
  });
  if (!refreshTokenExists)
    throw new UnauthorizedException('Invalid Refresh Token');

  const user = await userService.getUserById(userId);
  if (!user) {
    await refreshTokenRepository.deleteOneRefreshToken({ id });
    throw new NotFoundException('User Not Found');
  }

  await refreshTokenRepository.deleteOneRefreshToken({ id });

  return {
    message: 'Logged out successfully',
  };
};

const forgotPassword = async (
  forgotPasswordDto: ForgotPasswordDto,
): Promise<MessageResponseDto> => {
  validateForgotPassword(forgotPasswordDto);

  const { email } = forgotPasswordDto;
  const user = await userRepository.getOneUser({ email }, [
    'id',
    'email',
    'name',
  ]);
  if (!user) throw new UnauthorizedException('Invalid Credentials');

  const code = await codeService.createCode(user.id);

  const mail = forgotPasswordTemplate({
    email: user.email,
    code: code,
    name: user.name.split(' ')[0],
  });
  await sendMail(mail);
  return {
    message: 'Please verify your email for further information',
  };
};

const resetPassword = async (
  resetPasswordDto: ResetPasswordDto,
): Promise<MessageResponseDto> => {
  validateResetPassword(resetPasswordDto);

  const { code, password, passwordConfirmation } = resetPasswordDto;
  if (password !== passwordConfirmation)
    throw new BadRequestException('Passwords do not match');

  const userCode = await codeService.validateCode(code);
  await userRepository.updateUser(userCode.userId, {
    password: await encryptPassword(password),
  });

  return {
    message: 'Password changed successfully',
  };
};

const changePassword = async (
  userId: string,
  changePasswordDto: ChangePasswordDto,
): Promise<User> => {
  validateChangePassword(changePasswordDto);

  const { password, newPassword, newPasswordConfirmation } = changePasswordDto;

  if (newPassword !== newPasswordConfirmation)
    throw new BadRequestException('Passwords do not match');

  const user = await userRepository.getOneUser({ id: userId });
  if (!user) throw new UnauthorizedException('Invalid Credentials');

  const passwordMatch = await verifyPassword(password, user.password);
  if (!passwordMatch) throw new UnauthorizedException('Invalid Credentials');

  await userRepository.updateUser(userId, {
    password: await encryptPassword(newPassword),
  });

  delete user.password;
  return user;
};

export const authService = {
  createUser,
  signIn,
  logout,
  forgotPassword,
  resetPassword,
  changePassword,
};
