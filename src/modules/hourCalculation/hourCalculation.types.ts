import { DayType, TimeEntry } from '@prisma/client';

export type DayBreakdown = {
  date: string; // YYYY-MM-DD (dia calendário, referência BRT)
  dayType: DayType;
  workedMinutes: number;
  expectedMinutes: number;
  balanceMinutes: number; // workedMinutes - expectedMinutes (pode ser negativo)
  bankMinutes: number; // parte do excedente destinada ao banco de horas (respeita o teto)
  paymentMinutes: number; // parte do excedente que ultrapassou o teto do banco
  paymentPercentage: number | null; // % de adicional aplicável às paymentMinutes
  bankBalanceAfter: number; // saldo do banco de horas após este dia, em minutos
  entries: TimeEntry[];
};

export type PeriodBalanceResult = {
  currentBankBalanceMinutes: number;
  days: DayBreakdown[];
};
