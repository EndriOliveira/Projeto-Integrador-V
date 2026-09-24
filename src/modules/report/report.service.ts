import { Logger, NotFoundException } from '@nestjs/common';
import {
  DayType,
  HazardType,
  OvertimePolicy,
  PaidHours,
  PunchType,
  Role,
  TimeEntry,
  User,
  WorkDay,
} from '@prisma/client';
import * as dayjs from 'dayjs';
import * as ExcelJS from 'exceljs';
import * as JSZip from 'jszip';
import { assertCanAccessEmployee } from '../../shared/access-control';
import {
  CYCLE_LABELS,
  dateOnlyToKey,
  getCycleOf,
  getCycleRange,
  keyToDateOnly,
} from '../../shared/payrollCycle';
import hourCalculationService from '../hourCalculation/hourCalculation.service';
import { DayBreakdown } from '../hourCalculation/hourCalculation.types';
import overtimePolicyService from '../overtimePolicy/overtimePolicy.service';
import timeEntryRepository from '../timeEntry/timeEntry.repository';
import timesheetRepository from '../timesheet/timesheet.repository';
import userRepository from '../user/user.repository';
import { AllReportsQueryDto } from './dto/request/allReportsQuery.dto';
import { ReportQueryDto } from './dto/request/reportQuery.dto';
import {
  validateAllReportsQuery,
  validateReportQuery,
} from './schemas/reportQuery.schema';

// Relatório de ponto do RH: um arquivo com três abas, espelhando as planilhas
// usadas hoje pela empresa — "Ponto" (dia a dia do mês de ciclo), "Banco de
// Horas" (totais por mês do ano) e "Horas Pagas" (dados do funcionário e
// horas pagas/bloqueio por mês). Mês de ciclo = dia 21 ao dia 20.
//
// Colunas calculadas:
// - Total: horas trabalhadas no dia.
// - 20%: horas noturnas (22h às 5h), adicional noturno.
// - 30% E / N.E.: total do dia quando o apontamento marca periculosidade
//   elétrica / não elétrica.
// - Hora extra: excedente da jornada; domingo/feriado vai para a coluna da
//   regra SUNDAY_HOLIDAY, os demais dias para a da regra WEEKDAY. Os títulos
//   usam os percentuais cadastrados em Políticas.
// - "Calculada" (aba Banco de Horas): parte da hora extra que excedeu o teto
//   do banco e vai para pagamento (DayBreakdown.paymentMinutes).
// - Negativa: soma dos saldos negativos dos dias.

const MINUTES_PER_DAY = 24 * 60;
const HOUR_MS = 60 * 60 * 1000;
// Mesma referência BRT (UTC-3) do hourCalculation.
const BRT_OFFSET_MS = 3 * HOUR_MS;
const NIGHT_START_MINUTE = 22 * 60;
const NIGHT_END_MINUTE = 5 * 60;
const HOUR_BLOCKS = 4;

const WEEKDAY_NAMES = [
  'domingo',
  'segunda-feira',
  'terça-feira',
  'quarta-feira',
  'quinta-feira',
  'sexta-feira',
  'sábado',
];

const DURATION_FORMAT = '[h]:mm';
const CLOCK_FORMAT = 'hh:mm';
const THIN: Partial<ExcelJS.Border> = { style: 'thin' };
const BORDER: Partial<ExcelJS.Borders> = {
  top: THIN,
  left: THIN,
  bottom: THIN,
  right: THIN,
};
const solidFill = (argb: string): ExcelJS.Fill => ({
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb },
});
const HEADER_FILL = solidFill('FFE7E6E6');
const OFF_DAY_FILL = solidFill('FFF2F2F2');
const SELECTED_MONTH_FILL = solidFill('FFE2EFDA');
const TOTAL_FILL = solidFill('FFDDEBF7');

type Segment = { start: Date | null; end: Date | null };

