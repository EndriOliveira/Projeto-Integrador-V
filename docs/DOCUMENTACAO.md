# Documentação do Sistema de Controle de Ponto

Este documento descreve o que existe hoje no backend do sistema: arquitetura, modelo de
dados, papéis de acesso, regras de negócio e todos os endpoints da API. Reflete o estado
do código após a etapa de "Arquitetura e banco de dados" + "Backend/API" da proposta
técnica (`Proposta_tecnica_controle_ponto`). **O aplicativo mobile e a plataforma web
ainda não foram desenvolvidos** — este documento cobre apenas o backend/API e o banco de
dados que os sustentarão.

## 1. Visão geral

O sistema permite que funcionários registrem sua jornada de trabalho (entrada, saída e
intervalos), inclusive offline, com captura de geolocalização. RH e Gestores usam a API
para administrar funcionários, consultar marcações, acompanhar o banco de horas e gerar
relatórios em Excel.

## 2. Stack tecnológica

- **Backend:** NestJS 9 + TypeScript
- **Banco de dados:** PostgreSQL, acessado via Prisma ORM
- **Autenticação:** JWT (access token + refresh token) via Passport
- **Validação:** Zod (schemas próprios em cada módulo, além dos DTOs do Swagger)
- **Relatório:** ExcelJS (gera arquivo `.xlsx` em memória)
- **Documentação interativa:** Swagger, disponível em `/` quando o servidor está rodando
- **Padrão de código:** services como objetos de funções (não classes com DI),
  repositórios falando direto com o client Prisma singleter (`src/database/client.ts`)

## 3. Papéis de acesso (`Role`)

| Papel | Descrição |
|---|---|
| `RH` | Acesso total: cadastro/edição/inativação de usuários, associação gestor↔funcionário, regras de hora extra, feriados, relatórios de qualquer funcionário. |
| `GESTOR` | Vê e consulta apenas os funcionários vinculados a ele (`managerId`). |
| `FUNCIONARIO` | Usa a própria conta: bate ponto, consulta suas marcações e seu saldo de banco de horas. |

A checagem de papel é feita por um guard (`RolesGuard` + decorator `@Roles(...)`) nas
rotas que exigem um papel específico. Para dados de um funcionário específico (marcações,
saldo de horas, relatório), a regra de escopo é: **RH vê qualquer um; Gestor só vê quem
tem `managerId` apontando para ele; Funcionário só vê a si mesmo** (função
`assertCanAccessEmployee`, em `src/shared/access-control.ts`).

## 4. Modelo de dados

### `User`
Representa RH, Gestor e Funcionário — é a mesma tabela para os três papéis.

| Campo | Tipo | Observação |
|---|---|---|
| `id` | uuid | |
| `name`, `cpf`, `phone`, `email` | string | `cpf` e `email` são únicos |
| `password` | string | hash bcrypt; nunca retornado pela API |
| `department` | string | |
| `birthDate` | datetime | |
| `role` | `RH \| GESTOR \| FUNCIONARIO` | |
| `active` | boolean | `false` = usuário inativado (não consegue mais logar) |
| `dailyWorkMinutes` | int | jornada diária prevista, em minutos (padrão 480 = 8h) |
| `workWeekdays` | int[] | dias da semana trabalhados, 1=segunda...7=domingo (padrão seg-sex) |
| `managerId` | uuid? | gestor responsável por este usuário (auto-relacionamento) |

### `TimeEntry` (marcação de ponto)
Cada marcação é um registro individual — não existe mais um "registro do dia" agrupado.

| Campo | Tipo | Observação |
|---|---|---|
| `id` | uuid | |
| `userId` | uuid | funcionário que bateu o ponto |
| `type` | `ENTRADA \| INTERVALO_ENTRADA \| INTERVALO_SAIDA \| SAIDA` | |
| `deviceTimestamp` | datetime | horário informado pelo dispositivo no momento da marcação |
| `serverReceivedAt` | datetime | horário em que o servidor recebeu/persistiu o registro |
| `originatedOffline` | boolean | `true` quando a marcação chegou pela rota de sincronização (feita offline e enviada depois) |
| `latitude`, `longitude`, `locationCapturedAt` | float/datetime? | geolocalização no momento da marcação |
| `clientGeneratedId` | string, único | UUID gerado pelo app — evita duplicidade ao reenviar marcações |
| `editedManually` | boolean | `true` após qualquer edição manual feita por RH |
| `deletedAt` | datetime? | soft delete — marcação nunca é apagada de verdade |

