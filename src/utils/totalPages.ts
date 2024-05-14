import { Logger } from '@nestjs/common';

export const totalPages = (total: number, itemsPerPage: number): number => {
  Logger.log('Calculating total pages', 'totalPages');
  const roundTotal =
    Number(total) % Number(itemsPerPage)
      ? Number(total) +
        Number(itemsPerPage) -
        (Number(total) % Number(itemsPerPage))
      : Number(total);
  const totalPages = Math.ceil(roundTotal / itemsPerPage);
  return totalPages;
};
