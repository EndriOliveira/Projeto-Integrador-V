<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="200" alt="Nest Logo" /></a>
</p>

<p align="center">Projeto Integrador: Análise de Soluções de Tecnologia da Informação</p>
  
## Turma - 5 NC 5S2022 

## Integrantes

- Endrio Oliveira
- Natalia Dinareli
- Rael Souza
- Raquel Aparecida


## Descrição

Trabalho de Projeto Integrador do curso de Tecnólogo em Análise e Desenvolvimento de Sistemas para composição da nota. Sistema com foco empresarial para registro de horários durante a jornada de trabalho. 

## Instalação

Para instalação das depêndencias listadas no arquivo package.json
```bash
$ npm install
```

Para execução do prisma e atualização do banco de dados (necessita .env)
```bash
$ npm run prisma:migrate
```

Para execução do prisma e atualização do cliente (necessita .env)
```bash
$ npm run prisma:generate
```

Para execução do prisma e criação de primeiro usuário (necessita .env)
```bash
$ npm run seed
```

## Executando a aplicação

Após criação de um arquivo de variáveis de ambiente (.env):

```bash
# Desenvolvimento
$ npm run start

# Modo de sentinela
$ npm run start:dev

# Modo de produção
$ npm run start:prod
```


## Testes

```bash
# Testes unitários
$ npm run test

# Com cobertura
$ npm run test:cov
```

Os testes do cálculo do banco de horas ficam em `src/modules/hourCalculation/hourCalculation.service.spec.ts`.

## Banco de horas

Regra aplicada por mês de ciclo (dia 21 de um mês ao dia 20 do seguinte):

1. A hora extra de cada dia vai para um saldo:
   - **100%**: domingo ou feriado (feriado não tem jornada prevista);
   - **60%**: dia em campo, ou seja, com periculosidade (E / N.E.) marcada no apontamento do dia (coluna "Campo" do Relatório);
   - **banco**: demais dias, sem adicional.
2. As horas a menos do ciclo (falta sem marcação conta o dia inteiro), somadas à negativa que veio do ciclo anterior, são abatidas hora a hora: primeiro do saldo de 100%, depois do de 60%, por último do banco.
3. O que não tiver de onde abater fica **negativo** e passa para o próximo ciclo (não é descontado do salário).
4. No fechamento, até **60h ficam presas** no banco anual. O que passar é pago primeiro a 100%, depois a 60%. No ciclo **DEZ/JAN**, o restante é pago a 70%. Horas só de banco acima de 60h nos outros meses continuam presas.
5. O ano do banco fecha no **DEZ/JAN**, quando o RH paga o preso a 70% (lançado na tela de Horas Pagas); o ano seguinte começa do zero.

O dia de hoje ainda não gera negativa. O cálculo começa no cadastro do funcionário no sistema (ou na primeira marcação, se anterior), nunca antes da admissão.

### Rodando o cálculo na mão

O script `scripts/bank-calc.ts` usa exatamente o mesmo código da API.

**A partir de um cenário em arquivo** (não precisa de banco de dados):

```bash
$ npm run calc:banco -- scripts/exemplos/exemplo-cliente.json

# com o detalhamento dia a dia
$ npm run calc:banco -- scripts/exemplos/exemplo-cliente.json --dias
```

Formato do arquivo (veja `scripts/exemplos/exemplo-cliente.json`):

| Campo | Descrição |
|---|---|
| `jornadaDiaria` | Jornada do dia, ex.: `"8:00"` |
| `diasDaSemana` | Dias com jornada: 1 = segunda ... 7 = domingo |
| `inicio` / `fim` | Período calculado (`YYYY-MM-DD`) |
| `hoje` | Opcional. Dia em andamento (sem negativa); padrão: o dia seguinte a `fim`, deixando tudo fechado |
| `feriados` | Datas de feriado |
| `diasEmCampo` | Datas com trabalho em campo (extra a 60%) |
| `horasTrabalhadas` | Horas trabalhadas por data, ex.: `{ "2026-07-26": "10:00", "2026-07-27": "0:00" }` |
| `diasNaoListados` | Dias de jornada fora de `horasTrabalhadas`: `"jornada"` (trabalhou a jornada exata) ou `"falta"` |

O exemplo reproduz o caso combinado com o cliente: 10h a 100%, 70h a 60% e 15h a menos no ciclo JUL/AGO resultam em 10h abatidas de 100%, 5h de 60%, **60h presas** e **5h pagas a 60%**.

**Para um funcionário cadastrado** (lê marcações, feriados e dias em campo do banco; precisa do `.env`):

```bash
$ npm run calc:banco -- --usuario funcionario@email.com

# até uma data e com o detalhamento dia a dia
$ npm run calc:banco -- --usuario funcionario@email.com --ate 2026-10-20 --dias
```

Com `NODE_ENV=development` o Prisma imprime as consultas SQL; para uma saída limpa, rode com `NODE_ENV=homolog`.

## Licença
[Licença MIT](LICENSE)

## Links
- <a href="https://www.figma.com/file/Uk1FSjLf7CGRasDcUOrM5W/PIV?type=design&node-id=0-1&mode=design">Figma</a>
- <a href="https://github.com/EndriOliveira/Projeto-Integrador-V-Frontend">Frontend</a>
- <a href="https://github.com/EndriOliveira/Projeto-Integrador-V">Backend</a>
