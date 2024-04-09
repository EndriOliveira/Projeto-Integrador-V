import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Code } from '@prisma/client';
import * as dayjs from 'dayjs';
import { generateRandomCode } from '../../utils/generateRandomCode';
import userService from '../user/user.service';
import codeRepository from './code.repository';

const createCode = async (userId: string): Promise<string> => {
  const user = await userService.getUserById(userId);
  if (!user) throw new NotFoundException('Usuário Não Encontrado');

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
  return code;
};

const validateCode = async (code: string): Promise<Code> => {
  const userCode = await codeRepository.getOneCode({ code, active: true }, [
    'id',
    'userId',
    'createdAt',
  ]);
  if (!userCode) throw new NotFoundException('Código Não Encontrado');

  await userService.getUserById(userCode.userId);

  const now = dayjs(new Date());
  const codeDate = dayjs(userCode.createdAt);
  const diff = now.diff(codeDate, 'minute');
  if (diff >= 60) {
    await codeRepository.updateManyCode({ code }, { active: false });
    throw new UnauthorizedException('Código Expirado');
  }

  await codeRepository.updateManyCode({ code }, { active: false });
  return userCode as Code;
};

const codeService = {
  createCode,
  validateCode,
};
export default codeService;
