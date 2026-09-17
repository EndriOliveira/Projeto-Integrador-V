import { Logger, NotFoundException } from '@nestjs/common';
import { Role, User } from '@prisma/client';
import * as dayjs from 'dayjs';
import * as ExcelJS from 'exceljs';
import { assertCanAccessEmployee } from '../../shared/access-control';
import hourCalculationService from '../hourCalculation/hourCalculation.service';
import overtimePolicyService from '../overtimePolicy/overtimePolicy.service';
import timeEntryRepository from '../timeEntry/timeEntry.repository';
import userRepository from '../user/user.repository';
import { ReportQueryDto } from './dto/request/reportQuery.dto';
import { validateReportQuery } from './schemas/reportQuery.schema';

const minutesToHours = (totalMinutes: number): string => {
  const sign = totalMinutes < 0 ? '-' : '';
  const absoluteMinutes = Math.abs(totalMinutes);
  const hours = Math.floor(absoluteMinutes / 60);
  const minutes = absoluteMinutes % 60;
  return `${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(
    2,
    '0',
  )}`;
};

const getTargetUsers = async (
  actingUser: User,
  userId?: string,
): Promise<User[]> => {
  if (userId) {
    await assertCanAccessEmployee(actingUser, userId);
    const user = await userRepository.getOneUser({ id: userId });
    if (!user) {
      Logger.error(`User ${userId} not found`, 'getTargetUsers');
      throw new NotFoundException('Usuário Não Encontrado');
    }
    return [user];
  }

  if (actingUser.role === Role.RH) {
    const { users } = await userRepository.getUsers({
      page: 1,
      limit: 10000,
    } as any);
    return users;
  }

  if (actingUser.role === Role.GESTOR) {
    const { users } = await userRepository.getUsers({
      managerId: actingUser.id,
      page: 1,
      limit: 10000,
    } as any);
    return users;
  }

  return [actingUser];
};

const generateTimesheetReport = async (
  actingUser: User,
  query: ReportQueryDto,
): Promise<Buffer> => {
  Logger.log(`Generating timesheet report`, 'generateTimesheetReport');
  validateReportQuery(query);

  const targetUsers = await getTargetUsers(actingUser, query.userId);

  const [holidayDates, policies] = await Promise.all([
    overtimePolicyService.getHolidayDateSet(),
    overtimePolicyService.listOvertimePolicies(),
  ]);

  const upToDate = dayjs(query.rangeEnd).add(21, 'hours').toDate();
  const periodStart = dayjs(query.rangeStart)
    .subtract(3, 'hours')
    .format('YYYY-MM-DD');

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Relatório de Ponto');
  sheet.columns = [
    { header: 'Funcionário', key: 'funcionario', width: 30 },
    { header: 'Data', key: 'data', width: 12 },
    { header: 'Tipo do Dia', key: 'tipoDia', width: 14 },
    { header: 'Horas Trabalhadas', key: 'horasTrabalhadas', width: 18 },
    { header: 'Jornada Prevista', key: 'jornadaPrevista', width: 16 },
    { header: 'Saldo do Dia', key: 'saldoDia', width: 14 },
    { header: 'Horas p/ Banco', key: 'horasBanco', width: 14 },
    { header: 'Horas p/ Pagamento', key: 'horasPagamento', width: 18 },
    { header: '% Adicional', key: 'percentualAdicional', width: 12 },
    { header: 'Saldo Banco Acumulado', key: 'saldoBanco', width: 20 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const user of targetUsers) {
    const entries = await timeEntryRepository.getEntriesForUser(
      user.id,
      upToDate,
    );
    const { days } = hourCalculationService.calculatePeriodBreakdown(
      user,
      entries,
      holidayDates,
      policies,
      periodStart,
    );

    for (const day of days) {
      sheet.addRow({
        funcionario: user.name,
        data: day.date,
        tipoDia: day.dayType,
        horasTrabalhadas: minutesToHours(day.workedMinutes),
        jornadaPrevista: minutesToHours(day.expectedMinutes),
        saldoDia: minutesToHours(day.balanceMinutes),
        horasBanco: minutesToHours(day.bankMinutes),
        horasPagamento: minutesToHours(day.paymentMinutes),
        percentualAdicional:
          day.paymentPercentage !== null
            ? `${day.paymentPercentage * 100}%`
            : '-',
        saldoBanco: minutesToHours(day.bankBalanceAfter),
      });
    }
  }

  Logger.log(`Timesheet report generated`, 'generateTimesheetReport');
  return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
};

const reportService = {
  generateTimesheetReport,
};

export default reportService;
