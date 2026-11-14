import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cents,
  lastDay,
  onDay,
  shiftMonth,
  splitInstallments,
  suggestedInvoiceMonth,
  validDate,
  validMonth,
} from '../../web/src/domain/finance.js';
test('valores brasileiros são armazenados como centavos inteiros', () => {
  assert.equal(cents('1.234,56'), 123456);
  assert.equal(cents('R$ 147,00'), 14700);
  assert.equal(cents('0,00', true), 0);
});
test('rejeita valores malformados, negativos e acima do limite', () => {
  for (const n of ['0', '-1', '1.23', '1,234', 'Infinity', '1000000001,00'])
    assert.throws(() => cents(n));
});
test('parcelas preservam todos os centavos', () => {
  assert.deepEqual(splitInstallments(10000, 3), [3334, 3333, 3333]);
  for (let n = 1; n <= 120; n++)
    assert.equal(
      splitInstallments(10000, n).reduce((a, b) => a + b, 0),
      10000,
    );
});
test('rejeita parcelas inválidas', () => {
  for (const n of [0, 121, 1.5]) assert.throws(() => splitInstallments(100, n));
  assert.throws(() => splitInstallments(2, 3));
});
test('Demonstração: sete parcelas de R$100', () =>
  assert.deepEqual(splitInstallments(70000, 7), Array(7).fill(10000)));
test('valida meses e datas reais', () => {
  assert(validMonth('2027-01'));
  assert(!validMonth('2027-13'));
  assert(validDate('2028-02-29'));
  assert(!validDate('2027-02-29'));
});
test('fim do mês e ano bissexto', () => {
  assert.equal(lastDay('2028-02'), '2028-02-29');
  assert.equal(onDay('2027-02', 31), '2027-02-28');
  assert.throws(() => onDay('2027-02', 0));
});
test('avança entre anos', () => {
  assert.equal(shiftMonth('2026-12', 6), '2027-06');
  assert.equal(shiftMonth('2027-01', -1), '2026-12');
});
test('fechamento anterior ao vencimento', () => {
  assert.equal(suggestedInvoiceMonth('2027-01-19', 20, 28), '2027-01');
  assert.equal(suggestedInvoiceMonth('2027-01-20', 20, 28), '2027-02');
});
test('vencimento no mês seguinte ao fechamento', () => {
  assert.equal(suggestedInvoiceMonth('2027-01-19', 20, 10), '2027-02');
  assert.equal(suggestedInvoiceMonth('2027-01-21', 20, 10), '2027-03');
});
test('fechamento dia 31 se ajusta a fevereiro', () =>
  assert.equal(suggestedInvoiceMonth('2027-02-28', 31, 10), '2027-04'));
