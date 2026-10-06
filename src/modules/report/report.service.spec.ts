import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { HazardType, PunchType, Role } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import * as JSZip from 'jszip';
import {
  buildDayBreakdown,
  buildUser,
  buildWorkDay,
  fullDay,
  punch,
} from '../../../test/factories';
import overtimePolicyService from '../overtimePolicy/overtimePolicy.service';
import timeEntryRepository from '../timeEntry/timeEntry.repository';
import timesheetRepository from '../timesheet/timesheet.repository';
import userRepository from '../user/user.repository';
import reportService, {
  buildSegments,
  calculateDayMetrics,
  calculateNightMinutes,
  formatCpf,
  hazardLabel,
  reportFileName,
  slugify,
} from './report.service';

jest.mock('../overtimePolicy/overtimePolicy.service');
jest.mock('../timeEntry/timeEntry.repository');
jest.mock('../timesheet/timesheet.repository');
jest.mock('../user/user.repository');

const timeEntryRepo = jest.mocked(timeEntryRepository);
const timesheetRepo = jest.mocked(timesheetRepository);
const userRepo = jest.mocked(userRepository);
const policyService = jest.mocked(overtimePolicyService);

const DAY = '2026-09-21';

describe('reportService', () => {
  describe('buildSegments', () => {
    it('deve formar um período por par entrada/saída', () => {
      // Arrange
      const entries = fullDay(DAY, ['08:00', '12:00', '13:00', '17:00']);

      // Act
      const segments = buildSegments(entries);

      // Assert
      expect(segments).toEqual([
        { start: entries[0].deviceTimestamp, end: entries[1].deviceTimestamp },
        { start: entries[2].deviceTimestamp, end: entries[3].deviceTimestamp },
      ]);
    });

    it('deve deixar o período aberto quando falta a saída', () => {
      // Arrange
      const entrada = punch(DAY, '08:00', PunchType.ENTRADA);

      // Act / Assert
      expect(buildSegments([entrada])).toEqual([
        { start: entrada.deviceTimestamp, end: null },
      ]);
    });

    it('deve criar período sem início quando a saída não tem entrada', () => {
      // Arrange
      const saida = punch(DAY, '17:00', PunchType.SAIDA);

      // Act / Assert
      expect(buildSegments([saida])).toEqual([
        { start: null, end: saida.deviceTimestamp },
      ]);
    });
  });

  describe('calculateNightMinutes', () => {
    const segment = (from: string, to: string, toDate = DAY) => ({
      start: punch(DAY, from, PunchType.ENTRADA).deviceTimestamp,
      end: punch(toDate, to, PunchType.SAIDA).deviceTimestamp,
    });

    it('deve ser zero quando o período é todo diurno', () => {
      // Act / Assert
      expect(calculateNightMinutes([segment('08:00', '17:00')])).toBe(0);
    });

    it('deve contar só a parte depois das 22h (BRT)', () => {
      // Act / Assert
      expect(calculateNightMinutes([segment('20:00', '23:30')])).toBe(90);
    });

    it('deve contar das 22h às 5h quando o período atravessa a madrugada', () => {
      // Act / Assert
      expect(
        calculateNightMinutes([segment('21:00', '06:00', '2026-09-22')]),
      ).toBe(7 * 60);
    });

    it('deve ignorar períodos abertos', () => {
      // Act / Assert
      expect(calculateNightMinutes([{ start: new Date(), end: null }])).toBe(0);
    });
  });

  describe('calculateDayMetrics', () => {
    it.each([
      ['H60', { overtime60: 60, overtime100: 0, overtimeBank: 0 }],
      ['H100', { overtime60: 0, overtime100: 60, overtimeBank: 0 }],
      ['BANK', { overtime60: 0, overtime100: 0, overtimeBank: 60 }],
    ] as const)(
      'deve lançar a hora extra da categoria %s na coluna correspondente',
      (overtimeCategory, expected) => {
        // Arrange
        const day = buildDayBreakdown({
          workedMinutes: 540,
          balanceMinutes: 60,
          overtimeMinutes: 60,
          overtimeCategory,
        });

        // Act
        const metrics = calculateDayMetrics(day, undefined);

        // Assert
        expect(metrics).toMatchObject({
          worked: 540,
          negative: 0,
          ...expected,
        });
      },
    );

    it('deve lançar as negativas do dia na coluna Negativa', () => {
      // Act
      const metrics = calculateDayMetrics(
        buildDayBreakdown({ balanceMinutes: -30, negativeMinutes: 30 }),
        undefined,
      );

      // Assert
      expect(metrics).toMatchObject({
        negative: 30,
        overtime60: 0,
        overtime100: 0,
        overtimeBank: 0,
      });
    });

    it.each([
      [HazardType.ELETRICO, { hazardE: 480, hazardNE: 0 }],
      [HazardType.NAO_ELETRICO, { hazardE: 0, hazardNE: 480 }],
      [null, { hazardE: 0, hazardNE: 0 }],
    ])(
      'deve lançar o dia inteiro na periculosidade %s do apontamento',
      (hazardType, expected) => {
        // Act
        const metrics = calculateDayMetrics(
          buildDayBreakdown({ workedMinutes: 480 }),
          buildWorkDay({ hazardType }),
        );

        // Assert
        expect(metrics).toMatchObject(expected);
      },
    );
  });

  describe('formatação', () => {
    it('deve formatar CPF com 11 dígitos e manter os demais como estão', () => {
      // Act / Assert
      expect(formatCpf('52998224725')).toBe('529.982.247-25');
      expect(formatCpf('123')).toBe('123');
    });

    it.each([
      [HazardType.ELETRICO, 'E'],
      [HazardType.NAO_ELETRICO, 'NE'],
      [null, ''],
    ])('deve rotular a periculosidade %s como "%s"', (hazardType, expected) => {
      // Act / Assert
      expect(hazardLabel(hazardType)).toBe(expected);
    });

    it('deve gerar slug sem acentos e em minúsculas', () => {
      // Act / Assert
      expect(slugify('  João Conceição d’Ávila ')).toBe(
        'joao-conceicao-davila',
      );
    });

    it('deve nomear o arquivo com o funcionário, o ano e o mês com dois dígitos', () => {
      // Act / Assert
      expect(reportFileName(buildUser({ name: 'Maria Silva' }), 2026, 3)).toBe(
        'relatorio-ponto-maria-silva-2026-03.xlsx',
      );
    });
  });

  describe('geração dos arquivos', () => {
    const rh = buildUser({ id: 'rh-1', role: Role.RH });
    const funcionario = buildUser({ id: 'func-1', name: 'Maria Silva' });

    beforeEach(() => {
      jest.resetAllMocks();
      policyService.getHolidayDateSet.mockResolvedValue(new Set());
      policyService.listOvertimePolicies.mockResolvedValue([]);
      timeEntryRepo.getEntriesForUser.mockResolvedValue(
        fullDay(DAY, ['08:00', '12:00', '13:00', '17:00']),
      );
      timesheetRepo.listWorkDays.mockResolvedValue([]);
      timesheetRepo.listPaidHours.mockResolvedValue([]);
    });

    describe('generateTimesheetReport', () => {
      it('deve gerar um .xlsx com as abas Ponto, Banco de Horas e Horas Pagas', async () => {
        // Arrange
        userRepo.getOneUser.mockResolvedValue(funcionario);

        // Act
        const { buffer, fileName } =
          await reportService.generateTimesheetReport(rh, {
            userId: 'func-1',
            year: '2026',
            month: '10',
          } as never);

        // Assert
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);
        expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
          'Ponto',
          'Banco de Horas',
          'Horas Pagas',
        ]);
        expect(fileName).toBe('relatorio-ponto-maria-silva-2026-10.xlsx');
      });

      it('deve buscar as marcações do ano de ciclo (21/12 anterior a 20/12)', async () => {
        // Arrange
        userRepo.getOneUser.mockResolvedValue(funcionario);

        // Act
        await reportService.generateTimesheetReport(rh, {
          userId: 'func-1',
          year: '2026',
          month: '10',
        } as never);

        // Assert
        expect(timesheetRepo.listWorkDays).toHaveBeenCalledWith(
          'func-1',
          new Date('2025-12-21T00:00:00.000Z'),
          new Date('2026-12-20T00:00:00.000Z'),
        );
        expect(timesheetRepo.listPaidHours).toHaveBeenCalledWith(
          'func-1',
          2026,
        );
      });

      it('deve lançar Forbidden quando o funcionário pede o relatório de outro', async () => {
        // Act / Assert
        await expect(
          reportService.generateTimesheetReport(funcionario, {
            userId: 'func-2',
            year: '2026',
            month: '10',
          } as never),
        ).rejects.toThrow(ForbiddenException);
      });

      it('deve lançar NotFound quando o funcionário não existe', async () => {
        // Arrange
        userRepo.getOneUser.mockResolvedValue(null);

        // Act / Assert
        await expect(
          reportService.generateTimesheetReport(rh, {
            userId: 'x',
            year: '2026',
            month: '10',
          } as never),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('generateAllTimesheetReports', () => {
      it('deve gerar um .zip com uma pasta e um .xlsx por funcionário ativo', async () => {
        // Arrange
        userRepo.getUsers.mockResolvedValue({
          users: [
            buildUser({ id: 'aaaaaaaa-1', name: 'Ana Souza' }),
            buildUser({ id: 'bbbbbbbb-2', name: 'Bruno Lima' }),
          ],
        } as never);

        // Act
        const { buffer, fileName } =
          await reportService.generateAllTimesheetReports({
            year: '2026',
            month: '10',
          } as never);

        // Assert
        const zip = await JSZip.loadAsync(buffer);
        expect(fileName).toBe('relatorios-ponto-2026-10.zip');
        expect(
          Object.keys(zip.files).filter((name) => name.endsWith('.xlsx')),
        ).toEqual([
          'relatorios-ponto-2026-10/relatorio-ponto-ana-souza-2026-10.xlsx',
          'relatorios-ponto-2026-10/relatorio-ponto-bruno-lima-2026-10.xlsx',
        ]);
      });

      it('deve incluir só usuários ativos com perfil Funcionário', async () => {
        // Arrange
        userRepo.getUsers.mockResolvedValue({ users: [funcionario] } as never);

        // Act
        await reportService.generateAllTimesheetReports({
          year: '2026',
          month: '10',
        } as never);

        // Assert
        expect(userRepo.getUsers).toHaveBeenCalledWith(
          expect.objectContaining({ active: true, role: Role.FUNCIONARIO }),
        );
      });

      it('deve diferenciar os arquivos de homônimos pelo início do id', async () => {
        // Arrange
        userRepo.getUsers.mockResolvedValue({
          users: [
            buildUser({ id: 'aaaaaaaa-1', name: 'Ana Souza' }),
            buildUser({ id: 'cccccccc-3', name: 'Ana Souza' }),
          ],
        } as never);

        // Act
        const { buffer } = await reportService.generateAllTimesheetReports({
          year: '2026',
          month: '10',
        } as never);

        // Assert
        const zip = await JSZip.loadAsync(buffer);
        expect(Object.keys(zip.files)).toContain(
          'relatorios-ponto-2026-10/relatorio-ponto-ana-souza-2026-10-cccccccc.xlsx',
        );
      });

      it('deve lançar NotFound quando não há funcionários ativos', async () => {
        // Arrange
        userRepo.getUsers.mockResolvedValue({ users: [] } as never);

        // Act / Assert
        await expect(
          reportService.generateAllTimesheetReports({
            year: '2026',
            month: '10',
          } as never),
        ).rejects.toThrow(NotFoundException);
      });
    });
  });
});