type Metrics = {
  worked: number;
  night: number;
  hazardE: number;
  hazardNE: number;
  overtimeWeekday: number;
  overtimeSunday: number;
  paymentWeekday: number;
  paymentSunday: number;
  negative: number;
};

const emptyMetrics = (): Metrics => ({
  worked: 0,
  night: 0,
  hazardE: 0,
  hazardNE: 0,
  overtimeWeekday: 0,
  overtimeSunday: 0,
  paymentWeekday: 0,
  paymentSunday: 0,
  negative: 0,
});

const addMetrics = (target: Metrics, source: Metrics): void => {
  for (const key of Object.keys(target) as (keyof Metrics)[]) {
    target[key] += source[key];
  }
};

// Minutos -> fração de dia, que é como o Excel guarda horas.
const toExcelDuration = (minutes: number): number => minutes / MINUTES_PER_DAY;

const brtMinuteOfDay = (date: Date): number => {
  const brt = new Date(date.getTime() - BRT_OFFSET_MS);
  return brt.getUTCHours() * 60 + brt.getUTCMinutes();
};

// Mesmo pareamento do hourCalculation: começa em ENTRADA/INTERVALO_SAIDA e
// termina em INTERVALO_ENTRADA/SAIDA. Marcação sem par vira segmento aberto.
const buildSegments = (entries: TimeEntry[]): Segment[] => {
  const segments: Segment[] = [];
  let current: Segment | null = null;
  for (const entry of entries) {
    const isStart =
      entry.type === PunchType.ENTRADA ||
      entry.type === PunchType.INTERVALO_SAIDA;
    if (isStart) {
      if (current) segments.push(current);
      current = { start: entry.deviceTimestamp, end: null };
    } else if (current) {
      current.end = entry.deviceTimestamp;
      segments.push(current);
      current = null;
    } else {
      segments.push({ start: null, end: entry.deviceTimestamp });
    }
  }
  if (current) segments.push(current);
  return segments;
};

const calculateNightMinutes = (segments: Segment[]): number => {
  let total = 0;
  for (const { start, end } of segments) {
    if (!start || !end) continue;
    const length = dayjs(end).diff(start, 'minute');
    const firstMinute = brtMinuteOfDay(start);
    for (let offset = 0; offset < length; offset++) {
      const minute = (firstMinute + offset) % MINUTES_PER_DAY;
      if (minute >= NIGHT_START_MINUTE || minute < NIGHT_END_MINUTE) total++;
    }
  }
  return total;
};

const calculateDayMetrics = (
  day: DayBreakdown,
  workDay: WorkDay | undefined,
): Metrics => {
  const isSundayOrHoliday = day.dayType === DayType.SUNDAY_HOLIDAY;
  const overtime = Math.max(day.balanceMinutes, 0);
  return {
    worked: day.workedMinutes,
    night: calculateNightMinutes(buildSegments(day.entries)),
    hazardE:
      workDay?.hazardType === HazardType.ELETRICO ? day.workedMinutes : 0,
    hazardNE:
      workDay?.hazardType === HazardType.NAO_ELETRICO ? day.workedMinutes : 0,
    overtimeWeekday: isSundayOrHoliday ? 0 : overtime,
    overtimeSunday: isSundayOrHoliday ? overtime : 0,
    paymentWeekday: isSundayOrHoliday ? 0 : day.paymentMinutes,
    paymentSunday: isSundayOrHoliday ? day.paymentMinutes : 0,
    negative: Math.max(-day.balanceMinutes, 0),
  };
};

const formatCpf = (cpf: string): string =>
  cpf.length === 11
    ? cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    : cpf;

const formatDateOnly = (date: Date | null): string =>
  date ? dayjs(dateOnlyToKey(date)).format('DD/MM/YYYY') : '';

const hazardLabel = (hazardType: HazardType | null | undefined): string => {
  if (hazardType === HazardType.ELETRICO) return 'E';
  if (hazardType === HazardType.NAO_ELETRICO) return 'NE';
  return '';
};

