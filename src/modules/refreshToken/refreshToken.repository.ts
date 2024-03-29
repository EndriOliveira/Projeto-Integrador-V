import { InternalServerErrorException } from '@nestjs/common';
import { Prisma, RefreshToken } from '@prisma/client';
import { v4 as uuidV4 } from 'uuid';
import client from '../../database/client';
import { CreateRefreshTokenDto } from './dto/request/createRefreshToken.dto';

const createRefreshToken = async (
  createRefreshTokenDto: CreateRefreshTokenDto,
): Promise<RefreshToken> => {
  const { userId } = createRefreshTokenDto;

  try {
    return await client.refreshToken.create({
      data: {
        id: uuidV4(),
        userId,
      },
    });
  } catch (error) {
    throw new InternalServerErrorException('Internal Server Error');
  }
};

const getOneRefreshToken = async <Key extends keyof RefreshToken>(
  where: Prisma.RefreshTokenWhereInput,
  keys: Key[] = ['id', 'userId', 'createdAt', 'updatedAt'] as Key[],
): Promise<Pick<RefreshToken, Key>> => {
  try {
    return (await client.refreshToken.findFirst({
      where,
      select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {}),
    })) as Pick<RefreshToken, Key>;
  } catch (error) {
    throw new InternalServerErrorException('Internal Server Error');
  }
};

const updateManyRefreshToken = async (
  where: Prisma.RefreshTokenWhereInput,
  updateBody: Prisma.RefreshTokenUpdateInput,
): Promise<number> => {
  try {
    const result = await client.refreshToken.updateMany({
      where,
      data: updateBody,
    });
    return result.count;
  } catch (error) {
    throw new InternalServerErrorException('Internal Server Error');
  }
};

const deleteOneRefreshToken = async (
  where: Prisma.RefreshTokenWhereUniqueInput,
): Promise<RefreshToken> => {
  try {
    return await client.refreshToken.delete({ where });
  } catch (error) {
    throw new InternalServerErrorException('Internal Server Error');
  }
};

const refreshTokenRepository = {
  createRefreshToken,
  getOneRefreshToken,
  updateManyRefreshToken,
  deleteOneRefreshToken,
};

export default refreshTokenRepository;
