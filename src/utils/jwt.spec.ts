import { UnauthorizedException } from '@nestjs/common';
import { generateJwt, verifyJwt } from './jwt';

describe('jwt', () => {
  const secret = 'segredo-de-teste';

  describe('generateJwt / verifyJwt', () => {
    it('deve devolver o payload quando o token é válido', () => {
      // Arrange
      const token = generateJwt(secret, { id: 'user-1' }, '5m');

      // Act
      const payload = verifyJwt(secret, token);

      // Assert
      expect(payload).toMatchObject({ id: 'user-1' });
    });

    it('deve lançar Unauthorized quando o segredo é outro', () => {
      // Arrange
      const token = generateJwt(secret, { id: 'user-1' }, '5m');

      // Act / Assert
      expect(() => verifyJwt('outro-segredo', token)).toThrow(
        UnauthorizedException,
      );
    });

    it('deve lançar Unauthorized quando o token expirou', () => {
      // Arrange
      const token = generateJwt(secret, { id: 'user-1' }, '-1s');

      // Act / Assert
      expect(() => verifyJwt(secret, token)).toThrow(UnauthorizedException);
    });

    it('deve lançar Unauthorized quando o token está malformado', () => {
      // Act / Assert
      expect(() => verifyJwt(secret, 'nao-e-um-jwt')).toThrow(
        UnauthorizedException,
      );
    });
  });
});
