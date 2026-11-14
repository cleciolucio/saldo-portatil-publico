export const STATE_KEY = 'saldo.public.dashboard.v1.state.v2';
export function syntheticState() {
  return {
    version: 2,
    transactions: [
      {
        id: 'qa-income',
        description: 'Receita fictícia QA',
        amount: 100000,
        type: 'income',
        category: 'Outros',
        date: '2027-01-31',
        status: 'planned',
      },
      {
        id: 'qa-rent',
        description: 'Aluguel fictício QA',
        amount: 25000,
        type: 'expense',
        category: 'Moradia',
        date: '2027-01-31',
        status: 'planned',
      },
    ],
    settings: {
      cards: [],
      purchases: [],
      goals: {},
      investments: [
        {
          id: 'qa-portfolio',
          name: 'Carteira fictícia QA',
          total: 10000,
          asOf: null,
          positions: [{ id: 'qa-reserve', name: 'Reserva fictícia', amount: 10000 }],
        },
      ],
      copyLog: [],
      imports: ['demo-installments-dec2026-jun2027-v1', 'demo-investments-v1'],
      lastBackupAt: null,
      lastBackupSignature: null,
    },
  };
}
/** Autossuficiente: pode ser serializada para Playwright ou Appium. */
export function seedStorage(state) {
  if (localStorage.getItem('saldo.public.qa.seeded')) return;
  localStorage.clear();
  localStorage.setItem('saldo.public.qa.seeded', 'true');
  localStorage.setItem('saldo.public.dashboard.v1.state.v2', JSON.stringify(state));
  for (const suffix of [
    'payroll.2026-09.v1',
    'payroll.2026-10.v1',
    'payroll.2026-11.v1',
    'expenses.oct-dec-2026.v1',
    'expenses.september-2026.v1',
    'credit-card.sep-nov-2026.v1',
  ])
    localStorage.setItem('saldo.public.dashboard.v1.' + suffix, 'done');
}
