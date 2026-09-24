// Converte "MM/DD/YYYY" em Date à meia-noite UTC, para colunas @db.Date: assim
// o dia gravado não depende do fuso do servidor.
export const parseDateOnly = (value: string): Date => {
  const [month, day, year] = value.split('/').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};
