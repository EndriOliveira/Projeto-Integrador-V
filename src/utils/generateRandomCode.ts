import { BadRequestException, Logger } from '@nestjs/common';

type GenerateRandomCodeProps = {
  length?: number;
  upperCaseLetters?: boolean;
  lowerCaseLetters?: boolean;
  numbers?: boolean;
};

export const generateRandomCode = (
  props: GenerateRandomCodeProps = {
    length: 6,
    upperCaseLetters: true,
    lowerCaseLetters: true,
    numbers: true,
  },
): string => {
  Logger.log('Generating random code', 'generateRandomCode');
  let { length } = props;
  let result = '';
  let characters = '';

  if (props) {
    const { upperCaseLetters, lowerCaseLetters, numbers } = props;

    if (!upperCaseLetters && !lowerCaseLetters && !numbers) {
      Logger.error('Invalid characters', 'generateRandomCode');
      throw new BadRequestException(
        'Código aleatório deve conter pelo menos um tipo de caractere',
      );
    }
    if (length < 6) {
      Logger.error('Invalid length', 'generateRandomCode');
      throw new BadRequestException(
        'Código aleatório deve conter no mínimo 6 caracteres',
      );
    }

    if (upperCaseLetters) characters += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (lowerCaseLetters) characters += 'abcdefghijklmnopqrstuvwxyz';
    if (numbers) characters += '0123456789';
  } else {
    length = 6;
    characters =
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  }

  if (!length) length = 6;

  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  Logger.log(`Random code generated`, 'generateRandomCode');
  return result;
};
