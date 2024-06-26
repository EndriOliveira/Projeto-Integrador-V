import { BadRequestException, Logger } from '@nestjs/common';

export const validateCPF = (cpf: string): boolean => {
  Logger.log('Validating CPF', 'validateCPF');
  cpf = cpf.replace(/\.|-/g, '');
  if (!/^(?!([0-9])\1{10}$)\d{11}$/.test(cpf)) {
    Logger.error('Invalid CPF', 'validateCPF');
    throw new BadRequestException('CPF Inválido');
  }
  if (!validateFirstDigit(cpf)) {
    Logger.error('Invalid CPF', 'validateCPF');
    throw new BadRequestException('CPF Inválido');
  }
  if (!validateSecondDigit(cpf)) {
    Logger.error('Invalid CPF', 'validateCPF');
    throw new BadRequestException('CPF Inválido');
  }
  return true;
};

const validateFirstDigit = (cpf: string): boolean => {
  let firstDigit = (Number(sumFirstDigit(cpf)) * 10) % 11;
  firstDigit = firstDigit == 10 || firstDigit == 11 ? 0 : firstDigit;
  if (firstDigit != Number(cpf[9])) return false;
  return true;
};

const validateSecondDigit = (cpf: string): boolean => {
  let secondDigit = (Number(sumSecondDigit(cpf)) * 10) % 11;
  secondDigit = secondDigit == 10 || secondDigit == 11 ? 0 : secondDigit;
  if (secondDigit != Number(cpf[10])) return false;
  return true;
};

const sumFirstDigit = (cpf: string, position = 0, sum = 0): number => {
  if (position > 9) return 0;
  return (
    sum +
    sumFirstDigit(
      cpf,
      position + 1,
      Number(cpf[position]) * (cpf.length - 1 - position),
    )
  );
};

const sumSecondDigit = (cpf: string, position = 0, sum = 0): number => {
  if (position > 10) return 0;
  return (
    sum +
    sumSecondDigit(
      cpf,
      position + 1,
      Number(cpf[position]) * (cpf.length - position),
    )
  );
};
