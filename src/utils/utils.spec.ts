import { encryptPassword, verifyPassword } from './encryption';
import { parseDateOnly } from './parseDateOnly';
import { removeNonNumbersCharacters } from './removeNonNumbersCharacters';
import { totalPages } from './totalPages';

describe('utils', () => {
  describe('totalPages', () => {
    it.each([
      [0, 10, 0],
      [10, 10, 1],
      [11, 10, 2],
      [25, 10, 3],
      [1, 100, 1],
    ])(
      'deve calcular %i itens com %i por página = %i páginas',
      (total, perPage, expected) => {
        // Act / Assert
        expect(totalPages(total, perPage)).toBe(expected);
      },
    );
  });

  describe('removeNonNumbersCharacters', () => {
    it('deve manter só os dígitos', () => {
      // Act / Assert
      expect(removeNonNumbersCharacters('(11) 9 9999-0000')).toBe(
        '11999990000',
      );
    });
  });

  describe('parseDateOnly', () => {
    it('deve converter MM/DD/YYYY em meia-noite UTC do mesmo dia', () => {
      // Act
      const date = parseDateOnly('09/21/2026');

      // Assert
      expect(date.toISOString()).toBe('2026-09-21T00:00:00.000Z');
    });
  });

  describe('encryptPassword / verifyPassword', () => {
    it('deve validar a senha original contra o hash gerado', async () => {
      // Arrange
      const hash = await encryptPassword('Senha@123');

      // Act / Assert
      expect(hash).not.toBe('Senha@123');
      await expect(verifyPassword('Senha@123', hash)).resolves.toBe(true);
    });

    it('deve recusar uma senha diferente', async () => {
      // Arrange
      const hash = await encryptPassword('Senha@123');

      // Act / Assert
      await expect(verifyPassword('Outra@123', hash)).resolves.toBe(false);
    });
  });
});