### `TimeEntryAuditLog`
Registra toda edição ou exclusão manual de uma marcação: quem alterou
(`changedByUserId`), o que mudou (`previousData`/`newData` em JSON), o motivo (`reason`)
e quando. Marcações **criadas** normalmente (online ou via sync) não geram entrada aqui —
só edições/exclusões manuais feitas por RH.

### `OvertimePolicy`
Percentual de adicional de hora extra por tipo de dia, editável pelo RH.

| `dayType` | Percentual padrão (seed) |
|---|---|
| `WEEKDAY` (dia útil) | 50% |
| `SATURDAY` (sábado) | 50% |
| `SUNDAY_HOLIDAY` (domingo/feriado) | 100% |

### `Holiday`
Lista de feriados (data + nome), cadastrada pelo RH. Usada para classificar um dia como
`SUNDAY_HOLIDAY` mesmo quando não é domingo. Começa vazia — precisa ser populada.

### `Code`, `RefreshToken`
Tabelas de apoio já existentes: `Code` para os códigos de recuperação de senha (usado
por e-mail) e `RefreshToken` para os tokens de renovação de sessão.

## 5. Autenticação e segurança

- Login (`/auth/sign-in`) retorna `accessToken` (curta duração) e `refreshToken` (longa
  duração). O access token vai no header `Authorization: Bearer <token>`.
- Usuário com `active: false` não consegue logar nem usar um token já emitido (checado no
  login e em toda requisição autenticada).
- Senhas são armazenadas com hash bcrypt e **nunca** retornadas pela API (nem em
  criação/edição/listagem de usuários).
- Fluxo de "esqueci minha senha" gera um código de 6 caracteres válido por 60 minutos
  (envio por e-mail está implementado no código mas desativado — ver seção 8).
- Toda rota autenticada passa por `AuthGuard`; rotas restritas a um papel também passam
  por `RolesGuard` + `@Roles(...)`.

## 6. Regras de negócio

### 6.1 Cadastro e gestão de funcionários
- Só RH cria, edita, associa gestor e inativa usuários.
- Ao criar um usuário, o sistema gera uma senha temporária aleatória (6 caracteres) — o
  e-mail com a senha está pronto no código, mas o envio real está desligado por ora.
- CPF e e-mail são validados e precisam ser únicos.
- "Inativar" um usuário é sempre soft (`active = false`) — nunca é excluído de verdade,
  pois isso destruiria o histórico de marcações e cálculos. RH não pode inativar a si
  mesmo.
- Associação gestor↔funcionário: `PATCH /user/:id/manager`. Só é permitido apontar para
  um usuário com papel `GESTOR` ou `RH`, ativo, e um usuário não pode ser gestor de si
  mesmo.
- Gestor lista sua própria equipe em `GET /user/managed`.

### 6.2 Registro de ponto
- Cada marcação tem um tipo: `ENTRADA`, `INTERVALO_ENTRADA`, `INTERVALO_SAIDA`, `SAIDA`.
- Ao bater ponto **online** sem informar o tipo, o servidor infere automaticamente o
  próximo tipo esperado, seguindo o ciclo `ENTRADA → INTERVALO_ENTRADA → INTERVALO_SAIDA
  → SAIDA` (repete a cada nova marcação do dia, suportando múltiplos intervalos).
- Ao sincronizar marcações feitas **offline**, o tipo é obrigatório em cada item enviado
  (o app já sabe o que o usuário selecionou/mediu localmente).

### 6.3 Funcionamento offline e sincronização
- `POST /time-entries` é para marcação em tempo real (dispositivo online).
- `POST /time-entries/sync` recebe um lote de marcações feitas offline. Cada item precisa
  de um `clientGeneratedId` (gerado no app) — reenviar o mesmo id não cria duplicata: o
  servidor identifica que já existe e responde `duplicate`. Isso resolve o requisito de
  "identificadores únicos para evitar duplicidade" da proposta.
- Cada item do lote é processado independentemente: se um item falhar validação (ex.:
  horário implausível), os demais ainda são processados — a resposta traz o status de
  cada marcação individualmente (`created`, `duplicate` ou `error`).
- Marcações vindas da rota `/sync` são marcadas com `originatedOffline: true` para
  rastreabilidade.

### 6.4 Horário do dispositivo x horário do servidor
- Toda marcação guarda os dois horários: `deviceTimestamp` (o que o app informou) e
  `serverReceivedAt` (quando o servidor efetivamente recebeu).
- Validação de sanidade: o servidor rejeita marcações com `deviceTimestamp` mais de 5
  minutos no futuro (relativo ao horário do servidor) ou mais de 30 dias no passado. É
  uma estratégia propositalmente simples — a proposta deixa em aberto a definição de uma
  estratégia definitiva de conciliação, a ser validada com o cliente.

