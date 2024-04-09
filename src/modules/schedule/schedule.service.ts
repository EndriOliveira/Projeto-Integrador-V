import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { User } from '@prisma/client';
import * as dayjs from 'dayjs';
import userRepository from '../user/user.repository';
import { FindSchedulesQueryDto } from './dto/request/getSchedulesQuery.dto';
import { UpdateScheduleDto } from './dto/request/updateSchedule.dto';
import { CreateScheduleResponseDto } from './dto/response/createSchedule.response.dto';
import { GetScheduleResponseDto } from './dto/response/getSchedule.response.dto';
import { GetSchedulesResponseDto } from './dto/response/getSchedules.response.dto';
import scheduleRepository from './schedule.repository';
import { validateGetSchedules } from './schemas/getSchedules.schema';
import { validateUpdateSchedule } from './schemas/updateSchedule.schema';

const createSchedule = async (
  user: User,
): Promise<CreateScheduleResponseDto> => {
  const schedule = await scheduleRepository.getOneSchedule({
    userId: user.id,
    OR: [{ intervalEntry: null }, { intervalExit: null }, { exit: null }],
  });

  if (schedule) {
    if (!schedule.intervalEntry)
      return await scheduleRepository.updateSchedule(schedule.id, {
        intervalEntry: dayjs(new Date()).subtract(3, 'hours').toDate(),
      });
    if (!schedule.intervalExit)
      return await scheduleRepository.updateSchedule(schedule.id, {
        intervalExit: dayjs(new Date()).subtract(3, 'hours').toDate(),
      });
    if (!schedule.exit) {
      const updatedSchedule = await scheduleRepository.updateSchedule(
        schedule.id,
        {
          exit: dayjs(new Date()).subtract(3, 'hours').toDate(),
        },
      );

      const diff = dayjs(updatedSchedule.exit).diff(
        updatedSchedule.entry,
        'minutes',
      );
      const interval = dayjs(updatedSchedule.intervalExit).diff(
        updatedSchedule.intervalEntry,
        'minutes',
      );
      const worked = diff - interval;

      let userHourBalance = user.hourBalance;
      let hourBalance = 0;

      if (worked > 7 * 60) {
        userHourBalance = userHourBalance + (worked - 7 * 60);
        hourBalance = hourBalance + (worked - 7 * 60);
      }
      if (worked < 7 * 60) {
        userHourBalance = userHourBalance - (7 * 60 - worked);
        hourBalance = hourBalance - (7 * 60 - worked);
      }

      if (userHourBalance !== user.hourBalance) {
        await userRepository.updateUser(user.id, {
          hourBalance: userHourBalance,
        });
      }
      return await scheduleRepository.updateSchedule(schedule.id, {
        hourBalance,
      });
    }
  }

  return await scheduleRepository.createSchedule(
    user.id,
    dayjs(new Date()).subtract(3, 'hours').toDate(),
  );
};

