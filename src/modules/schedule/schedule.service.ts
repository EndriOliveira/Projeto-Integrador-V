import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { User } from '@prisma/client';
import * as dayjs from 'dayjs';
import { CreateScheduleDto } from './dto/request/createSchedule.dto';
import { UpdateScheduleDto } from './dto/request/updateSchedule.dto';
import { CreateScheduleResponseDto } from './dto/response/createSchedule.response.dto';
import scheduleRepository from './schedule.repository';
import { validateCreateSchedule } from './schemas/createSchedule.schema';
import { validateUpdateSchedule } from './schemas/updateSchedule.schema';

const createSchedule = async (
  user: User,
  createScheduleDto: CreateScheduleDto,
): Promise<CreateScheduleResponseDto> => {
  validateCreateSchedule(createScheduleDto);

  const { entryDate, entryTime, exitDate, exitTime } = createScheduleDto;

  const entry = `${entryDate} ${entryTime}`;
  const exit = `${exitDate} ${exitTime}`;

  return await scheduleRepository.createSchedule(
    user.id,
    dayjs(entry, { format: 'MM/DD/YYYY HH:mm' }).subtract(2, 'hours').toDate(),
    dayjs(exit, { format: 'MM/DD/YYYY HH:mm' }).subtract(2, 'hours').toDate(),
  );
};

const updateSchedule = async (
  id: string,
  user: User,
  updateScheduleDto: UpdateScheduleDto,
): Promise<CreateScheduleResponseDto> => {
  validateUpdateSchedule(updateScheduleDto);

  if (!user.isHumanResources) throw new ForbiddenException('Must be HR');

  const schedule = await scheduleRepository.getOneSchedule({ id });
  if (!schedule) throw new NotFoundException('Schedule not found');

  const { entryDate, entryTime, exitDate, exitTime } = updateScheduleDto;

  const newEntryDate = entryDate
    ? entryDate
    : dayjs(schedule.entry).format('MM/DD/YYYY');
  const newEntryTime = entryTime
    ? entryTime
    : dayjs(schedule.entry).format('HH:mm');
  const newExitDate = exitDate
    ? exitDate
    : dayjs(schedule.exit).format('MM/DD/YYYY');
  const newExitTime = exitTime
    ? exitTime
    : dayjs(schedule.exit).format('HH:mm');

  const entry = `${newEntryDate} ${newEntryTime}`;
  const exit = `${newExitDate} ${newExitTime}`;

  console.log(
    entryTime
      ? dayjs(entry, { format: 'MM/DD/YYYY HH:mm' })
          .subtract(2, 'hours')
          .toDate()
      : dayjs(entry, { format: 'MM/DD/YYYY HH:mm' }).toDate(),
  );
  console.log(
    exitTime
      ? dayjs(exit, { format: 'MM/DD/YYYY HH:mm' })
          .subtract(2, 'hours')
          .toDate()
      : dayjs(exit, { format: 'MM/DD/YYYY HH:mm' }).toDate(),
  );

  return await scheduleRepository.updateSchedule(id, {
    entry: entryTime
      ? dayjs(entry, { format: 'MM/DD/YYYY HH:mm' })
          .subtract(2, 'hours')
          .toDate()
      : dayjs(entry, { format: 'MM/DD/YYYY HH:mm' }).toDate(),
    exit: exitTime
      ? dayjs(exit, { format: 'MM/DD/YYYY HH:mm' })
          .subtract(2, 'hours')
          .toDate()
      : dayjs(exit, { format: 'MM/DD/YYYY HH:mm' }).toDate(),
  });
};

const scheduleService = { createSchedule, updateSchedule };

export default scheduleService;
