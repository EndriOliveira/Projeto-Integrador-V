import { Logger } from '@nestjs/common';

export const removeNonNumbersCharacters = (data: string): string => {
  Logger.log('Removing non numbers characters', 'removeNonNumbersCharacters');
  return data.replace(/[^0-9]/g, '');
};
