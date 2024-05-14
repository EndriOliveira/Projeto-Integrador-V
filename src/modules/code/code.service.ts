import {
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Code } from '@prisma/client';
import * as dayjs from 'dayjs';
import { generateRandomCode } from '../../utils/generateRandomCode';
import userService from '../user/user.service';
import codeRepository from './code.repository';

const createCode = async (userId: string): Promise<string> => {
  Logger.log(`Creating code for user ${userId}`, 'createCode');
  const user = await userService.getUserById(userId);
  if (!user) {
    Logger.error(`User ${userId} not found`, 'createCode');
    throw new NotFoundException('Usuário Não Encontrado');
  }

  let code = generateRandomCode({
    length: 6,
    lowerCaseLetters: true,
    upperCaseLetters: true,
    numbers: true,
  });
  let codeExists = true;

  while (codeExists) {
    const userCodeExists = await codeRepository.getOneCode({
      code,
      active: true,
    });
    if (!userCodeExists) codeExists = false;
    else
      code = generateRandomCode({
        length: 6,
        lowerCaseLetters: true,
        upperCaseLetters: true,
        numbers: true,
      });
  }

  await codeRepository.updateManyCode(
    { userId: user.id, active: true },
    { active: false },
  );
  await codeRepository.createCode({ userId, code });
  Logger.log(`Code created for user ${userId}`, 'createCode');
  return code;
};

const validateCode = async (code: string): Promise<Code> => {
  Logger.log(`Validating code ${code}`, 'validateCode');
  const userCode = await codeRepository.getOneCode({ code, active: true }, [
    'id',
    'userId',
    'createdAt',
  ]);
  if (!userCode) {
    Logger.error(`Code not found/already used`, 'validateCode');
    throw new NotFoundException('Código Não Encontrado');
  }

  await userService.getUserById(userCode.userId);

  const now = dayjs(new Date());
  const codeDate = dayjs(userCode.createdAt);
  const diff = now.diff(codeDate, 'minute');
  if (diff >= 60) {
    await codeRepository.updateManyCode({ code }, { active: false });
    Logger.error(`Code expired`, 'validateCode');
    throw new UnauthorizedException('Código Expirado');
  }

  await codeRepository.updateManyCode({ code }, { active: false });
  Logger.log(`Code validated`, 'validateCode');
  return userCode as Code;
};

const codeService = {
  createCode,
  validateCode,
};
export default codeService;
