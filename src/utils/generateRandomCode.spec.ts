import { BadRequestException } from '@nestjs/common';
import { generateRandomCode } from './generateRandomCode';

describe('generateRandomCode', () => {
  it('deve gerar 6 caracteres alfanuméricos quando chamado sem opções', () => {
    // Act
    const code = generateRandomCode();

    // Assert
    expect(code).toMatch(/^[A-Za-z0-9]{6}$/);
  });

  it('deve respeitar o tamanho pedido', () => {
    // Act
    const code = generateRandomCode({ length: 10, numbers: true });

    // Assert
    expect(code).toHaveLength(10);
  });

  it('deve usar só números quando apenas numbers está ativo', () => {
    // Act
    const code = generateRandomCode({ length: 8, numbers: true });

    // Assert
    expect(code).toMatch(/^\d{8}$/);
  });

  it('deve usar só maiúsculas quando apenas upperCaseLetters está ativo', () => {
    // Act
    const code = generateRandomCode({ length: 8, upperCaseLetters: true });

    // Assert
    expect(code).toMatch(/^[A-Z]{8}$/);
  });

  it('deve lançar BadRequest quando nenhum tipo de caractere é permitido', () => {
    // Act / Assert
    expect(() => generateRandomCode({ length: 6 })).toThrow(
      BadRequestException,
    );
  });

  it('deve lançar BadRequest quando o tamanho é menor que 6', () => {
    // Act / Assert
    expect(() => generateRandomCode({ length: 5, numbers: true })).toThrow(
      BadRequestException,
    );
  });
});
