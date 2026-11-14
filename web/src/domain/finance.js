export function validMonth(month) {
  return (
    typeof month === 'string' &&
    /^\d{4}-(0[1-9]|1[0-2])$/.test(month) &&
    +month.slice(0, 4) >= 1900 &&
    +month.slice(0, 4) <= 9990
  );
}
export function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value + 'T12:00:00');
  return (
    !Number.isNaN(+d) &&
    d.getFullYear() === +value.slice(0, 4) &&
    d.getMonth() + 1 === +value.slice(5, 7) &&
    d.getDate() === +value.slice(8, 10)
  );
}
export function lastDay(month) {
  if (!validMonth(month)) throw new Error('Mês inválido.');
  return month + '-' + new Date(+month.slice(0, 4), +month.slice(5, 7), 0).getDate();
}
export function shiftMonth(month, offset) {
  if (!validMonth(month) || !Number.isInteger(offset))
    throw new Error('Mês ou deslocamento inválido.');
  const d = new Date(+month.slice(0, 4), +month.slice(5, 7) - 1 + offset, 1);
  const result = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  if (!validMonth(result)) throw new Error('Mês fora do limite.');
  return result;
}
export function onDay(month, day) {
  if (!Number.isInteger(day) || day < 1 || day > 31) throw new Error('Dia inválido.');
  return month + '-' + String(Math.min(day, +lastDay(month).slice(8))).padStart(2, '0');
}
export function cents(value, zero = false) {
  const raw = String(value)
    .trim()
    .replace(/\s|R\$/g, '');
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(raw))
    throw new Error('Use um valor como 1.234,56.');
  const amount = Math.round(Number(raw.replace(/\./g, '').replace(',', '.')) * 100);
  if (!Number.isSafeInteger(amount) || amount < (zero ? 0 : 1) || amount > 100000000000)
    throw new Error('Valor fora do limite permitido.');
  return amount;
}
export function splitInstallments(total, count) {
  if (
    !Number.isSafeInteger(total) ||
    !Number.isInteger(count) ||
    count < 1 ||
    count > 120 ||
    total < count ||
    total > 100000000000
  )
    throw new Error('Parcelamento inválido.');
  return Array.from(
    { length: count },
    (_, i) => Math.floor(total / count) + (i < total % count ? 1 : 0),
  );
}
export function suggestedInvoiceMonth(date, closing, due) {
  if (!validDate(date) || ![closing, due].every((n) => Number.isInteger(n) && n >= 1 && n <= 31))
    throw new Error('Data ou cartão inválido.');
  let cycle = date.slice(0, 7);
  if (+date.slice(8) >= Math.min(closing, +lastDay(cycle).slice(8))) cycle = shiftMonth(cycle, 1);
  if (due <= closing) cycle = shiftMonth(cycle, 1);
  return cycle;
}
