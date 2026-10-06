import {
  DayType,
  OvertimePolicy,
  PaidHours,
  PunchType,
  Role,
  TimeEntry,
  User,
  WorkDay,
} from '@prisma/client';
import { DayBreakdown } from '../src/modules/hourCalculation/hourCalculation.types';

// Fábricas de entidades para os testes: cada teste sobrescreve só o que
// importa para o cenário (padrão "build<Entidade>(overrides)").

export const buildUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-1',
  name: 'Maria da Silva',
  cpf: '52998224725',
  phone: '11999999999',
  email: 'maria@empresa.com',
  password: 'hashed-password',
  department: 'Operações',
  birthDate: new Date('1990-01-01T00:00:00.000Z'),
  role: Role.FUNCIONARIO,
  active: true,
  dailyWorkMinutes: 480,
  workWeekdays: [1, 2, 3, 4, 5],
  managerId: null,
  branch: null,
  rg: null,
  registrationNumber: null,
  admissionDate: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});

export const buildTimeEntry = (overrides: Partial<TimeEntry> = {}): TimeEntry =>
  ({
    id: 'entry-1',
    userId: 'user-1',
    type: PunchType.ENTRADA,
    deviceTimestamp: new Date('2026-09-21T11:00:00.000Z'),
    serverReceivedAt: new Date('2026-09-21T11:00:00.000Z'),
    clientGeneratedId: 'client-1',
    originatedOffline: false,
    latitude: null,
    longitude: null,
    locationCapturedAt: null,
    editedManually: false,
    deletedAt: null,
    createdAt: new Date('2026-09-21T11:00:00.000Z'),
    updatedAt: new Date('2026-09-21T11:00:00.000Z'),
    ...overrides,
  } as TimeEntry);

// Marcação num horário BRT (UTC-3) de um dia: punch('2026-09-21', '08:00').
export const punch = (
  date: string,
  brtTime: string,
  type: PunchType,
  overrides: Partial<TimeEntry> = {},
): TimeEntry =>
  buildTimeEntry({
    id: `${date}-${brtTime}-${type}`,
    type,
    deviceTimestamp: new Date(`${date}T${brtTime}:00.000-03:00`),
    ...overrides,
  });

// Jornada completa com intervalo: entrada, saída/volta do almoço e saída.
export const fullDay = (
  date: string,
  [entrada, intervaloEntrada, intervaloSaida, saida]: [
    string,
    string,
    string,
    string,
  ],
): TimeEntry[] => [
  punch(date, entrada, PunchType.ENTRADA),
  punch(date, intervaloEntrada, PunchType.INTERVALO_ENTRADA),
  punch(date, intervaloSaida, PunchType.INTERVALO_SAIDA),
  punch(date, saida, PunchType.SAIDA),
];

export const buildPolicy = (
  overrides: Partial<OvertimePolicy> = {},
): OvertimePolicy =>
  ({
    id: 'policy-1',
    dayType: DayType.WEEKDAY,
    percentage: 0.6,
    active: true,
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  } as OvertimePolicy);

export const buildPaidHours = (overrides: Partial<PaidHours> = {}): PaidHours =>
  ({
    id: 'paid-1',
    userId: 'user-1',
    year: 2026,
    month: 10,
    paid60Minutes: 0,
    paid70Minutes: 0,
    paid100Minutes: 0,
    locked: false,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  } as PaidHours);

export const buildWorkDay = (overrides: Partial<WorkDay> = {}): WorkDay =>
  ({
    id: 'workday-1',
    userId: 'user-1',
    date: new Date('2026-09-21T00:00:00.000Z'),
    client: null,
    project: null,
    hazardType: null,
    rdoPending: false,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  } as WorkDay);

export const buildDayBreakdown = (
  overrides: Partial<DayBreakdown> = {},
): DayBreakdown => ({
  date: '2026-09-21',
  dayType: DayType.WEEKDAY,
  workedMinutes: 480,
  expectedMinutes: 480,
  balanceMinutes: 0,
  overtimeMinutes: 0,
  overtimeCategory: null,
  negativeMinutes: 0,
  cycleBalanceAfter: 0,
  entries: [],
  ...overrides,
});
