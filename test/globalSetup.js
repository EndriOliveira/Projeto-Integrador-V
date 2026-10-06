// O código usa a convenção "ad-hoc BRT" (UTC-3 aplicado sobre o horário do
// servidor, que roda em UTC). Fixar o fuso deixa os testes determinísticos em
// qualquer máquina.
module.exports = async () => {
  process.env.TZ = 'UTC';
};