const slugify = (text: string): string =>
  text
    .normalize('NFD') // separa os acentos das letras...
    .replace(/[^\x20-\x7e]/g, '') // ...e remove tudo que não é ASCII
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

const styleRange = (
  sheet: ExcelJS.Worksheet,
  fromRow: number,
  fromCol: number,
  toRow: number,
  toCol: number,
  style: (cell: ExcelJS.Cell) => void,
): void => {
  for (let row = fromRow; row <= toRow; row++) {
    for (let col = fromCol; col <= toCol; col++) {
      style(sheet.getRow(row).getCell(col));
    }
  }
};

const headerStyle = (cell: ExcelJS.Cell): void => {
  cell.font = { bold: true };
  cell.fill = HEADER_FILL;
  cell.border = BORDER;
  cell.alignment = {
    horizontal: 'center',
    vertical: 'middle',
    wrapText: true,
    ...cell.alignment,
  };
};

const mergeWithValue = (
  sheet: ExcelJS.Worksheet,
  row: number,
  fromCol: number,
  toCol: number,
  value: ExcelJS.CellValue,
  toRow = row,
): ExcelJS.Cell => {
  if (fromCol !== toCol || row !== toRow) {
    sheet.mergeCells(row, fromCol, toRow, toCol);
  }
  const cell = sheet.getRow(row).getCell(fromCol);
  cell.value = value;
  return cell;
};

const sumFormula = (
  sheet: ExcelJS.Worksheet,
  col: number,
  fromRow: number,
  toRow: number,
): ExcelJS.CellFormulaValue => {
  const letter = sheet.getColumn(col).letter;
  return {
    formula: `SUM(${letter}${fromRow}:${letter}${toRow})`,
    date1904: false,
  };
};

type OvertimeLabels = { weekday: string; sunday: string };

type ReportData = {
  user: User;
  year: number;
  month: number;
  days: Map<string, DayBreakdown>;
  workDays: Map<string, WorkDay>;
  paidHours: Map<number, PaidHours>;
  holidays: Set<string>;
  overtimeLabels: OvertimeLabels;
};

