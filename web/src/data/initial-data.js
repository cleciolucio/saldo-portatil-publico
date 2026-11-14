// Dados inteiramente fictícios. Valores monetários em centavos inteiros.
// Personalize pela interface ou altere estes exemplos antes da primeira abertura.
export const PAYROLL = {
  month: '2026-10',
  gross: 300000,
  inss: 25000,
  irrf: 5000,
  advance: 100000,
  dental: 1000,
  deductions: 131000,
  remaining: 169000,
  net: 269000,
};
export const PAYROLLS = {
  '2026-09': { ...PAYROLL, month: '2026-09' },
  '2026-10': PAYROLL,
  '2026-11': { ...PAYROLL, month: '2026-11', estimated: true },
};
export const MONTHLY_EXPENSES = [
  ['rent', 'Aluguel de exemplo', 100000, 'Moradia'],
  ['groceries', 'Alimentação de exemplo', 35000, 'Alimentação'],
  ['internet', 'Internet de exemplo', 10000, 'Moradia'],
  ['transport', 'Transporte de exemplo', 20000, 'Transporte'],
  ['education', 'Curso de exemplo', 12000, 'Educação'],
  ['utilities', 'Contas de exemplo', 11000, 'Moradia'],
  ['health', 'Saúde de exemplo', 8000, 'Saúde'],
];
export const initialInvestments = [
  {
    id: 'demo-reserves',
    name: 'Reservas',
    total: 80000,
    asOf: null,
    positions: [
      { id: 'emergency', name: 'Reserva de emergência', amount: 50000 },
      { id: 'goals', name: 'Objetivos', amount: 30000 },
    ],
  },
  {
    id: 'demo-investments',
    name: 'Investimentos',
    total: 20000,
    asOf: null,
    positions: [
      { id: 'fixed-income', name: 'Renda fixa', amount: 12000 },
      { id: 'variable-income', name: 'Renda variável', amount: 8000 },
    ],
  },
];
export const INITIAL_CARD_TOTALS = [
  ['2026-09', 15000],
  ['2026-11', 20000],
];
export const INITIAL_INSTALLMENTS = {
  card: { id: 'demo-card', name: 'Cartão de exemplo', close: 20, due: 28, unconfirmed: false },
  purchase: {
    id: 'demo-purchase',
    cardId: 'demo-card',
    description: 'Compra parcelada de exemplo',
    total: 70000,
    count: 7,
    offset: 3,
    originalCount: 10,
    firstMonth: '2026-12',
    date: null,
  },
};
