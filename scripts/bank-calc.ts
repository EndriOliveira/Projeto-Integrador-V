// Calcula o banco de horas "na mão", usando exatamente o mesmo código da API.
//
// Modo 1 — cenário em arquivo (não precisa de banco de dados):
//   npm run calc:banco -- scripts/exemplos/exemplo-cliente.json
//
// Modo 2 — funcionário real (lê marcações, feriados e dias em campo do banco; precisa do .env):
//   npm run calc:banco -- --usuario funcionario@email.com [--ate 2026-10-20]
//
// Opção --dias mostra também o detalhamento dia a dia.

import { readFileSync } from 'fs';
import { PunchType, TimeEntry } from '@prisma/client';
import { CYCLE_LABELS } from '../src/shared/payrollCycle';
import hourCalculationService from '../src/modules/hourCalculation/hourCalculation.service';
import {
  BankLedgerResult,
  CycleSummary,
} from '../src/modules/hourCalculation/hourCalculation.types';

type Scenario = {
  jornadaDiaria: string; // "8:00"
  diasDaSemana: number[]; // 1 = segunda ... 7 = domingo
  inicio: string; // YYYY-MM-DD
  fim: string; // YYYY-MM-DD
  hoje?: string; // YYYY-MM-DD; padrão: dia seguinte ao fim (tudo fechado)
  feriados?: string[];
  diasEmCampo?: string[];
  horasTrabalhadas?: Record<string, string>; // { "2026-07-26": "10:00" }
  // Dias da jornada que não aparecem em horasTrabalhadas: "jornada" (trabalhou
  // exatamente a jornada) ou "falta" (não trabalhou).
  diasNaoListados?: 'jornada' | 'falta';
};

const toMinutes = (text: string): number => {
  const [hours, minutes = '0'] = text.split(':');
  return Number(hours) * 60 + Number(minutes);
};

const hhmm = (minutes: number): string => {
  const sign = minutes < 0 ? '-' : '';
  const abs = Math.abs(minutes);
  return `${sign}${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, '0')}`;
};

const addDays = (key: string, days: number): string => {
  const date = new Date(`${key}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const isoWeekday = (key: string): number => {
  const day = new Date(`${key}T12:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
};

// Gera uma entrada às 08:00 (BRT) e a saída depois das horas trabalhadas do dia.
const buildEntries = (scenario: Scenario): TimeEntry[] => {
  const entries: TimeEntry[] = [];
  const holidays = new Set(scenario.feriados ?? []);
  const worked = scenario.horasTrabalhadas ?? {};
  const dailyMinutes = toMinutes(scenario.jornadaDiaria);
  let id = 0;

  for (let key = scenario.inicio; key <= scenario.fim; key = addDays(key, 1)) {
    const isWorkday =
      scenario.diasDaSemana.includes(isoWeekday(key)) && !holidays.has(key);
    const minutes =
      key in worked
        ? toMinutes(worked[key])
        : isWorkday && scenario.diasNaoListados !== 'falta'
        ? dailyMinutes
        : 0;
    if (minutes <= 0) continue;

    const start = new Date(`${key}T11:00:00Z`);
    const end = new Date(start.getTime() + minutes * 60_000);
    entries.push(
      ...([
        { id: `${id++}`, type: PunchType.ENTRADA, deviceTimestamp: start },
        { id: `${id++}`, type: PunchType.SAIDA, deviceTimestamp: end },
      ] as TimeEntry[]),
    );
  }
  return entries;
};

const runScenario = (path: string): BankLedgerResult => {
  const scenario = JSON.parse(readFileSync(path, 'utf8')) as Scenario;
  return hourCalculationService.calculateBankLedger({
    user: {
      dailyWorkMinutes: toMinutes(scenario.jornadaDiaria),
      workWeekdays: scenario.diasDaSemana,
    },
    entries: buildEntries(scenario),
    holidayDates: new Set(scenario.feriados ?? []),
    fieldDates: new Set(scenario.diasEmCampo ?? []),
    startDate: scenario.inicio,
    endDate: scenario.fim,
    today: scenario.hoje ?? addDays(scenario.fim, 1),
  });
};

const runForUser = async (
  email: string,
  until?: string,
): Promise<BankLedgerResult> => {
  // Importados só aqui: carregam o .env e o Prisma, que o modo arquivo não usa.
  const { default: client } = await import('../src/database/client');
  const { loadBankLedger } = await import(
    '../src/modules/hourCalculation/bankLedger.loader'
  );
  const user = await client.user.findUnique({ where: { email } });
  if (!user) throw new Error(`Usuário ${email} não encontrado`);
  try {
    return await loadBankLedger(user, until);
  } finally {
    await client.$disconnect();
  }
};

const printCycle = (cycle: CycleSummary): void => {
  const label = `${CYCLE_LABELS[cycle.month - 1]}/${cycle.year}`;
  const status = cycle.closed ? 'fechado' : 'em andamento (parcial)';
  const rows: [string, number][] = [
    ['Extras a 100% (domingo/feriado)', cycle.overtime100Minutes],
    ['Extras a 60% (em campo)', cycle.overtime60Minutes],
    ['Extras só de banco', cycle.overtimeBankMinutes],
    ['Horas a menos no ciclo', -cycle.negativeMinutes],
    ['Negativa do ciclo anterior', -cycle.carriedNegativeInMinutes],
    ['Abatido de 100%', -cycle.abated100Minutes],
    ['Abatido de 60%', -cycle.abated60Minutes],
    ['Abatido do banco', -cycle.abatedBankMinutes],
    ['Pago a 100% (acima de 60h)', cycle.paid100Minutes],
    ['Pago a 60% (acima de 60h)', cycle.paid60Minutes],
    ['Pago a 70% (DEZ/JAN)', cycle.paid70Minutes],
    ['Preso no banco (até 60h)', cycle.heldMinutes],
    ['Negativa levada ao próximo ciclo', -cycle.negativeBalanceMinutes],
    ['Preso no ano do banco até aqui', cycle.heldYearMinutes],
  ];
  console.log(`\n${label} — ${cycle.start} a ${cycle.end} — ${status}`);
  for (const [text, minutes] of rows) {
    console.log(`  ${text.padEnd(36, '.')} ${hhmm(minutes).padStart(8)}`);
  }
};

const main = async (): Promise<void> => {
  const args = process.argv.slice(2);
  const option = (name: string): string | undefined => {
    const index = args.indexOf(name);
    return index >= 0 ? args[index + 1] : undefined;
  };
  const email = option('--usuario');
  const file = args.find((arg) => arg.endsWith('.json'));
  if (!email && !file) {
    console.log(
      'Uso:\n  npm run calc:banco -- <cenario.json> [--dias]\n  npm run calc:banco -- --usuario <email> [--ate YYYY-MM-DD] [--dias]',
    );
    process.exitCode = 1;
    return;
  }

  const result = email
    ? await runForUser(email, option('--ate'))
    : runScenario(file);

  if (args.includes('--dias')) {
    console.log(
      '\nData        Tipo            Trab.   Previsto  Saldo   Extra vai para',
    );
    for (const day of result.days) {
      console.log(
        `${day.date}  ${day.dayType.padEnd(14)}  ${hhmm(
          day.workedMinutes,
        ).padStart(6)}  ${hhmm(day.expectedMinutes).padStart(8)}  ${hhmm(
          day.balanceMinutes,
        ).padStart(6)}  ${day.overtimeCategory ?? ''}`,
      );
    }
  }
  result.cycles.forEach(printCycle);
};

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
