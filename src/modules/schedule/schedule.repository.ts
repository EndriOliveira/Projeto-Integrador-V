import { InternalServerErrorException } from '@nestjs/common';
import { Prisma, Schedule } from '@prisma/client';
import { v4 as uuidV4 } from 'uuid';
import client from '../../database/client';

const createSchedule = async (
  userId: string,
  entry: Date,
  exit: Date,
): Promise<Schedule> => {
  try {
    return await client.schedule.create({
      data: {
        id: uuidV4(),
        userId,
        entry,
        exit,
      },
    });
  } catch (error) {
    throw new InternalServerErrorException('Internal Server Error');
  }
};

const getOneSchedule = async <Key extends keyof Schedule>(
  where: Prisma.ScheduleWhereInput,
  keys: Key[] = ['id', 'entry', 'exit', 'createdAt', 'updatedAt'] as Key[],
): Promise<Pick<Schedule, Key>> => {
  try {
    return (await client.schedule.findFirst({
      where,
      select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {}),
    })) as Pick<Schedule, Key>;
  } catch (error) {
    throw new InternalServerErrorException('Internal Server Error');
  }
};

const updateSchedule = async (
  id: string,
  updateScheduleArgs: Prisma.ScheduleUpdateInput,
): Promise<Schedule> => {
  try {
    return (await client.schedule.update({
      where: { id },
      data: updateScheduleArgs,
      select: {
        id: true,
        entry: true,
        exit: true,
        userId: true,
        createdAt: true,
        updatedAt: true,
      },
    })) as Schedule;
  } catch (error) {
    throw new InternalServerErrorException('Internal Server Error');
  }
};

const scheduleRepository = {
  createSchedule,
  getOneSchedule,
  updateSchedule,
};

export default scheduleRepository;