### 6.5 Geolocalização
- Cada marcação pode registrar `latitude`, `longitude` e `locationCapturedAt`. Todos
  opcionais (o app envia quando conseguir obter o GPS).

### 6.6 Banco de horas e horas extras
- Jornada prevista é por funcionário (`dailyWorkMinutes` + `workWeekdays`).
- Horas trabalhadas no dia = soma dos períodos entre marcações de início de jornada
  (`ENTRADA` ou `INTERVALO_SAIDA`) e fim de período (`INTERVALO_ENTRADA` ou `SAIDA`) —
  suporta múltiplos intervalos no mesmo dia.
- Diferença entre trabalhado e previsto = saldo do dia. Se positivo (hora extra):
  - Vai para o **banco de horas** até o teto de **60 horas** (3.600 minutos) acumuladas.
  - O que exceder o teto do banco naquele dia é classificado como **horas para
    pagamento**, com o percentual de adicional do `OvertimePolicy` daquele tipo de dia
    (útil/sábado/domingo-feriado).
- Se negativo (trabalhou menos que o previsto), fica registrado no saldo do dia, mas
  **não é debitado do banco de horas** — a proposta não define uma regra de compensação
  de déficit, então essa decisão fica em aberto para validação com o cliente.
- O saldo do banco de horas é **cumulativo desde o primeiro registro do funcionário** —
  não existe um "reset" de período. Por isso o cálculo sempre percorre todo o histórico
  até a data de referência para chegar ao saldo correto (ver `hourCalculation.service.ts`).
- Conforme o MVP definido na proposta, **não existe uma tabela de saldo pré-calculada**:
  o cálculo é feito sob demanda (ao consultar saldo ou gerar relatório), sempre a partir
  das marcações reais — isso evita saldo "desatualizado" depois de uma correção manual.
- Valor em R$ da hora extra **não é calculado** — o sistema entrega apenas
  horas/minutos e o percentual aplicável; o valor monetário depende de informação
  salarial que a proposta trata como opcional/futura.

### 6.7 Auditoria e histórico
- Marcações não são excluídas fisicamente: exclusão por RH é sempre soft
  (`deletedAt` preenchido) e some das consultas, mas o registro continua no banco.
- Toda edição ou exclusão manual feita por RH exige um `reason` (motivo) e gera um
  `TimeEntryAuditLog` com o estado anterior e o novo.

### 6.8 Relatório
- Exclusivo do RH. Período = mês de ciclo da folha, do dia 21 do mês anterior ao dia 20
  (`month = 2` é JAN/FEV). Um `.xlsx` por funcionário com três abas:
  - **Ponto:** um dia por linha — marcações (até 4 pares entrada/saída + intervalo),
    banco de horas, feriado, RDO pendente, campo, cliente, projeto, total, 20% (horas
    entre 22h e 5h), 30% E / N.E. (total do dia com periculosidade) e horas extras nas
    colunas dos percentuais cadastrados em Políticas (dia útil/sábado e domingo/feriado).
  - **Banco de Horas:** totais por mês de ciclo do ano, 1º/2º semestre e ano; "calculada"
    é a hora extra que excedeu o teto do banco e vai para pagamento.
  - **Horas Pagas:** dados do funcionário (RG, CPF, admissão, nº de registro...), campo de
    assinatura e horas pagas 60%/70%/100% com bloqueio por mês.
- `/reports/timesheet/all` gera um `.zip` com uma pasta e um `.xlsx` por usuário ativo de
  perfil Funcionário; `/reports/timesheet` gera o de um único `userId`.
- Dados que o ponto não tem são mantidos pelo RH em `/timesheet`: apontamento do dia
  (`WorkDay`: cliente, projeto, periculosidade, RDO) e horas pagas do mês (`PaidHours`).
  Mês bloqueado não aceita edição de apontamentos nem de horas pagas até ser desbloqueado.
- As colunas definitivas (formato exigido pelo cliente) ainda não foram validadas — o
  formato atual é o proposto pela análise da proposta técnica.

## 7. Endpoints da API

Todas as rotas (exceto `sign-in`, `forgot-password`, `reset-password`) exigem
`Authorization: Bearer <accessToken>`. A coluna "Papel" indica restrição além de estar
autenticado; "—" significa qualquer usuário autenticado (com escopo tratado internamente
quando aplicável).

### Auth (`/auth`)

