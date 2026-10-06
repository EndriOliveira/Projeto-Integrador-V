# Testes unitários — padrão do sistema

Vale para os dois repositórios: este (backend, NestJS + **Jest**) e o
`Projeto-Integrador-V-App` (web, mobile e `packages/shared`, com **Vitest**).
As APIs do Jest e do Vitest são equivalentes (`describe`, `it`, `expect`,
`jest.fn`/`vi.fn`), então os testes seguem exatamente o mesmo formato.

## Como rodar

| Repositório | Comando | Observações |
| --- | --- | --- |
| Backend | `npm test` | `npm run test:watch`, `npm run test:cov` (cobertura em `coverage/`) |
| App | `npm test` (na raiz) | `npm run test:watch`; roda shared, mobile e web juntos |

Nenhum dos dois precisa de banco, `.env` ou servidor rodando: repositórios,
API e módulos nativos são sempre mockados.

## Onde fica cada coisa

- O teste fica **ao lado do código**, com o mesmo nome e sufixo `.spec.ts`
  (`timeEntry.service.ts` → `timeEntry.service.spec.ts`).
- Fábricas de dados e helpers ficam em `test/` na raiz de cada repositório
  (`test/factories.ts`) — fora do build de produção.
- Backend: `test/setupEnv.ts` define as variáveis de ambiente e silencia o
  `Logger`; `test/globalSetup.js` fixa o fuso em **UTC** (o servidor roda em UTC
  e o código aplica o "BRT ad-hoc" UTC-3 em cima disso).
- App: `vitest.config.mts` fixa o fuso em **America/Sao_Paulo** (as telas
  mostram horário local do aparelho); `test/setup.ts` desmonta os hooks entre
  testes.

## Formato de cada teste

```ts
describe('timeEntryService', () => {          // unidade (arquivo)
  describe('createManualTimeEntry', () => {   // função/método
    it('deve lançar BadRequest quando o mês da marcação está bloqueado pelo RH', async () => {
      // Arrange
      timesheetRepo.getOnePaidHours.mockResolvedValue(buildPaidHours({ locked: true }));

      // Act / Assert
      await expect(timeEntryService.createManualTimeEntry(funcionario, body)).rejects.toThrow(
        'Mês bloqueado pelo RH',
      );
      expect(repo.createTimeEntry).not.toHaveBeenCalled();
    });
  });
});
```

1. **Um cenário por `it`**, com o nome no formato
   **"deve \<resultado esperado\> quando \<cenário\>"**, em português.
2. Corpo em três blocos comentados: `// Arrange`, `// Act`, `// Assert`
   (junte `// Act / Assert` quando a chamada é a própria asserção).
3. Variações do mesmo cenário com tabela: `it.each([...])('deve ... %s', ...)`.
4. Dados sempre pelas fábricas (`buildUser`, `buildTimeEntry`, `punch`,
   `fullDay`, `buildPaidHours`...), sobrescrevendo só o que importa para o cenário.
5. Datas fixas: nunca dependa do relógio real. Use `jest.useFakeTimers().setSystemTime(NOW)`
   (backend) ou `vi.useFakeTimers({ toFake: ['Date'] })` + `vi.setSystemTime(NOW)` (app).
6. Em cenários de erro, verifique também o **efeito colateral que não pode
   acontecer** (ex.: nada foi gravado, a auditoria não foi criada).

## Mocks

- **Backend:** repositórios e serviços vizinhos com automock do Jest,
  `jest.mock('./timeEntry.repository')` + `const repo = jest.mocked(timeEntryRepository)`,
  e `jest.resetAllMocks()` no `beforeEach`.
- **App:** a API com `buildApiMock()` (todos os endpoints como `vi.fn()` tipados);
  módulos do Expo/React Native (`expo-location`, `expo-network`, `AsyncStorage`)
  com `vi.mock(...)`; `fetch` com `vi.stubGlobal('fetch', ...)`.
- Testes de hooks declaram `// @vitest-environment jsdom` na primeira linha e usam
  `renderHook`/`waitFor`/`act` do `@testing-library/react`. Ao usar `waitFor`,
  espere por algo que **só é verdade depois** da ação (o estado inicial do hook
  pode já satisfazer a condição e o teste passa por acaso).

## O que testar

Regras de negócio e decisões — não o framework. Prioridade:

1. Funções puras de regra (ciclo da folha 21→20, cálculo de horas e banco com
   teto de 60h, adicional noturno, tipo da próxima marcação, formatação de datas).
2. Serviços: cada caminho de permissão (RH / Gestor / Funcionário), cada
   validação que lança erro e cada efeito gravado (marcação, auditoria, bloqueio).
3. Hooks e cliente HTTP do app: sessão offline, renovação de token, fila offline.

Controllers, DTOs, repositórios (acesso ao Prisma) e telas não têm teste
unitário: são finos ou dependem de banco/renderização e ficam para testes de
integração/end-to-end.
