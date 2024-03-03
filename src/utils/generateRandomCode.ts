import { BadRequestException } from '@nestjs/common';

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
  let { length } = props;
  let result = '';
  let characters = '';

  if (props) {
    const { upperCaseLetters, lowerCaseLetters, numbers } = props;

    if (!upperCaseLetters && !lowerCaseLetters && !numbers)
      throw new BadRequestException(
        'Random code must contains at least 1 group of characters',
      );
    if (length < 6)
      throw new BadRequestException(
        'Random code must contains at least 6 characters',
      );

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
  return result;
};
