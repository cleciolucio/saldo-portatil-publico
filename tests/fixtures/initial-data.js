// Dados inteiramente fictícios para relatórios, imagens de container e testes.
export const PAYROLL = {
  month: '2026-10',
  gross: 150000,
  inss: 10000,
  irrf: 10000,
  advance: 50000,
  dental: 1000,
  deductions: 71000,
  remaining: 79000,
  net: 129000,
};
export const PAYROLLS = {
  '2026-09': { ...PAYROLL, month: '2026-09' },
  '2026-10': PAYROLL,
  '2026-11': { ...PAYROLL, month: '2026-11', estimated: true },
};
export const MONTHLY_EXPENSES = [
  ['qa-rent', 'Aluguel fictício QA', 25000, 'Moradia'],
  ['qa-internet', 'Internet fictícia QA', 5000, 'Moradia'],
];
export const initialInvestments = [
  {
    id: 'qa-portfolio',
    name: 'Carteira fictícia QA',
    total: 10000,
    asOf: null,
    positions: [{ id: 'qa-reserve', name: 'Reserva fictícia', amount: 10000 }],
  },
];

export const INITIAL_CARD_TOTALS = [
  ['2026-09', 1000],
  ['2026-11', 2000],
];
export const INITIAL_INSTALLMENTS = {
  card: {
    id: 'card-installment-qa',
    name: 'Cartão fictício de parcelas',
    close: 31,
    due: 31,
    unconfirmed: true,
  },
  purchase: {
    id: 'purchase-installment-qa',
    cardId: 'card-installment-qa',
    description: 'Parcelamento fictício QA',
    total: 700,
    count: 7,
    offset: 3,
    originalCount: 10,
    firstMonth: '2026-12',
    date: null,
  },
};
