import { DayType, TimeEntry } from '@prisma/client';

// Para qual saldo vai a hora extra do dia:
// - H100: domingo ou feriado (100%);
// - H60: dia em campo, ou seja, com periculosidade (E / N.E.) no apontamento (60%);
// - BANK: demais dias — só conta no banco, sem adicional.
export type OvertimeCategory = 'H100' | 'H60' | 'BANK';

export type DayBreakdown = {
  date: string; // YYYY-MM-DD (dia calendário, referência BRT)
  dayType: DayType;
  workedMinutes: number;
  expectedMinutes: number;
  balanceMinutes: number; // workedMinutes - expectedMinutes (pode ser negativo)
  overtimeMinutes: number; // parte positiva do saldo, que entra no banco do ciclo
  overtimeCategory: OvertimeCategory | null;
  negativeMinutes: number; // parte negativa do saldo (falta conta o dia inteiro)
  cycleBalanceAfter: number; // saldo do ciclo após o dia (extras - negativas), em minutos
  entries: TimeEntry[];
};

// Fechamento de um mês de ciclo (dia 21 ao dia 20).
export type CycleSummary = {
  year: number;
  month: number; // 1 = DEZ/JAN ... 12 = NOV/DEZ
  start: string;
  end: string;
  closed: boolean; // false = ciclo em andamento (valores parciais)
  overtime100Minutes: number;
  overtime60Minutes: number;
  overtimeBankMinutes: number;
  negativeMinutes: number; // negativas do próprio ciclo
  carriedNegativeInMinutes: number; // negativa que veio do ciclo anterior
  abated100Minutes: number;
  abated60Minutes: number;
  abatedBankMinutes: number;
  paid100Minutes: number; // excedente de 60h pago no fechamento
  paid60Minutes: number;
  paid70Minutes: number; // só no DEZ/JAN (fim do ano do banco)
  heldMinutes: number; // até 60h que ficam presas no banco anual
  negativeBalanceMinutes: number; // negativa sem de onde abater (vai para o próximo ciclo)
  heldYearMinutes: number; // total preso no ano do banco até este ciclo
};

export type BankLedgerResult = {
  days: DayBreakdown[];
  cycles: CycleSummary[];
};
