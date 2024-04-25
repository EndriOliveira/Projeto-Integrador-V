import { InternalServerErrorException } from '@nestjs/common';
import { Code, Prisma } from '@prisma/client';
import { v4 as uuidV4 } from 'uuid';
import client from '../../database/client';
import { CreateCodeDto } from './dto/createCode.dto';

const createCode = async (createCodeDto: CreateCodeDto): Promise<Code> => {
  const { code, userId } = createCodeDto;
  try {
    return await client.code.create({
      data: {
        id: uuidV4(),
        code,
        userId,
      },
    });
  } catch (error) {
    throw new InternalServerErrorException('Erro Interno de Servidor');
  }
};

const getOneCode = async <Key extends keyof Code>(
  where: Prisma.CodeWhereInput,
  keys: Key[] = [
    'id',
    'active',
    'userId',
    'code',
    'createdAt',
    'updatedAt',
  ] as Key[],
): Promise<Pick<Code, Key>> => {
  try {
    return (await client.code.findFirst({
      where,
      select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {}),
    })) as Pick<Code, Key>;
  } catch (error) {
    throw new InternalServerErrorException('Erro Interno de Servidor');
  }
};

const updateManyCode = async (
  where: Prisma.CodeWhereInput,
  updateBody: Prisma.CodeUpdateInput,
): Promise<number> => {
  try {
    const result = await client.code.updateMany({
      where,
      data: updateBody,
    });
    return result.count;
  } catch (error) {
    throw new InternalServerErrorException('Erro Interno de Servidor');
  }
};

const deleteManyCode = async (
  where: Prisma.CodeWhereInput,
): Promise<number> => {
  try {
    const result = await client.code.deleteMany({
      where,
    });
    return result.count;
  } catch (error) {
    throw new InternalServerErrorException('Erro Interno de Servidor');
  }
};

const codeRepository = {
  createCode,
  getOneCode,
  deleteManyCode,
  updateManyCode,
};

export default codeRepository;
