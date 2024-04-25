import { InternalServerErrorException } from '@nestjs/common';
import { Prisma, Schedule } from '@prisma/client';
import * as dayjs from 'dayjs';
import { v4 as uuidV4 } from 'uuid';
import client from '../../database/client';
import { FindSchedulesQueryDto } from './dto/request/getSchedulesQuery.dto';
import { GetSchedulesResponseDto } from './dto/response/getSchedules.response.dto';

const createSchedule = async (
  userId: string,
  entry: Date,
): Promise<Schedule> => {
  try {
    return await client.schedule.create({
      data: {
        id: uuidV4(),
        userId,
        entry,
      },
    });
  } catch (error) {
    throw new InternalServerErrorException('Erro Interno de Servidor');
  }
};

const getOneSchedule = async <Key extends keyof Schedule>(
  where: Prisma.ScheduleWhereInput,
  keys: Key[] = [
    'id',
    'entry',
    'intervalEntry',
    'intervalExit',
    'exit',
    'hourBalance',
    'createdAt',
    'updatedAt',
  ] as Key[],
): Promise<Pick<Schedule, Key>> => {
  try {
    return (await client.schedule.findFirst({
      where,
      select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {}),
    })) as Pick<Schedule, Key>;
  } catch (error) {
    throw new InternalServerErrorException('Erro Interno de Servidor');
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
        intervalEntry: true,
        intervalExit: true,
        exit: true,
        hourBalance: true,
        userId: true,
        createdAt: true,
        updatedAt: true,
      },
    })) as Schedule;
  } catch (error) {
    throw new InternalServerErrorException('Erro Interno de Servidor');
  }
};

const deleteSchedule = async (id: string): Promise<Schedule> => {
  try {
    return await client.schedule.delete({ where: { id } });
  } catch (error) {
    throw new InternalServerErrorException('Erro Interno de Servidor');
  }
};

const getScheduleByUser = async (
  userId: string,
  query: FindSchedulesQueryDto,
): Promise<GetSchedulesResponseDto> => {
  let { rangeStart, rangeEnd } = query;

  rangeStart = dayjs(rangeStart).subtract(3, 'hours').toDate();
  rangeEnd = dayjs(rangeEnd).add(21, 'hours').toDate();

  const where = {
    AND: [
      { userId },
      {
        createdAt: {
          gte: dayjs(rangeStart).toDate(),
          lte: dayjs(rangeEnd).toDate(),
        },
      },
    ],
  } as Prisma.ScheduleWhereInput;

  try {
    const [schedules, count] = await client.$transaction([
      client.schedule.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      }),
      client.schedule.count({ where }),
    ]);

    return {
      schedules,
      total: Number(count),
    };
  } catch (error) {
    throw new InternalServerErrorException('Erro Interno de Servidor');
  }
};

const scheduleRepository = {
  createSchedule,
  getOneSchedule,
  deleteSchedule,
  updateSchedule,
  getScheduleByUser,
};

export default scheduleRepository;
