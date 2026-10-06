import { BadRequestException } from '@nestjs/common';
import { validateCPF } from './validateCpf';

describe('validateCPF', () => {
  it('deve aceitar um CPF válido só com números', () => {
    // Act / Assert
    expect(validateCPF('52998224725')).toBe(true);
  });

  it('deve aceitar um CPF válido com pontos e traço', () => {
    // Act / Assert
    expect(validateCPF('529.982.247-25')).toBe(true);
  });

  it.each([
    ['com todos os dígitos iguais', '11111111111'],
    ['com menos de 11 dígitos', '5299822472'],
    ['com letras', '5299822472a'],
    ['com o primeiro dígito verificador errado', '52998224735'],
    ['com o segundo dígito verificador errado', '52998224726'],
  ])('deve lançar BadRequest quando o CPF está %s', (_, cpf) => {
    // Act / Assert
    expect(() => validateCPF(cpf)).toThrow(BadRequestException);
  });
});
