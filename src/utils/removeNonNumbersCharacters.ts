export const removeNonNumbersCharacters = (data: string): string => {
  return data.replace(/[^0-9]/g, '');
};