// Aba 1 — Ponto: um dia por linha, do dia 21 ao dia 20.
const buildTimesheetSheet = (
  workbook: ExcelJS.Workbook,
  data: ReportData,
): void => {
  const { user, year, month, days, workDays, holidays, overtimeLabels } = data;
  const sheet = workbook.addWorksheet('Ponto');
  const { start, end } = getCycleRange(year, month);

  sheet.columns = [
    { width: 10 },
    { width: 14 },
    { width: 5 },
    { width: 5 },
    { width: 5 },
    { width: 6 },
    ...Array.from({ length: HOUR_BLOCKS * 3 }, () => ({ width: 8 })),
    { width: 16 },
    { width: 28 },
    ...Array.from({ length: 6 }, () => ({ width: 8 })),
  ];

  const info = (
    row: number,
    labelCols: [number, number],
    label: string,
    valueCols: [number, number],
    value: string,
  ) => {
    mergeWithValue(sheet, row, labelCols[0], labelCols[1], label).font = {
      bold: true,
    };
    mergeWithValue(sheet, row, valueCols[0], valueCols[1], value);
  };
  info(1, [1, 1], 'Nome:', [2, 6], user.name);
  info(1, [7, 8], 'RG:', [9, 12], user.rg ?? '');
  info(1, [13, 15], 'Telefone:', [16, 20], user.phone);
  info(2, [1, 1], 'Nº de Registro:', [2, 6], user.registrationNumber ?? '');
  info(2, [7, 8], 'CPF:', [9, 12], formatCpf(user.cpf));
  info(2, [13, 15], 'Email:', [16, 20], user.email);
  info(
    3,
    [1, 1],
    'Mês/Ano:',
    [2, 6],
    `${CYCLE_LABELS[month - 1]} ${year} (${dayjs(start).format(
      'DD/MM/YYYY',
    )} a ${dayjs(end).format('DD/MM/YYYY')})`,
  );
  info(
    3,
    [7, 8],
    'Data de Admissão:',
    [9, 12],
    formatDateOnly(user.admissionDate),
  );

  // Cabeçalho em duas linhas (4 e 5).
  const singleHeaders: [number, string][] = [
    [1, 'Data'],
    [2, 'Dia da Semana'],
    [3, 'Banco de Horas'],
    [4, 'Feriado'],
    [5, 'RDO Pendente'],
    [6, 'Campo'],
    [19, 'Cliente'],
    [20, 'Projeto'],
    [21, 'Total'],
    [22, '20%'],
    [25, overtimeLabels.weekday],
    [26, overtimeLabels.sunday],
  ];
  for (const [col, title] of singleHeaders) {
    mergeWithValue(sheet, 4, col, col, title, 5);
  }
  for (let block = 0; block < HOUR_BLOCKS; block++) {
    const col = 7 + block * 3;
    mergeWithValue(sheet, 4, col, col + 2, `Hora 0${block + 1}`);
    sheet.getRow(5).getCell(col).value = 'Entrada';
    sheet.getRow(5).getCell(col + 1).value = 'Saída';
    sheet.getRow(5).getCell(col + 2).value = 'Intervalo';
  }
  mergeWithValue(sheet, 4, 23, 24, '30%');
  sheet.getRow(5).getCell(23).value = 'E';
  sheet.getRow(5).getCell(24).value = 'N. E.';
  for (let col = 3; col <= 6; col++) {
    sheet.getRow(4).getCell(col).alignment = { textRotation: 90 };
  }
  styleRange(sheet, 4, 1, 5, 26, headerStyle);
  sheet.getRow(4).height = 70;

  const firstDayRow = 6;
  let rowNumber = firstDayRow;
  for (
    let date = dayjs(start);
    !date.isAfter(end, 'day');
    date = date.add(1, 'day')
  ) {
    const key = date.format('YYYY-MM-DD');
    const day = days.get(key);
    const workDay = workDays.get(key);
    const isHoliday = holidays.has(key);
    const row = sheet.getRow(rowNumber);

    row.getCell(1).value = date.format('DD/MM/YY');
    row.getCell(2).value = WEEKDAY_NAMES[date.day()];
    row.getCell(3).value = day && day.bankMinutes > 0 ? 'X' : '';
    row.getCell(4).value = isHoliday ? 'X' : '';
    row.getCell(5).value = workDay?.rdoPending ? 'X' : '';
    row.getCell(6).value = hazardLabel(workDay?.hazardType);

    const segments = day ? buildSegments(day.entries) : [];
    segments.slice(0, HOUR_BLOCKS).forEach((segment, index) => {
      const col = 7 + index * 3;
      if (segment.start) {
        row.getCell(col).value = toExcelDuration(brtMinuteOfDay(segment.start));
        row.getCell(col).numFmt = CLOCK_FORMAT;
      }
      if (segment.end) {
        row.getCell(col + 1).value = toExcelDuration(
          brtMinuteOfDay(segment.end),
        );
        row.getCell(col + 1).numFmt = CLOCK_FORMAT;
      }
      const nextStart = segments[index + 1]?.start;
      if (segment.end && nextStart) {
        row.getCell(col + 2).value = toExcelDuration(
          dayjs(nextStart).diff(segment.end, 'minute'),
        );
        row.getCell(col + 2).numFmt = DURATION_FORMAT;
      }
    });

    row.getCell(19).value = workDay?.client ?? '';
    row.getCell(20).value = workDay?.project ?? '';

    if (day) {
      const metrics = calculateDayMetrics(day, workDay);
      const values = [
        metrics.worked,
        metrics.night,
        metrics.hazardE,
        metrics.hazardNE,
        metrics.overtimeWeekday,
        metrics.overtimeSunday,
      ];
      values.forEach((minutes, index) => {
        const cell = row.getCell(21 + index);
        cell.value = toExcelDuration(minutes);
        cell.numFmt = DURATION_FORMAT;
      });
    }

    const isOffDay = isHoliday || date.day() === 0 || date.day() === 6;
    styleRange(sheet, rowNumber, 1, rowNumber, 26, (cell) => {
      cell.border = BORDER;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      if (isOffDay) cell.fill = OFF_DAY_FILL;
    });
    rowNumber++;
  }

  const lastDayRow = rowNumber - 1;
  const totalRow = sheet.getRow(rowNumber);
  mergeWithValue(sheet, rowNumber, 1, 20, 'TOTAL');
  for (let col = 21; col <= 26; col++) {
    totalRow.getCell(col).value = sumFormula(
      sheet,
      col,
      firstDayRow,
      lastDayRow,
    );
    totalRow.getCell(col).numFmt = DURATION_FORMAT;
  }
  styleRange(sheet, rowNumber, 1, rowNumber, 26, (cell) => {
    cell.font = { bold: true };
    cell.fill = TOTAL_FILL;
    cell.border = BORDER;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  sheet.views = [{ state: 'frozen', xSplit: 2, ySplit: 5 }];
};

// Aba 2 — Banco de Horas: totais por mês de ciclo do ano, semestres e ano.
const buildHourBankSheet = (
  workbook: ExcelJS.Workbook,
  data: ReportData,
  metricsByMonth: Map<number, Metrics>,
): void => {
  const { year, month, paidHours, overtimeLabels } = data;
  const sheet = workbook.addWorksheet('Banco de Horas');
  sheet.columns = [
    { width: 14 },
    ...Array.from({ length: 6 }, () => ({ width: 11 })),
    { width: 2 },
    ...Array.from({ length: 3 }, () => ({ width: 11 })),
    { width: 2 },
    ...Array.from({ length: 3 }, () => ({ width: 11 })),
  ];
  const valueCols = [2, 3, 4, 5, 6, 7, 9, 10, 11, 13, 14, 15];

  const title = mergeWithValue(sheet, 1, 1, 15, 'BANCO DE HORAS');
  title.font = { bold: true, size: 16 };
  title.alignment = { horizontal: 'center' };

  mergeWithValue(sheet, 2, 1, 1, 'PERÍODO', 3);
  mergeWithValue(sheet, 2, 2, 7, 'TOTAL DE HORAS POR MÊS');
  mergeWithValue(sheet, 2, 9, 11, 'TOTAL DE HORAS POR MÊS CALCULADA');
  mergeWithValue(sheet, 2, 13, 15, 'TOTAL DE HORAS PAGAS');
  const subHeaders: [number, string][] = [
    [2, '0%'],
    [3, '20%'],
    [4, '30%'],
    [5, overtimeLabels.weekday],
    [6, overtimeLabels.sunday],
    [7, 'NEGATIVA'],
    [9, overtimeLabels.weekday],
    [10, overtimeLabels.sunday],
    [11, 'NEGATIVA'],
    [13, '60%'],
    [14, '70%'],
    [15, '100%'],
  ];
  for (const [col, text] of subHeaders) {
    sheet.getRow(3).getCell(col).value = text;
  }
  for (const [from, to] of [
    [1, 7],
    [9, 11],
    [13, 15],
  ]) {
    styleRange(sheet, 2, from, 3, to, headerStyle);
  }

  const firstMonthRow = 4;
  CYCLE_LABELS.forEach((label, index) => {
    const cycleMonth = index + 1;
    const rowNumber = firstMonthRow + index;
    const row = sheet.getRow(rowNumber);
    const metrics = metricsByMonth.get(cycleMonth) ?? emptyMetrics();
    const paid = paidHours.get(cycleMonth);

    row.getCell(1).value = label;
    const values = [
      metrics.worked,
      metrics.night,
      metrics.hazardE + metrics.hazardNE,
      metrics.overtimeWeekday,
      metrics.overtimeSunday,
      metrics.negative,
      metrics.paymentWeekday,
      metrics.paymentSunday,
      metrics.negative,
      paid?.paid60Minutes ?? 0,
      paid?.paid70Minutes ?? 0,
      paid?.paid100Minutes ?? 0,
    ];
    valueCols.forEach((col, i) => {
      row.getCell(col).value = toExcelDuration(values[i]);
      row.getCell(col).numFmt = DURATION_FORMAT;
    });
    for (const col of [1, ...valueCols]) {
      const cell = row.getCell(col);
      cell.border = BORDER;
      cell.alignment = { horizontal: 'center' };
      if (cycleMonth === month) cell.fill = SELECTED_MONTH_FILL;
    }
  });

  const totals: [string, number, number][] = [
    ['1º SEMESTRE', firstMonthRow, firstMonthRow + 5],
    ['2º SEMESTRE', firstMonthRow + 6, firstMonthRow + 11],
    ['ANO', firstMonthRow, firstMonthRow + 11],
  ];
  totals.forEach(([label, fromRow, toRow], index) => {
    const row = sheet.getRow(firstMonthRow + 12 + index);
    row.getCell(1).value = label;
    for (const col of valueCols) {
      row.getCell(col).value = sumFormula(sheet, col, fromRow, toRow);
      row.getCell(col).numFmt = DURATION_FORMAT;
    }
    for (const col of [1, ...valueCols]) {
      const cell = row.getCell(col);
      cell.font = { bold: true };
      cell.fill = TOTAL_FILL;
      cell.border = BORDER;
      cell.alignment = { horizontal: 'center' };
    }
  });

  const noteRow = firstMonthRow + 16;
  sheet
    .getRow(noteRow)
    .getCell(
      1,
    ).value = `Ano: ${year}. Em destaque, o mês do relatório. "Calculada" = hora extra que excedeu o teto do banco de horas e segue para pagamento.`;
  sheet.getRow(noteRow).getCell(1).font = { italic: true, size: 9 };
};

// Aba 3 — Horas Pagas: dados do funcionário, assinatura e horas pagas por mês.
const buildPaidHoursSheet = (
  workbook: ExcelJS.Workbook,
  data: ReportData,
): void => {
  const { user, year, paidHours } = data;
  const sheet = workbook.addWorksheet('Horas Pagas');
  sheet.columns = [
    { width: 18 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 12 },
    { width: 3 },
    { width: 8 },
    { width: 8 },
  ];

  const infoRows: [string, string][] = [
    ['Nome:', user.name],
    ['RG:', user.rg ?? ''],
    ['CPF:', formatCpf(user.cpf)],
    ['Data de Admissão:', formatDateOnly(user.admissionDate)],
    ['Nº de Registro:', user.registrationNumber ?? ''],
    ['Telefone:', user.phone],
    ['Email:', user.email],
    ['Assinatura', ''],
  ];
  infoRows.forEach(([label, value], index) => {
    const rowNumber = index + 1;
    const labelCell = sheet.getRow(rowNumber).getCell(1);
    labelCell.value = label;
    labelCell.font = { bold: true };
    mergeWithValue(sheet, rowNumber, 2, 5, value).alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };
    styleRange(sheet, rowNumber, 1, rowNumber, 5, (cell) => {
      cell.border = BORDER;
    });
  });
  sheet.getRow(infoRows.length).height = 60;

  const titleRow = infoRows.length + 2;
  const title = mergeWithValue(sheet, titleRow, 1, 5, 'Horas Pagas');
  title.alignment = { horizontal: 'center' };
  styleRange(sheet, titleRow, 1, titleRow, 5, headerStyle);
  sheet.getRow(titleRow).getCell(7).value = 'Ano';
  sheet.getRow(titleRow).getCell(8).value = year;
  styleRange(sheet, titleRow, 7, titleRow, 8, (cell) => {
    cell.border = BORDER;
    cell.alignment = { horizontal: 'center' };
  });

  const headerRow = titleRow + 1;
  ['Mês', 'Horas 60%', 'Horas 70%', 'Horas 100%', 'Bloq. Mês'].forEach(
    (text, index) => {
      sheet.getRow(headerRow).getCell(index + 1).value = text;
    },
  );
  styleRange(sheet, headerRow, 1, headerRow, 5, headerStyle);

  const firstMonthRow = headerRow + 1;
  CYCLE_LABELS.forEach((label, index) => {
    const row = sheet.getRow(firstMonthRow + index);
    const paid = paidHours.get(index + 1);
    row.getCell(1).value = label;
    if (paid) {
      [paid.paid60Minutes, paid.paid70Minutes, paid.paid100Minutes].forEach(
        (minutes, i) => {
          if (minutes > 0) {
            row.getCell(2 + i).value = toExcelDuration(minutes);
            row.getCell(2 + i).numFmt = DURATION_FORMAT;
          }
        },
      );
      row.getCell(5).value = paid.locked ? 'x' : '';
    }
    styleRange(
      sheet,
      firstMonthRow + index,
      1,
      firstMonthRow + index,
      5,
      (cell) => {
        cell.border = BORDER;
      },
    );
    styleRange(
      sheet,
      firstMonthRow + index,
      2,
      firstMonthRow + index,
      5,
      (cell) => {
        cell.alignment = { horizontal: 'center' };
      },
    );
  });
};

type SharedReportData = {
  holidays: Set<string>;
  policies: OvertimePolicy[];
  overtimeLabels: OvertimeLabels;
};

const loadSharedReportData = async (): Promise<SharedReportData> => {
  const [holidays, policies] = await Promise.all([
    overtimePolicyService.getHolidayDateSet(),
    overtimePolicyService.listOvertimePolicies(),
  ]);
  const percentLabel = (dayType: DayType, fallback: string): string => {
    const percentage = hourCalculationService.getPolicyPercentage(
      dayType,
      policies,
    );
    return percentage !== null ? `${Math.round(percentage * 100)}%` : fallback;
  };
  return {
    holidays,
    policies,
    overtimeLabels: {
      weekday: percentLabel(DayType.WEEKDAY, 'HE'),
      sunday: percentLabel(DayType.SUNDAY_HOLIDAY, 'HE Dom/Fer'),
    },
  };
};

const reportFileName = (user: User, year: number, month: number): string =>
  `relatorio-ponto-${slugify(user.name)}-${year}-${String(month).padStart(
    2,
    '0',
  )}.xlsx`;

// Monta o .xlsx (3 abas) de um funcionário para o mês de ciclo pedido.
const buildUserWorkbook = async (
  user: User,
  year: number,
  month: number,
  shared: SharedReportData,
): Promise<Buffer> => {
  // O ano de ciclo vai de 21/12 do ano anterior a 20/12 do ano pedido.
  const yearStart = getCycleRange(year, 1).start;
  const yearEnd = getCycleRange(year, 12).end;
  const endOfYearEnd = new Date(
    keyToDateOnly(yearEnd).getTime() + 24 * HOUR_MS + BRT_OFFSET_MS,
  );

  const [entries, workDayList, paidHoursList] = await Promise.all([
    timeEntryRepository.getEntriesForUser(user.id, endOfYearEnd),
    timesheetRepository.listWorkDays(
      user.id,
      keyToDateOnly(yearStart),
      keyToDateOnly(yearEnd),
    ),
    timesheetRepository.listPaidHours(user.id, year),
  ]);

  const { days } = hourCalculationService.calculatePeriodBreakdown(
    user,
    entries,
    shared.holidays,
    shared.policies,
    yearStart,
  );

  const data: ReportData = {
    user,
    year,
    month,
    days: new Map(
      days.filter((day) => day.date <= yearEnd).map((day) => [day.date, day]),
    ),
    workDays: new Map(
      workDayList.map((workDay) => [dateOnlyToKey(workDay.date), workDay]),
    ),
    paidHours: new Map(paidHoursList.map((paid) => [paid.month, paid])),
    holidays: shared.holidays,
    overtimeLabels: shared.overtimeLabels,
  };

  const metricsByMonth = new Map<number, Metrics>();
  for (const day of data.days.values()) {
    const cycle = getCycleOf(day.date);
    if (cycle.year !== year) continue;
    if (!metricsByMonth.has(cycle.month)) {
      metricsByMonth.set(cycle.month, emptyMetrics());
    }
    addMetrics(
      metricsByMonth.get(cycle.month),
      calculateDayMetrics(day, data.workDays.get(day.date)),
    );
  }

  const workbook = new ExcelJS.Workbook();
  buildTimesheetSheet(workbook, data);
  buildHourBankSheet(workbook, data, metricsByMonth);
  buildPaidHoursSheet(workbook, data);
  return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
};

const generateTimesheetReport = async (
  actingUser: User,
  query: ReportQueryDto,
): Promise<{ buffer: Buffer; fileName: string }> => {
  Logger.log(`Generating timesheet report`, 'generateTimesheetReport');
  const { userId, year, month } = validateReportQuery(query);

  await assertCanAccessEmployee(actingUser, userId);
  const user = (await userRepository.getOneUser({ id: userId })) as User;
  if (!user) {
    Logger.error(`User ${userId} not found`, 'generateTimesheetReport');
    throw new NotFoundException('Usuário Não Encontrado');
  }

  const buffer = await buildUserWorkbook(
    user,
    year,
    month,
    await loadSharedReportData(),
  );
  Logger.log(`Timesheet report generated`, 'generateTimesheetReport');
  return { buffer, fileName: reportFileName(user, year, month) };
};

// Um .xlsx por funcionário ativo (só perfil Funcionário), todos dentro de uma pasta num .zip
// (o navegador não cria pastas: ao extrair o .zip, o RH tem a pasta).
const generateAllTimesheetReports = async (
  query: AllReportsQueryDto,
): Promise<{ buffer: Buffer; fileName: string }> => {
  Logger.log(`Generating all timesheet reports`, 'generateAllTimesheetReports');
  const { year, month } = validateAllReportsQuery(query);

  const { users } = await userRepository.getUsers({
    active: true,
    role: Role.FUNCIONARIO,
    sortBy: 'name',
    sortType: 'asc',
    page: 1,
    limit: 10000,
  } as any);
  if (users.length === 0) {
    throw new NotFoundException('Nenhum funcionário ativo encontrado');
  }

  const shared = await loadSharedReportData();
  const folderName = `relatorios-ponto-${year}-${String(month).padStart(
    2,
    '0',
  )}`;
  const zip = new JSZip();
  const folder = zip.folder(folderName);
  const usedNames = new Set<string>();

  // Sequencial para não abrir centenas de consultas ao banco de uma vez.
  for (const user of users) {
    let fileName = reportFileName(user, year, month);
    // Homônimos: acrescenta o fim do id para não sobrescrever o arquivo.
    if (usedNames.has(fileName)) {
      fileName = fileName.replace('.xlsx', `-${user.id.slice(0, 8)}.xlsx`);
    }
    usedNames.add(fileName);
    folder.file(fileName, await buildUserWorkbook(user, year, month, shared));
  }

  const buffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  });
  Logger.log(
    `${users.length} timesheet reports generated`,
    'generateAllTimesheetReports',
  );
  return { buffer, fileName: `${folderName}.zip` };
};

const reportService = {
  generateTimesheetReport,
  generateAllTimesheetReports,
};

export default reportService;