| Método | Rota | Papel | Descrição |
|---|---|---|---|
| GET | `/auth/me` | — | Dados do usuário logado + marcações do dia + próximo tipo de marcação esperado |
| POST | `/auth/sign-in` | público | Login (e-mail + senha) |
| POST | `/auth/forgot-password` | público | Gera código de recuperação de senha |
| POST | `/auth/reset-password` | público | Redefine senha usando o código |
| POST | `/auth/logout` | — (refresh token) | Invalida o refresh token |
| PUT | `/auth/change-password` | — | Troca a própria senha (exige senha atual) |

### Refresh Token (`/refresh-token`)

| Método | Rota | Papel | Descrição |
|---|---|---|---|
| POST | `/refresh-token/new-access-token` | — (refresh token) | Gera novo access token a partir do refresh token |

### Usuários (`/user`)

| Método | Rota | Papel | Descrição |
|---|---|---|---|
| GET | `/user/managed` | GESTOR | Lista funcionários vinculados ao gestor logado |
| GET | `/user/:id` | — | Busca um usuário por id |
| POST | `/user` | RH | Cria usuário (funcionário, gestor ou RH) |
| GET | `/user` | RH | Lista/pesquisa usuários (filtros: busca livre, papel, ativo, gestor) |
| PUT | `/user/:id` | RH | Edita dados de um usuário |
| PATCH | `/user/:id/manager` | RH | Associa/remove o gestor responsável por um usuário |
| PATCH | `/user/:id/inactivate` | RH | Inativa um usuário (soft) |

### Marcações de ponto (`/time-entries`)

| Método | Rota | Papel | Descrição |
|---|---|---|---|
| POST | `/time-entries` | — | Registra uma marcação em tempo real (tipo pode ser inferido) |
| POST | `/time-entries/sync` | — | Envia um lote de marcações feitas offline (idempotente) |
| GET | `/time-entries` | — | Lista marcações (filtros: funcionário, período, tipo); escopo por papel |
| PATCH | `/time-entries/:id` | RH | Edita uma marcação manualmente (exige motivo, gera auditoria) |
| DELETE | `/time-entries/:id` | RH | Exclui (soft) uma marcação (exige motivo, gera auditoria) |

### Banco de horas (`/hour-balance`)

| Método | Rota | Papel | Descrição |
|---|---|---|---|
| GET | `/hour-balance/me` | — | Saldo do banco de horas do próprio usuário + detalhamento por dia |
| GET | `/hour-balance/:userId` | — (escopo) | Idem, para outro funcionário (RH: qualquer um; Gestor: só sua equipe) |

### Regras de hora extra e feriados (`/overtime-policies`)

| Método | Rota | Papel | Descrição |
|---|---|---|---|
| GET | `/overtime-policies` | RH | Lista os percentuais de adicional por tipo de dia |
| PATCH | `/overtime-policies/:dayType` | RH | Atualiza percentual/ativo de uma regra |
| GET | `/overtime-policies/holidays` | RH | Lista feriados cadastrados |
| POST | `/overtime-policies/holidays` | RH | Cadastra um feriado |
| DELETE | `/overtime-policies/holidays/:id` | RH | Remove um feriado |

### Relatório (`/reports`)

| Método | Rota | Papel | Descrição |
|---|---|---|---|
| GET | `/reports/timesheet` | RH | Relatório de ponto `.xlsx` de um funcionário (`userId`, `year`, `month` de ciclo) |
| GET | `/reports/timesheet/all` | RH | `.zip` com uma pasta e um `.xlsx` por funcionário ativo (`year`, `month`) |

### Dados do relatório (`/timesheet`)

| Método | Rota | Papel | Descrição |
|---|---|---|---|
| GET | `/timesheet/work-days` | RH | Apontamentos do mês de ciclo (`userId`, `year`, `month`) |
| PUT | `/timesheet/work-days` | RH | Cria/atualiza o apontamento de um dia (cliente, projeto, periculosidade, RDO) |
| GET | `/timesheet/paid-hours` | RH | Horas pagas do ano (`userId`, `year`) |
| PUT | `/timesheet/paid-hours` | RH | Cria/atualiza horas pagas de um mês e o bloqueio |

## 8. O que ainda não foi feito

- **Aplicativo mobile e plataforma web** — próxima etapa, ainda não iniciada.
- **Envio de e-mail** (senha temporária, recuperação de senha) — código pronto, mas
  desativado; falta configurar o SendGrid.
- **Valor em R$ da hora extra** — hoje o sistema só calcula horas e percentual.
- **Lista definitiva de feriados e percentuais de adicional reais** — estão com valores
  padrão da CLT até serem validados com o cliente.
- **Estratégia definitiva de conciliação entre horário do dispositivo e do servidor** —
  atualmente só há uma validação simples de faixa aceitável.
