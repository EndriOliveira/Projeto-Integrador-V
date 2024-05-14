import {
  BadRequestException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { RefreshToken, Schedule, User } from '@prisma/client';
import envConfig from '../../config/env.config';
import { MessageResponseDto } from '../../shared/dto/message.response.dto';
import { forgotPasswordTemplate } from '../../templates/forgotPassword.template';
import { encryptPassword, verifyPassword } from '../../utils/encryption';
import { generateJwt } from '../../utils/jwt';
import codeService from '../code/code.service';
import refreshTokenRepository from '../refreshToken/refreshToken.repository';
import refreshTokenService from '../refreshToken/refreshToken.service';
import scheduleRepository from '../schedule/schedule.repository';
import { sendMail } from '../sendGrid/sendGrid.service';
import userRepository from '../user/user.repository';
import userService from '../user/user.service';
import { ChangePasswordDto } from './dto/request/changePassword.dto';
import { CredentialsDto } from './dto/request/credentials.dto';
import { ForgotPasswordDto } from './dto/request/forgotPassword.dto';
import { ResetPasswordDto } from './dto/request/resetPassword.dto';
import { MeResponseDto } from './dto/response/me.response.dto';
import { SignInResponseDto } from './dto/response/signIn.response.dto';
import { validateChangePassword } from './schemas/changePassword.schema';
import { validateSignIn } from './schemas/credentials.schema';
import { validateForgotPassword } from './schemas/forgotPassword.schema';
import { validateResetPassword } from './schemas/resetPassword.schema';

const me = async (user: User): Promise<MeResponseDto> => {
  Logger.log(`User ${user.id} is getting its data`, 'me');
  const schedule = (await scheduleRepository.getOneSchedule(
    {
      AND: [{ userId: user.id }, { exit: null }],
    },
    [
      'id',
      'entry',
      'intervalEntry',
      'intervalExit',
      'exit',
      'createdAt',
      'updatedAt',
    ],
  )) as Schedule;

  Logger.log(`Data found for user ${user.id}`, 'me');
  return {
    ...user,
    schedule: schedule || null,
  };
};

const signIn = async (
  credentialsDto: CredentialsDto,
): Promise<SignInResponseDto> => {
  Logger.log(`Authenticating email ${credentialsDto.email}`);
  validateSignIn(credentialsDto);

  const { email, password } = credentialsDto;
  const user = await userRepository.getOneUser({ email }, [
    'id',
    'password',
    'updatedAt',
  ]);
  if (!user) {
    Logger.error(`User ${email} not found`, 'signIn');
    throw new UnauthorizedException('Credenciais Inválidas');
  }

  const passwordMatch = await verifyPassword(password, user.password);
  if (!passwordMatch) {
    Logger.error(`User ${email} entered wrong password`, 'signIn');
    throw new UnauthorizedException('Credenciais Inválidas');
  }

  Logger.log(`User ${email} authenticated successfully`, 'signIn');
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
  Logger.log(`Logging out user ${refreshToken.userId}`, 'logout');
  const { id, userId } = refreshToken;

  const refreshTokenExists = await refreshTokenRepository.getOneRefreshToken({
    id,
  });
  if (!refreshTokenExists) {
    Logger.error(`Refresh Token not found`, 'logout');
    throw new UnauthorizedException('Refresh Token Inválido');
  }

  const user = await userService.getUserById(userId);
  if (!user) {
    await refreshTokenRepository.deleteOneRefreshToken({ id });
    Logger.error(`User ${userId} not found`, 'logout');
    throw new NotFoundException('Usuário Não Encontrado');
  }

  await refreshTokenRepository.deleteOneRefreshToken({ id });

  Logger.log(`${user.id} logged out successfully`, 'logout');
  return {
    message: 'Efetuou o logout com sucesso',
  };
};

const forgotPassword = async (
  forgotPasswordDto: ForgotPasswordDto,
): Promise<MessageResponseDto> => {
  Logger.log(
    `Requesting password reset for email ${forgotPasswordDto.email}`,
    'forgotPassword',
  );
  validateForgotPassword(forgotPasswordDto);

  const { email } = forgotPasswordDto;
  const user = await userRepository.getOneUser({ email }, [
    'id',
    'email',
    'name',
  ]);
  if (user) {
    const code = await codeService.createCode(user.id);

    const mail = forgotPasswordTemplate({
      email: user.email,
      code: code,
      name: user.name.split(' ')[0],
    });
    await sendMail(mail);
    Logger.log(`Password reset email sent to ${email}`, 'forgotPassword');
  }

  return {
    message:
      'Verifique seu e-mail. Se encontrarmos seu cadastro na plataforma, você receberá instruções para redefinir sua senha.',
  };
};

const resetPassword = async (
  resetPasswordDto: ResetPasswordDto,
): Promise<MessageResponseDto> => {
  Logger.log(`Resetting password for code ${resetPasswordDto.code}`);
  validateResetPassword(resetPasswordDto);

  const { code, password, passwordConfirmation } = resetPasswordDto;
  if (password !== passwordConfirmation) {
    Logger.error(`Passwords do not match`, 'resetPassword');
    throw new BadRequestException('Senhas não são iguais');
  }

  const userCode = await codeService.validateCode(code);
  await userRepository.updateUser(userCode.userId, {
    password: await encryptPassword(password),
  });

  Logger.log(
    `Password successfully reset for ${userCode.userId}`,
    'resetPassword',
  );
  return {
    message: 'Senha alterada com sucesso',
  };
};

const changePassword = async (
  userId: string,
  changePasswordDto: ChangePasswordDto,
): Promise<User> => {
  Logger.log(`Changing password for user ${userId}`, 'changePassword');
  validateChangePassword(changePasswordDto);

  const { password, newPassword, newPasswordConfirmation } = changePasswordDto;

  if (newPassword !== newPasswordConfirmation) {
    Logger.error(`Passwords do not match`, 'changePassword');
    throw new BadRequestException('Senhas não são iguais');
  }

  const user = await userRepository.getOneUser({ id: userId });
  if (!user) {
    Logger.error(`User ${userId} not found`, 'changePassword');
    throw new UnauthorizedException('Credenciais Inválidas');
  }

  const passwordMatch = await verifyPassword(password, user.password);
  if (!passwordMatch) {
    Logger.error(`User ${user.id} entered wrong password`, 'changePassword');
    throw new UnauthorizedException('Credenciais Inválidas');
  }

  await userRepository.updateUser(userId, {
    password: await encryptPassword(newPassword),
  });

  delete user.password;
  Logger.log(
    `Password changed successfully for user ${userId}`,
    'changePassword',
  );
  return user;
};

export const authService = {
  signIn,
  logout,
  forgotPassword,
  resetPassword,
  changePassword,
  me,
};
