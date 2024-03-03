export const totalPages = (total: number, itemsPerPage: number): number => {
  const roundTotal =
    Number(total) % Number(itemsPerPage)
      ? Number(total) +
        Number(itemsPerPage) -
        (Number(total) % Number(itemsPerPage))
      : Number(total);
  const totalPages = Math.ceil(roundTotal / itemsPerPage);
  return totalPages;
};