const updateSchedule = async (
  id: string,
  user: User,
  updateScheduleDto: UpdateScheduleDto,
): Promise<CreateScheduleResponseDto> => {
  validateUpdateSchedule(updateScheduleDto);

  if (!user.isHumanResources)
    throw new ForbiddenException('Usuário deve pertencer ao RH');

  let schedule = await scheduleRepository.getOneSchedule({ id });
  if (!schedule) throw new NotFoundException('Registro não encontrado');
  if (
    !schedule.entry ||
    !schedule.intervalEntry ||
    !schedule.intervalExit ||
    !schedule.exit
  )
    throw new BadRequestException('Schedule Não está Completo');

  const {
    entryTime,
    intervalEntryTime,
    intervalExitTime,
    exitTime,
    intervalEntryDate,
    intervalExitDate,
    exitDate,
  } = updateScheduleDto;

  if (intervalEntryDate) {
    const newIntervalEntry = dayjs(
      `${intervalEntryDate} ${dayjs(schedule.intervalEntry).format('HH:mm')}`,
      'MM/DD/YYYY HH:mm',
    ).toDate();
    schedule = await scheduleRepository.updateSchedule(schedule.id, {
      intervalEntry: newIntervalEntry,
    });
  }

  if (intervalExitDate) {
    const newIntervalExit = dayjs(
      `${intervalExitDate} ${dayjs(schedule.intervalExit).format('HH:mm')}`,
      'MM/DD/YYYY HH:mm',
    ).toDate();
    schedule = await scheduleRepository.updateSchedule(schedule.id, {
      intervalExit: newIntervalExit,
    });
  }

  if (exitDate) {
    const newExit = dayjs(
      `${exitDate} ${dayjs(schedule.exit).format('HH:mm')}`,
      'MM/DD/YYYY HH:mm',
    ).toDate();
    schedule = await scheduleRepository.updateSchedule(schedule.id, {
      exit: newExit,
    });
  }

  if (entryTime) {
    const newEntry = dayjs(
      `${dayjs(schedule.entry).format('MM/DD/YYYY')} ${entryTime}`,
      'HH:mm',
    )
      .subtract(3, 'hours')
      .toDate();
    schedule = await scheduleRepository.updateSchedule(schedule.id, {
      entry: newEntry,
    });
  }

  if (intervalEntryTime) {
    const newIntervalEntry = dayjs(
      `${dayjs(schedule.intervalEntry).format(
        'MM/DD/YYYY',
      )} ${intervalEntryTime}`,
      'HH:mm',
    )
      .subtract(3, 'hours')
      .toDate();
    schedule = await scheduleRepository.updateSchedule(schedule.id, {
      intervalEntry: newIntervalEntry,
    });
  }

  if (intervalExitTime) {
    const newIntervalExit = dayjs(
      `${dayjs(schedule.intervalExit).format(
        'MM/DD/YYYY',
      )} ${intervalExitTime}`,
      'HH:mm',
    )
      .subtract(3, 'hours')
      .toDate();
    schedule = await scheduleRepository.updateSchedule(schedule.id, {
      intervalExit: newIntervalExit,
    });
  }

  if (exitTime) {
    const newExit = dayjs(
      `${dayjs(schedule.exit).format('MM/DD/YYYY')} ${exitTime}`,
      'HH:mm',
    )
      .subtract(3, 'hours')
      .toDate();
    schedule = await scheduleRepository.updateSchedule(schedule.id, {
      exit: newExit,
    });
  }

  const updatedSchedule = await scheduleRepository.getOneSchedule({ id });

  const diff = dayjs(updatedSchedule.exit).diff(
    updatedSchedule.entry,
    'minutes',
  );
  const interval = dayjs(updatedSchedule.intervalExit).diff(
    updatedSchedule.intervalEntry,
    'minutes',
  );
  const worked = diff - interval;

  let userHourBalance = user.hourBalance;
  let hourBalance = 0;

  if (worked > 7 * 60) {
    userHourBalance = userHourBalance + (worked - 7 * 60);
    hourBalance = hourBalance + (worked - 7 * 60);
  }

  if (worked < 7 * 60) {
    userHourBalance = userHourBalance - (7 * 60 - worked);
    hourBalance = hourBalance - (7 * 60 - worked);
  }

  if (hourBalance !== schedule.hourBalance) {
    const updatedSchedule = await scheduleRepository.updateSchedule(
      schedule.id,
      {
        hourBalance,
      },
    );

    userHourBalance = user.hourBalance - schedule.hourBalance + hourBalance;
    await userRepository.updateUser(user.id, { hourBalance: userHourBalance });
    return updatedSchedule;
  }
  return updatedSchedule;
};

const deleteSchedule = async (user: User, id: string): Promise<void> => {
  if (!user.isHumanResources)
    throw new ForbiddenException('Usuário deve pertencer ao RH');

  const schedule = await scheduleRepository.getOneSchedule({ id });
  if (!schedule) throw new NotFoundException('Registro não encontrado');
  await scheduleRepository.deleteSchedule(id);
  await userRepository.updateUser(user.id, {
    hourBalance: user.hourBalance - schedule.hourBalance,
  });
};

const listSchedulesByUser = async (
  userId: string,
  query: FindSchedulesQueryDto,
): Promise<GetSchedulesResponseDto> => {
  validateGetSchedules(query);
  return await scheduleRepository.getScheduleByUser(userId, query);
};

const getSchedule = async (id: string): Promise<GetScheduleResponseDto> => {
  const schedule = await scheduleRepository.getOneSchedule({ id });
  if (!schedule) throw new NotFoundException('Registro não encontrado');
  return schedule;
};

const scheduleService = {
  createSchedule,
  updateSchedule,
  deleteSchedule,
  listSchedulesByUser,
  getSchedule,
};

export default scheduleService;
