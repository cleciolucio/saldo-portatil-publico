import Chart from 'chart.js/auto';
import {
  PAYROLLS,
  MONTHLY_EXPENSES,
  initialInvestments,
  INITIAL_CARD_TOTALS,
  INITIAL_INSTALLMENTS,
} from './data/initial-data.js';
import {
  cents,
  lastDay,
  validMonth,
  shiftMonth,
  onDay,
  validDate,
  splitInstallments,
  suggestedInvoiceMonth,
} from './domain/finance.js';
import { exportFile } from './native-io.js';

(() => {
  'use strict';
  const KEY = 'saldo.public.dashboard.v1';
  const STATE_KEY = KEY + '.state.v2';
  let loadedState = null;
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (raw !== null) {
      loadedState = JSON.parse(raw);
      if (!loadedState || !Array.isArray(loadedState.transactions) || !loadedState.settings)
        throw new Error('Estado inválido');
    }
  } catch (error) {
    alert(
      'Não foi possível ler os dados atuais. Para preservar seu histórico, a aplicação não fará alterações. Restaure o armazenamento ou use a cópia de backup.',
    );
    return;
  }
  const payrollImportKey = (month) => KEY + '.payroll.' + month + '.v1';
  const EXPENSES_IMPORT_KEY = KEY + '.expenses.oct-dec-2026.v1';
  const SEPTEMBER_IMPORT_KEY = KEY + '.expenses.september-2026.v1';
  const CARD_IMPORT_KEY = KEY + '.credit-card.sep-nov-2026.v1';
  function creditCardRows() {
    return INITIAL_CARD_TOTALS.map(([month, amount]) => ({
      id: 'credit-card-' + month,
      description: 'Fatura do cartão de crédito · vencimento a confirmar',
      amount,
      category: 'Cartão de crédito',
      type: 'expense',
      date: lastDay(month),
      sample: false,
      source: 'credit-card-sep-nov-2026',
    }));
  }

  function plannedExpenses() {
    return ['2026-10', '2026-11', '2026-12'].flatMap((month) => {
      const [year, m] = month.split('-').map(Number);
      const day = new Date(year, m, 0).getDate();
      return MONTHLY_EXPENSES.map(([key, description, amount, category]) => ({
        id: `planned-${month}-${key}`,
        description: description + ' · mensal previsto',
        amount,
        category,
        type: 'expense',
        date: `${month}-${day}`,
        sample: false,
        source: 'monthly-plan-2026',
        status: 'planned',
      }));
    });
  }
  const categories = [
    'Moradia',
    'Alimentação',
    'Transporte',
    'Lazer',
    'Saúde',
    'Educação',
    'Outros',
    'Cartão de crédito',
  ];
  const colors = [
    '#c2f570',
    '#9caeeb',
    '#f0ab8e',
    '#d7a5ce',
    '#79c5b6',
    '#e5cf7c',
    '#94a39a',
    '#83c9ec',
  ];
  const $ = (id) => document.getElementById(id);
  let valuesHidden = false,
    editingId = null;
  // Valores visíveis ao abrir, conforme preferência do usuário; botão permite ocultar a tela.
  const money = (value) =>
    valuesHidden
      ? 'R$ •••••'
      : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);
  const localDate = new Date();
  const today = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`;
  const initialMonth = today.slice(0, 7);
  const uid = () =>
    globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let timer,
    doughnut,
    bars,
    storageAvailable = true;
  function toast(message) {
    $('toast').textContent = message;
    $('toast').hidden = false;
    clearTimeout(timer);
    timer = setTimeout(() => ($('toast').hidden = true), 4500);
  }
  function seed() {
    return [];
  }
  function importedRows(payroll) {
    return [
      {
        id: `payroll-${payroll.month}-advance`,
        description: 'Adiantamento salarial informado · competência; crédito a confirmar',
        amount: payroll.advance,
      },
      {
        id: `payroll-${payroll.month}-remaining`,
        description: 'Saldo salarial líquido a receber · competência; crédito a confirmar',
        amount: payroll.remaining,
      },
    ].map((t) => ({
      ...t,
      type: 'income',
      category: 'Outros',
      date: lastDay(payroll.month),
      sample: false,
      source: 'payroll-' + payroll.month,
      ...(payroll.estimated
        ? { status: 'planned', description: t.description + ' · previsão baseada em outubro' }
        : {}),
    }));
  }
  function validRecord(t) {
    return (
      t &&
      typeof t.id === 'string' &&
      typeof t.description === 'string' &&
      t.description.trim() &&
      Number.isSafeInteger(t.amount) &&
      t.amount > 0 &&
      t.amount <= 100000000000 &&
      ['income', 'expense'].includes(t.type) &&
      categories.includes(t.category) &&
      (t.status === undefined || ['planned', 'completed'].includes(t.status)) &&
      typeof t.date === 'string' &&
      validDate(t.date)
    );
  }
  if (
    loadedState &&
    (!loadedState.transactions.every(validRecord) ||
      new Set(loadedState.transactions.map((t) => t.id)).size !== loadedState.transactions.length)
  ) {
    alert('Os dados atuais são inválidos. Nenhum dado será alterado.');
    return;
  }
  let data;
  try {
    const raw = loadedState ? JSON.stringify(loadedState.transactions) : localStorage.getItem(KEY);
    if (raw === null) {
      data = seed();
      localStorage.setItem(KEY, JSON.stringify(data));
    } else {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || !parsed.every(validRecord)) throw new Error('invalid');
      data = parsed;
    }
  } catch (error) {
    data = [];
    storageAvailable = false;
    setTimeout(
      () =>
        toast(
          'Não foi possível ler o armazenamento. Dados existentes foram preservados; novos registros ficarão apenas nesta sessão.',
        ),
      200,
    );
  }
  function save(next) {
    return commit(next, settings);
  }
  // Importar uma vez, sem recriar lançamentos excluídos e sem remover registros pessoais.
  for (const payroll of Object.values(PAYROLLS)) {
    if (storageAvailable) {
      try {
        if (localStorage.getItem(payrollImportKey(payroll.month)) !== 'done') {
          const next = data.filter((t) => t.sample !== true);
          for (const item of importedRows(payroll)) {
            if (!next.some((t) => t.id === item.id)) next.push(item);
          }
          localStorage.setItem(KEY, JSON.stringify(next));
          data = next;
          localStorage.setItem(payrollImportKey(payroll.month), 'done');
        }
      } catch {
        toast(
          'Não foi possível concluir a importação local. Verifique os registros antes de continuar.',
        );
      }
    } else {
      data.push(...importedRows(payroll));
    }
  }
  // Cada item entra uma vez; edições e exclusões posteriores são preservadas.
  if (storageAvailable) {
    try {
      if (localStorage.getItem(EXPENSES_IMPORT_KEY) !== 'done') {
        const next = [...data];
        for (const item of plannedExpenses()) {
          if (!next.some((t) => t.id === item.id)) next.push(item);
        }
        localStorage.setItem(KEY, JSON.stringify(next));
        data = next;
        localStorage.setItem(EXPENSES_IMPORT_KEY, 'done');
      }
    } catch {
      toast('Não foi possível salvar o planejamento. Verifique o armazenamento do navegador.');
    }
  } else {
    data = [...data, ...plannedExpenses()];
  }
  // Importação única: preserva lançamentos pessoais, edições e exclusões posteriores.
  if (storageAvailable) {
    try {
      if (localStorage.getItem(CARD_IMPORT_KEY) !== 'done') {
        const next = [...data];
        for (const item of creditCardRows()) {
          if (!next.some((t) => t.id === item.id)) next.push(item);
        }
        localStorage.setItem(KEY, JSON.stringify(next));
        data = next;
        localStorage.setItem(CARD_IMPORT_KEY, 'done');
      }
    } catch {
      toast('Não foi possível salvar as faturas. Verifique o armazenamento do navegador.');
    }
  } else {
    data = [...data, ...creditCardRows()];
  }
  function septemberExpenses() {
    return MONTHLY_EXPENSES.map(([key, description, amount, category]) => {
      const october = data.find((t) => t.id === `planned-2026-10-${key}`);
      return {
        id: `planned-2026-09-${key}`,
        description: october?.description || description + ' · mensal previsto',
        amount: october?.amount ?? amount,
        category: october?.category || category,
        type: 'expense',
        date: '2026-09-30',
        sample: false,
        source: 'monthly-plan-september-2026',
        status: 'planned',
      };
    });
  }
  if (storageAvailable) {
    try {
      if (localStorage.getItem(SEPTEMBER_IMPORT_KEY) !== 'done') {
        const next = [...data];
        for (const item of septemberExpenses()) {
          if (!next.some((t) => t.id === item.id)) next.push(item);
        }
        localStorage.setItem(KEY, JSON.stringify(next));
        data = next;
        localStorage.setItem(SEPTEMBER_IMPORT_KEY, 'done');
      }
    } catch {
      toast(
        'Não foi possível salvar os gastos de setembro. Verifique o armazenamento do navegador.',
      );
    }
  } else {
    data = [...data, ...septemberExpenses()];
  }
  const emptySettings = () => ({
    cards: [],
    purchases: [],
    goals: {},
    investments: [],
    copyLog: [],
    imports: [],
    lastBackupAt: null,
    lastBackupSignature: null,
  });
  function validateSettings(value) {
    if (
      !value ||
      !Array.isArray(value.cards) ||
      !Array.isArray(value.purchases) ||
      !value.goals ||
      typeof value.goals !== 'object' ||
      Array.isArray(value.goals) ||
      !Array.isArray(value.copyLog) ||
      !Array.isArray(value.imports)
    )
      throw new Error('Configurações do backup inválidas.');
    if (value.investments === undefined) value.investments = [];
    if (!Array.isArray(value.investments)) throw new Error('Investimentos inválidos.');
    const portfolioIds = new Set();
    for (const group of value.investments) {
      if (
        !group ||
        typeof group.id !== 'string' ||
        !group.id ||
        portfolioIds.has(group.id) ||
        typeof group.name !== 'string' ||
        !group.name.trim() ||
        group.name.length > 120 ||
        !Number.isSafeInteger(group.total) ||
        group.total < 0 ||
        group.total > 100000000000 ||
        !Array.isArray(group.positions) ||
        (group.asOf !== null && !validDate(group.asOf))
      )
        throw new Error('Saldo de investimentos inválido.');
      portfolioIds.add(group.id);
      const positionIds = new Set();
      for (const item of group.positions) {
        if (
          !item ||
          typeof item.id !== 'string' ||
          !item.id ||
          positionIds.has(item.id) ||
          typeof item.name !== 'string' ||
          !item.name.trim() ||
          item.name.length > 120 ||
          !Number.isSafeInteger(item.amount) ||
          item.amount < 0 ||
          item.amount > 100000000000
        )
          throw new Error('Detalhamento de investimentos inválido.');
        positionIds.add(item.id);
      }
    }
    const ids = new Set();
    for (const card of value.cards) {
      if (
        !card ||
        typeof card.id !== 'string' ||
        !card.id ||
        ids.has(card.id) ||
        typeof card.name !== 'string' ||
        !card.name.trim() ||
        card.name.length > 120 ||
        ![card.close, card.due].every((n) => Number.isInteger(n) && n >= 1 && n <= 31)
      )
        throw new Error('Cartão inválido.');
      ids.add(card.id);
    }
    const purchases = new Set();
    for (const p of value.purchases) {
      if (
        !p ||
        typeof p.id !== 'string' ||
        purchases.has(p.id) ||
        !ids.has(p.cardId) ||
        typeof p.description !== 'string' ||
        !p.description.trim() ||
        !Number.isSafeInteger(p.total) ||
        p.total < 1 ||
        p.total > 100000000000 ||
        !Number.isInteger(p.count) ||
        p.count < 1 ||
        p.count > 120 ||
        p.total < p.count ||
        !validMonth(p.firstMonth) ||
        (p.date !== null && !validDate(p.date)) ||
        !Number.isInteger(p.offset) ||
        p.offset < 0 ||
        !Number.isInteger(p.originalCount) ||
        p.originalCount !== p.offset + p.count ||
        p.originalCount > 120 ||
        !validMonth(shiftMonth(p.firstMonth, p.count - 1))
      )
        throw new Error('Compra parcelada inválida.');
      purchases.add(p.id);
    }
    for (const [month, g] of Object.entries(value.goals)) {
      if (
        !validMonth(month) ||
        !g ||
        ![g.target, g.saved].every((n) => Number.isSafeInteger(n) && n >= 0 && n <= 100000000000)
      )
        throw new Error('Meta inválida.');
    }
    if (
      !value.copyLog.every((t) => typeof t === 'string') ||
      !value.imports.every((t) => typeof t === 'string')
    )
      throw new Error('Histórico de importação inválido.');
    return value;
  }
  let settings;
  try {
    settings = loadedState ? validateSettings(loadedState.settings) : emptySettings();
  } catch {
    alert('Configurações atuais inválidas. Nenhum dado será alterado.');
    return;
  }
  function installmentRows(p) {
    const card = settings.cards.find((c) => c.id === p.cardId);
    return Array.from({ length: p.count }, (_, i) => {
      const month = shiftMonth(p.firstMonth, i);
      return {
        purchaseId: p.id,
        cardId: p.cardId,
        month,
        date: onDay(month, card.due),
        amount: splitInstallments(p.total, p.count)[i],
        ordinal: i + p.offset + 1,
        totalCount: p.originalCount,
        description: p.description,
      };
    });
  }
  function invoicesFor(nextData, nextSettings) {
    const groups = new Map();
    for (const p of nextSettings.purchases) {
      const card = nextSettings.cards.find((c) => c.id === p.cardId);
      for (let i = 0; i < p.count; i++) {
        const month = shiftMonth(p.firstMonth, i),
          id = `invoice-${p.cardId}-${month}`;
        const g = groups.get(id) || { id, month, card, amount: 0 };
        g.amount += splitInstallments(p.total, p.count)[i];
        groups.set(id, g);
      }
    }
    return [
      ...nextData.filter((t) => t.source !== 'card-invoice'),
      ...[...groups.values()].map((g) => {
        const previous = nextData.find((t) => t.id === g.id);
        return {
          id: g.id,
          description:
            'Fatura · ' + g.card.name + (g.card.unconfirmed ? ' · vencimento a confirmar' : ''),
          amount: g.amount,
          type: 'expense',
          category: 'Cartão de crédito',
          date: onDay(g.month, g.card.due),
          source: 'card-invoice',
          cardId: g.card.id,
          status:
            previous?.status === 'completed' && previous.amount === g.amount
              ? 'completed'
              : 'planned',
          sample: false,
        };
      }),
    ];
  }
  // Uma compra de dez parcelas: somente as sete restantes entram no planejamento.
  if (!settings.imports.includes('demo-installments-dec2026-jun2027-v1')) {
    if (!settings.cards.some((c) => c.id === INITIAL_INSTALLMENTS.card.id))
      settings.cards.push({ ...INITIAL_INSTALLMENTS.card });
    settings.purchases.push({ ...INITIAL_INSTALLMENTS.purchase });
    settings.imports.push('demo-installments-dec2026-jun2027-v1');
  }
  if (!settings.imports.includes('demo-investments-v1')) {
    for (const group of initialInvestments)
      if (!settings.investments.some((g) => g.id === group.id)) settings.investments.push(group);
    settings.imports.push('demo-investments-v1');
  }
  data = invoicesFor(data, settings);
  if (!data.every(validRecord) || new Set(data.map((t) => t.id)).size !== data.length) {
    alert('Não foi possível validar as faturas. Os dados salvos foram preservados.');
    return;
  }
  let lastStateRaw = null,
    comparison,
    editingPurchaseId = null;
  try {
    lastStateRaw = localStorage.getItem(STATE_KEY);
  } catch {}
  const signature = () =>
    JSON.stringify({
      transactions: data,
      cards: settings.cards,
      purchases: settings.purchases,
      goals: settings.goals,
      investments: settings.investments,
      copyLog: settings.copyLog,
      imports: settings.imports,
    });
  function commit(nextData, nextSettings) {
    try {
      if (storageAvailable && localStorage.getItem(STATE_KEY) !== lastStateRaw)
        throw new Error('Os dados mudaram em outra aba. Atualize esta página antes de salvar.');
      validateSettings(nextSettings);
      if (
        !Array.isArray(nextData) ||
        !nextData.every(validRecord) ||
        new Set(nextData.map((t) => t.id)).size !== nextData.length
      )
        throw new Error('Lançamentos inválidos.');
      const next = invoicesFor(nextData, nextSettings);
      if (!next.every(validRecord) || new Set(next.map((t) => t.id)).size !== next.length)
        throw new Error('O total de uma fatura excede o limite ou há registros duplicados.');
      const raw = JSON.stringify({ version: 2, transactions: next, settings: nextSettings });
      if (storageAvailable) localStorage.setItem(STATE_KEY, raw);
      data = next;
      settings = nextSettings;
      lastStateRaw = raw;
      render();
      return true;
    } catch (error) {
      toast('Alteração não aplicada. ' + error.message);
      return false;
    }
  }
  try {
    if (storageAvailable) {
      const raw = JSON.stringify({ version: 2, transactions: data, settings });
      localStorage.setItem(STATE_KEY, raw);
      lastStateRaw = raw;
    }
  } catch {
    storageAvailable = false;
    toast('Sem armazenamento: use o backup para guardar esta sessão.');
  }
  const completed = (t) => t.status === 'completed';
  const sum = (rows, type) => rows.filter((t) => t.type === type).reduce((n, t) => n + t.amount, 0);
  const monthName = (m) =>
    new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' }).format(
      new Date(m + '-01T12:00:00'),
    );
  function backupPayload() {
    return {
      application: 'saldo',
      version: 2,
      exportedAt: new Date().toISOString(),
      month: $('month').value,
      valuesHidden,
      transactions: data,
      settings,
    };
  }
  function remindBackup() {
    const dirty = signature() !== settings.lastBackupSignature;
    $('backupReminder').textContent = !storageAvailable
      ? 'Armazenamento indisponível: salve um backup antes de fechar.'
      : dirty
        ? 'Há alterações sem backup atualizado. Salve uma cópia dos seus dados.'
        : 'Backup gerado em ' +
          new Date(settings.lastBackupAt).toLocaleString('pt-BR') +
          '. Confira se o arquivo foi salvo na pasta de downloads.';
  }
  function rowText(parent, text) {
    const p = document.createElement('p');
    p.textContent = text;
    parent.append(p);
    return p;
  }
  function actionButton(text, action) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'secondary text-xs';
    b.textContent = text;
    b.onclick = action;
    return b;
  }
  function renderInvestments() {
    $('investmentGroups').replaceChildren();
    $('investmentEmpty').hidden = settings.investments.length > 0;
    $('investmentForm').hidden = !settings.investments.length;
    $('investmentTotal').textContent =
      'Total informado: ' + money(settings.investments.reduce((n, g) => n + g.total, 0));
    for (const group of settings.investments) {
      const box = document.createElement('article');
      box.className = 'panel p-5';
      const h = document.createElement('h3');
      h.textContent = group.name;
      box.append(h);
      function input(label, id, value, date = false, text = false) {
        const wrap = document.createElement('div');
        wrap.className = 'mt-3';
        const name = document.createElement('label');
        name.htmlFor = id;
        name.textContent = label;
        const field = document.createElement('input');
        field.id = id;
        field.type = date ? 'date' : text ? 'text' : valuesHidden ? 'password' : 'text';
        if (!date) {
          field.inputMode = text ? 'text' : 'decimal';
          field.maxLength = text ? 120 : 18;
          field.required = true;
        }
        field.value = value;
        wrap.append(name, field);
        box.append(wrap);
      }
      input('Nome da carteira', 'investment-name-' + group.id, group.name, false, true);
      input(
        'Total informado (R$)',
        'investment-total-' + group.id,
        (group.total / 100).toFixed(2).replace('.', ','),
      );
      for (const item of group.positions) {
        input(
          'Nome do item',
          'investment-label-' + group.id + '-' + item.id,
          item.name,
          false,
          true,
        );
        input(
          item.name + ' (R$)',
          'investment-' + group.id + '-' + item.id,
          (item.amount / 100).toFixed(2).replace('.', ','),
        );
      }
      input('Data de referência (opcional)', 'investment-date-' + group.id, group.asOf || '', true);
      const detail = group.positions.reduce((n, item) => n + item.amount, 0),
        diff = group.total - detail;
      const note = rowText(
        box,
        'Soma dos itens: ' +
          money(detail) +
          (diff
            ? ' · Diferença (total − itens): ' + money(diff) + ' · A conferir.'
            : ' · Valores conferem.'),
      );
      note.className = 'text-xs mt-3';
      note.style.color = diff ? '#f0ab8e' : '#c2f570';
      if (!group.asOf) {
        const dateNote = rowText(box, 'Data de referência não informada.');
        dateNote.className = 'muted text-xs mt-2';
      }
      $('investmentGroups').append(box);
    }
  }
  $('resetPublicDemo').onclick = () => {
    if (
      !confirm(
        'Limpar todos os lançamentos, cartões, metas e saldos desta cópia? Salve um backup antes se quiser preservar seus registros.',
      )
    )
      return;
    const next = emptySettings();
    next.imports = ['demo-installments-dec2026-jun2027-v1', 'demo-investments-v1'];
    next.investments = initialInvestments.map((g) => ({
      ...g,
      total: 0,
      positions: g.positions.map((p) => ({ ...p, amount: 0 })),
    }));
    next.demonstrationCleared = true;
    if (commit([], next)) {
      resetForm();
      resetPurchase();
      toast('Cópia limpa. Adicione seus lançamentos e personalize seus saldos.');
    }
  };
  $('investmentForm').onsubmit = (e) => {
    e.preventDefault();
    try {
      const next = structuredClone(settings);
      for (const group of next.investments) {
        group.name = $('investment-name-' + group.id).value.trim();
        group.total = cents($('investment-total-' + group.id).value, true);
        group.asOf = $('investment-date-' + group.id).value || null;
        for (const item of group.positions) {
          item.name = $('investment-label-' + group.id + '-' + item.id).value.trim();
          item.amount = cents($('investment-' + group.id + '-' + item.id).value, true);
        }
      }
      if (commit(data, next))
        toast('Saldos dos investimentos salvos. Confira as diferenças sinalizadas.');
    } catch (error) {
      toast(error.message);
    }
  };
  function renderFeatures() {
    renderInvestments();
    const month = $('month').value,
      rows = monthRows(),
      done = rows.filter(completed),
      pending = rows.filter((t) => !completed(t));
    $('actualSummary').textContent =
      `Recebido: ${money(sum(done, 'income'))} · Pago: ${money(sum(done, 'expense'))} · Saldo realizado: ${money(sum(done, 'income') - sum(done, 'expense'))}`;
    $('pendingSummary').textContent =
      `A receber: ${money(sum(pending, 'income'))} · A pagar: ${money(sum(pending, 'expense'))}`;
    remindBackup();
    const months = Array.from({ length: 6 }, (_, i) => shiftMonth(month, i - 5));
    $('comparisonTable').replaceChildren();
    const stats = months.map((m) => {
      const rs = data.filter((t) => t.date.slice(0, 7) === m),
        done = rs.filter(completed);
      return {
        income: sum(rs, 'income'),
        expenses: sum(rs, 'expense'),
        actual: sum(done, 'income') - sum(done, 'expense'),
      };
    });
    months.forEach((m, i) => {
      const tr = document.createElement('tr');
      for (const text of [
        monthName(m),
        money(stats[i].income),
        money(stats[i].expenses),
        money(stats[i].income - stats[i].expenses),
        money(stats[i].actual),
      ]) {
        const td = document.createElement('td');
        td.textContent = text;
        tr.append(td);
      }
      $('comparisonTable').append(tr);
    });
    if (comparison) comparison.destroy();
    if (typeof Chart !== 'undefined')
      comparison = new Chart($('comparisonChart'), {
        type: 'bar',
        data: {
          labels: months.map(monthName),
          datasets: [
            {
              label: 'Receitas',
              data: stats.map((s) => s.income / 100),
              backgroundColor: '#c2f570',
            },
            {
              label: 'Despesas',
              data: stats.map((s) => s.expenses / 100),
              backgroundColor: '#f0ab8e',
            },
            {
              label: 'Saldo projetado',
              data: stats.map((s) => (s.income - s.expenses) / 100),
              backgroundColor: '#9caeeb',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom' },
            tooltip: {
              callbacks: { label: (c) => c.dataset.label + ': ' + money(Math.round(c.raw * 100)) },
            },
          },
          scales: { y: { ticks: { callback: (v) => money(Math.round(v * 100)) } } },
        },
      });
    const g = settings.goals[month] || { target: 0, saved: 0 };
    $('goalTarget').value = (g.target / 100).toFixed(2).replace('.', ',');
    $('goalSaved').value = (g.saved / 100).toFixed(2).replace('.', ',');
    const percent = g.target ? Math.floor((g.saved / g.target) * 100) : 0;
    $('goalProgress').value = Math.min(100, percent);
    $('goalSummary').textContent = g.target
      ? `${money(g.saved)} de ${money(g.target)} · ${percent}% · Falta ${money(Math.max(0, g.target - g.saved))}`
      : 'Defina quanto deseja guardar neste mês.';
    const current = $('purchaseCard').value;
    $('purchaseCard').replaceChildren();
    $('cardList').replaceChildren();
    for (const c of settings.cards) {
      const option = document.createElement('option');
      option.value = c.id;
      option.textContent = c.name;
      $('purchaseCard').append(option);
      const row = document.createElement('div');
      row.className = 'feature-row text-sm';
      rowText(
        row,
        c.name +
          ' · ' +
          (c.unconfirmed
            ? 'Fechamento e vencimento a confirmar'
            : `Fecha dia ${c.close} · vence dia ${c.due}`),
      );
      row.append(
        actionButton('Editar datas', () => {
          const close = prompt('Dia de fechamento (1 a 31)', String(c.close));
          if (close === null) return;
          const due = prompt(
            'Dia de vencimento (1 a 31). Isso ajustará as datas das faturas deste cartão.',
            String(c.due),
          );
          if (due === null) return;
          const closing = Number(close),
            payment = Number(due);
          if (![closing, payment].every((n) => Number.isInteger(n) && n >= 1 && n <= 31)) {
            toast('Informe dias entre 1 e 31.');
            return;
          }
          const next = structuredClone(settings);
          Object.assign(
            next.cards.find((t) => t.id === c.id),
            { close: closing, due: payment, unconfirmed: false },
          );
          commit(data, next);
        }),
        actionButton('Excluir cartão', () => {
          if (settings.purchases.some((p) => p.cardId === c.id)) {
            toast('Exclua as compras deste cartão antes de removê-lo.');
            return;
          }
          if (confirm('Excluir o cartão ' + c.name + '?')) {
            const next = structuredClone(settings);
            next.cards = next.cards.filter((t) => t.id !== c.id);
            commit(data, next);
          }
        }),
      );
      $('cardList').append(row);
    }
    if (settings.cards.some((c) => c.id === current)) $('purchaseCard').value = current;
    if (!$('purchaseFirst').value) suggestedFirstMonth();
    $('purchaseList').replaceChildren();
    for (const p of settings.purchases) {
      const row = document.createElement('div');
      row.className = 'feature-row text-sm';
      rowText(
        row,
        `${p.description} · ${settings.cards.find((c) => c.id === p.cardId).name} · ${p.offset + 1}/${p.originalCount} a ${p.originalCount}/${p.originalCount} · ${monthName(p.firstMonth)} a ${monthName(shiftMonth(p.firstMonth, p.count - 1))} · total restante ${money(p.total)}`,
      );
      row.append(
        actionButton('Editar compra', () => {
          editingPurchaseId = p.id;
          $('purchaseCard').value = p.cardId;
          $('purchaseDescription').value = p.description;
          $('purchaseAmount').value = (p.total / 100).toFixed(2).replace('.', ',');
          $('purchaseDate').value = p.date || '';
          $('purchaseCount').value = p.count;
          $('purchaseFirst').value = p.firstMonth;
          $('savePurchase').textContent = 'Salvar compra';
          $('cancelPurchase').hidden = false;
          $('purchaseForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
        }),
        actionButton('Excluir compra', () => {
          if (
            !confirm(
              'Excluir ' +
                p.description +
                ' e suas parcelas? As faturas serão recalculadas; faturas alteradas voltarão a previstas.',
            )
          )
            return;
          const next = structuredClone(settings);
          next.purchases = next.purchases.filter((t) => t.id !== p.id);
          commit(data, next);
        }),
      );
      $('purchaseList').append(row);
    }
    $('invoiceList').replaceChildren();
    const invoices = rows.filter((t) => t.source === 'card-invoice');
    for (const invoice of invoices) {
      const box = document.createElement('div');
      box.className = 'feature-row text-sm';
      rowText(
        box,
        invoice.description +
          ' · ' +
          money(invoice.amount) +
          ' · ' +
          (completed(invoice) ? 'Paga' : 'A pagar') +
          ' · ' +
          invoice.date.split('-').reverse().join('/'),
      );
      for (const p of settings.purchases.filter((p) => p.cardId === invoice.cardId)) {
        for (const item of installmentRows(p).filter((t) => t.month === month))
          rowText(
            box,
            `${item.description} · parcela ${item.ordinal}/${item.totalCount} · ${money(item.amount)}`,
          );
      }
      $('invoiceList').append(box);
    }
    for (const invoice of rows.filter(
      (t) => t.category === 'Cartão de crédito' && t.source !== 'card-invoice',
    ))
      rowText(
        $('invoiceList'),
        `Fatura avulsa: ${invoice.description} · ${money(invoice.amount)}. Ao cadastrar compras deste mês, revise a substituição da fatura para evitar duplicidade.`,
      );
    if (!$('invoiceList').children.length) rowText($('invoiceList'), 'Nenhuma fatura neste mês.');
  }
  function suggestedFirstMonth() {
    const card = settings.cards.find((c) => c.id === $('purchaseCard').value),
      date = $('purchaseDate').value;
    if (!card || !validDate(date)) return;
    $('purchaseFirst').value = suggestedInvoiceMonth(date, card.close, card.due);
  }
  $('copyForm').onsubmit = (e) => {
    e.preventDefault();
    try {
      const from = $('copyFrom').value,
        to = $('copyTo').value,
        kind = $('copyKind').value;
      if (!validMonth(from) || !validMonth(to) || from === to)
        throw new Error('Escolha meses diferentes e válidos.');
      const candidates = data.filter(
        (t) =>
          t.date.slice(0, 7) === from &&
          t.source !== 'card-invoice' &&
          (kind === 'all' || t.type === kind),
      );
      const nextSettings = structuredClone(settings),
        next = [...data];
      let skipped = 0;
      for (const t of candidates) {
        const root = t.copyRoot || t.id,
          token = root + '|' + to;
        if (
          (t.category === 'Cartão de crédito' &&
            next.some((n) => n.source === 'card-invoice' && n.date.slice(0, 7) === to)) ||
          nextSettings.copyLog.includes(token) ||
          next.some(
            (n) =>
              n.date.slice(0, 7) === to &&
              ((n.copyRoot || n.id) === root ||
                (n.description === t.description &&
                  n.category === t.category &&
                  n.type === t.type)),
          )
        ) {
          skipped++;
          continue;
        }
        next.push({
          id: uid(),
          description: t.description,
          amount: t.amount,
          category: t.category,
          type: t.type,
          date: onDay(to, +t.date.slice(8)),
          status: 'planned',
          source: 'month-copy',
          copyRoot: root,
          sample: false,
        });
        nextSettings.copyLog.push(token);
      }
      const count = next.length - data.length;
      if (!count) {
        $('copyResult').textContent =
          `Nenhum novo lançamento. ${skipped} já copiados ou equivalentes.`;
        return;
      }
      if (
        !confirm(
          `Copiar ${count} lançamentos de ${monthName(from)} para ${monthName(to)} como previstos? ${skipped} já existentes serão ignorados. Os dados atuais serão preservados.`,
        )
      )
        return;
      if (commit(next, nextSettings)) {
        $('month').value = to;
        render();
        $('copyResult').textContent = `${count} lançamentos copiados; ${skipped} ignorados.`;
      }
    } catch (error) {
      toast(error.message);
    }
  };
  $('goalForm').onsubmit = (e) => {
    e.preventDefault();
    try {
      const next = structuredClone(settings);
      next.goals[$('month').value] = {
        target: cents($('goalTarget').value, true),
        saved: cents($('goalSaved').value, true),
      };
      if (commit(data, next)) toast('Meta salva para este mês.');
    } catch (error) {
      toast(error.message);
    }
  };
  $('cardForm').onsubmit = (e) => {
    e.preventDefault();
    const next = structuredClone(settings),
      name = $('cardName').value.trim();
    if (!name) {
      toast('Informe o nome do cartão.');
      return;
    }
    next.cards.push({
      id: uid(),
      name,
      close: Number($('cardClose').value),
      due: Number($('cardDue').value),
    });
    if (commit(data, next)) {
      $('cardForm').reset();
      toast('Cartão cadastrado.');
    }
  };
  $('purchaseForm').onsubmit = (e) => {
    e.preventDefault();
    try {
      const next = structuredClone(settings),
        previous = next.purchases.find((p) => p.id === editingPurchaseId),
        p = {
          id: editingPurchaseId || uid(),
          cardId: $('purchaseCard').value,
          description: $('purchaseDescription').value.trim(),
          total: cents($('purchaseAmount').value),
          count: Number($('purchaseCount').value),
          firstMonth: $('purchaseFirst').value,
          date: $('purchaseDate').value || null,
          offset: previous?.offset || 0,
          originalCount: Number($('purchaseCount').value) + (previous?.offset || 0),
        };
      next.purchases = next.purchases.filter((t) => t.id !== p.id);
      next.purchases.push(p);
      validateSettings(next);
      const months = Array.from({ length: p.count }, (_, i) => shiftMonth(p.firstMonth, i));
      const conflicts = data.filter(
        (t) =>
          t.type === 'expense' &&
          t.category === 'Cartão de crédito' &&
          t.source !== 'card-invoice' &&
          months.includes(t.date.slice(0, 7)),
      );
      if (
        conflicts.length &&
        !confirm(
          `Há ${conflicts.length} fatura(s) avulsa(s) nos meses desta compra, total ${money(sum(conflicts, 'expense'))}. Substituir TODAS essas faturas pelas compras detalhadas? Só continue se estiver detalhando todo o valor dessas faturas; caso contrário, cancele para preservar os totais.`,
        )
      )
        return;
      if (
        data.some(
          (t) =>
            t.source === 'card-invoice' &&
            t.cardId === p.cardId &&
            completed(t) &&
            (months.includes(t.date.slice(0, 7)) ||
              (previous &&
                Array.from({ length: previous.count }, (_, i) =>
                  shiftMonth(previous.firstMonth, i),
                ).includes(t.date.slice(0, 7)))),
        ) &&
        !confirm('Esta compra altera faturas já pagas. Elas voltarão a previstas. Continuar?')
      )
        return;
      const filtered = data.filter((t) => !conflicts.some((c) => c.id === t.id));
      if (commit(filtered, next)) {
        resetPurchase();
        toast('Compra salva. As faturas foram atualizadas.');
      }
    } catch (error) {
      toast(error.message);
    }
  };
  function resetPurchase() {
    editingPurchaseId = null;
    $('purchaseForm').reset();
    $('purchaseDate').value = today;
    $('savePurchase').textContent = 'Adicionar compra';
    $('cancelPurchase').hidden = true;
    suggestedFirstMonth();
  }
  $('cancelPurchase').onclick = resetPurchase;
  for (const id of ['purchaseCard', 'purchaseDate'])
    $(id).addEventListener('change', suggestedFirstMonth);
  $('backupNow').onclick = () => $('downloadBackup').click();
  $('copyFrom').value = '2026-11';
  $('copyTo').value = '2026-12';
  $('purchaseDate').value = today;
  categories.forEach((category) => {
    for (const id of ['category', 'categoryFilter']) {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category;
      $(id).append(option);
    }
  });
  $('month').value = '2026-11';
  $('date').value = lastDay($('month').value);
  const monthRows = () => data.filter((t) => t.date.slice(0, 7) === $('month').value);
  function visibleRows() {
    const query = $('search').value.trim().toLocaleLowerCase('pt-BR');
    return monthRows()
      .filter(
        (t) =>
          (!$('categoryFilter').value || t.category === $('categoryFilter').value) &&
          (!$('typeFilter').value || t.type === $('typeFilter').value) &&
          t.description.toLocaleLowerCase('pt-BR').includes(query),
      )
      .sort((a, b) => b.date.localeCompare(a.date));
  }
  function renderHistory() {
    const rows = visibleRows();
    $('transactions').replaceChildren();
    $('count').textContent =
      `${rows.length} ${rows.length === 1 ? 'lançamento encontrado' : 'lançamentos encontrados'}`;
    $('historyEmpty').hidden = rows.length > 0;
    for (const t of rows) {
      const tr = document.createElement('tr');
      const cell = (text, className = '') => {
        const td = document.createElement('td');
        td.textContent = text;
        td.className = className;
        tr.append(td);
        return td;
      };
      cell(t.date.split('-').reverse().join('/'), 'muted');
      cell(t.description, 'font-medium');
      const badge = document.createElement('span');
      badge.className = 'badge';
      const color = colors[categories.indexOf(t.category)];
      badge.style.background = color + '18';
      badge.style.color = color;
      badge.textContent = t.category;
      cell('').append(badge);
      cell(t.type === 'income' ? 'Receita' : 'Despesa', 'muted');
      const stateCell = cell(
        completed(t) ? (t.type === 'income' ? 'Recebido' : 'Pago') : 'Previsto',
      );
      stateCell.append(
        document.createTextNode(' '),
        actionButton(
          completed(t)
            ? 'Desfazer confirmação'
            : t.type === 'income'
              ? 'Confirmar recebimento'
              : 'Confirmar pagamento',
          () =>
            save(
              data.map((item) =>
                item.id === t.id
                  ? { ...item, status: completed(item) ? 'planned' : 'completed' }
                  : item,
              ),
            ),
        ),
      );
      const valueCell = cell(
        (t.type === 'income' ? '+ ' : '− ') + money(t.amount),
        `text-right font-medium ${t.type === 'income' ? 'text-[#c2f570]' : ''}`,
      );
      const edit = document.createElement('button');
      edit.className = 'secondary text-xs';
      edit.textContent = 'Editar';
      edit.setAttribute('aria-label', `Editar ${t.description}`);
      edit.onclick = () =>
        t.source === 'card-invoice'
          ? toast('Edite as compras ou as datas do cartão na seção Cartões.')
          : startEdit(t);
      valueCell.append(document.createTextNode(' '), edit);
      const button = document.createElement('button');
      button.className = 'delete';
      button.textContent = '✕';
      button.setAttribute('aria-label', `Excluir ${t.description}, ${money(t.amount)}`);
      button.onclick = () => {
        if (t.source === 'card-invoice') {
          toast('Para remover uma fatura detalhada, exclua suas compras na seção Cartões.');
          return;
        }
        if (save(data.filter((item) => item.id !== t.id))) {
          if (editingId === t.id) resetForm();
          toast('Lançamento excluído.');
        }
      };
      cell('', 'text-right').append(button);
      $('transactions').append(tr);
    }
  }
  function renderPayroll() {
    const payroll = settings.demonstrationCleared ? null : PAYROLLS[$('month').value];
    $('payrollPanel').hidden = !payroll;
    if (!payroll) return;
    $('payrollMonth').textContent =
      new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(
        new Date(payroll.month + '-01T12:00:00'),
      ) +
      (payroll.estimated
        ? ' · previsão baseada em outubro/2026; valores a confirmar'
        : ' · recibo de pagamento');
    $('payrollSummary').replaceChildren();
    for (const [label, value] of [
      ['Salário bruto', payroll.gross],
      ['Descontos efetivos', payroll.inss + payroll.irrf + payroll.dental],
      ['Renda líquida da competência', payroll.net],
      ['Saldo líquido a receber', payroll.remaining],
    ]) {
      const card = document.createElement('div');
      card.className = 'rounded-xl bg-[#111a14] p-4';
      const title = document.createElement('p');
      title.className = 'muted text-xs';
      title.textContent = label;
      const amount = document.createElement('p');
      amount.className = 'text-xl font-semibold mt-2';
      amount.textContent = money(value);
      card.append(title, amount);
      $('payrollSummary').append(card);
    }
    $('payrollDetails').replaceChildren();
    for (const [label, value] of [
      ['Salário mensal bruto', payroll.gross],
      ['INSS', payroll.inss],
      ['IRRF', payroll.irrf],
      ['Assistência odontológica', payroll.dental],
      ['Adiantamento salarial informado (parte da renda líquida)', payroll.advance],
      ['Total de descontos do recibo (inclui adiantamento)', payroll.deductions],
      ['Saldo líquido a receber no recibo', payroll.remaining],
    ]) {
      const row = document.createElement('div');
      row.className = 'flex justify-between gap-4 text-xs';
      const name = document.createElement('span');
      name.className = 'muted';
      name.textContent = label;
      const amount = document.createElement('span');
      amount.className = 'whitespace-nowrap';
      amount.textContent = money(value);
      row.append(name, amount);
      $('payrollDetails').append(row);
    }
  }
  let renderedMonth = null;
  function render() {
    renderedMonth = $('month').value;
    renderPayroll();
    $('toggleValues').textContent = valuesHidden ? 'Mostrar valores' : 'Ocultar valores';
    $('toggleValues').setAttribute('aria-pressed', String(valuesHidden));
    $('toggleValues').setAttribute(
      'aria-label',
      valuesHidden
        ? 'Habilitar visualização dos valores em reais'
        : 'Desabilitar visualização dos valores em reais',
    );
    $('amount').type = valuesHidden ? 'password' : 'text';
    for (const id of ['goalTarget', 'goalSaved', 'purchaseAmount'])
      $(id).type = valuesHidden ? 'password' : 'text';
    const rows = monthRows(),
      income = rows.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
      expenses = rows.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const totals = categories.map((c) =>
      rows
        .filter((t) => t.type === 'expense' && t.category === c)
        .reduce((s, t) => s + t.amount, 0),
    );
    const max = Math.max(...totals);
    $('income').textContent = money(income);
    $('expenses').textContent = money(expenses);
    $('balance').textContent = money(income - expenses);
    $('balanceNote').textContent = income
      ? `${Math.round(((income - expenses) / income) * 100)}% das receitas disponíveis`
      : 'Receitas menos despesas';
    $('topCategory').textContent = max ? categories[totals.indexOf(max)] : 'Sem despesas';
    $('topCategoryNote').textContent = max
      ? `${money(max)} · ${((max / expenses) * 100).toFixed(1).replace('.', ',')}% das despesas`
      : 'Nenhuma despesa no período';
    $('sampleBanner').hidden = !data.some((t) => t.sample === true);
    $('legend').replaceChildren();
    totals.forEach((total, i) => {
      if (!total) return;
      const row = document.createElement('div');
      row.className = 'text-xs';
      const title = document.createElement('div');
      title.className = 'flex justify-between gap-2 mb-1';
      const name = document.createElement('span');
      name.textContent = '● ' + categories[i];
      name.style.color = colors[i];
      const percent = document.createElement('span');
      percent.className = 'muted';
      percent.textContent = ((total / expenses) * 100).toFixed(1).replace('.', ',') + '%';
      title.append(name, percent);
      const value = document.createElement('div');
      value.className = 'pl-3 font-medium';
      value.textContent = money(total);
      row.append(title, value);
      $('legend').append(row);
    });
    $('emptyChart').hidden = expenses > 0;
    if (typeof Chart !== 'undefined') {
      if (doughnut) doughnut.destroy();
      if (bars) bars.destroy();
      Chart.defaults.color = '#9caba0';
      Chart.defaults.font.family = 'system-ui';
      doughnut = new Chart($('categoryChart'), {
        type: 'doughnut',
        data: {
          labels: categories,
          datasets: [
            {
              data: totals,
              backgroundColor: colors,
              borderColor: '#18211b',
              borderWidth: 5,
              hoverOffset: 7,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '76%',
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) =>
                  `${ctx.label}: ${money(ctx.raw)} (${expenses ? ((ctx.raw / expenses) * 100).toFixed(1).replace('.', ',') : 0}%)`,
              },
            },
          },
        },
      });
      const [year, month] = $('month').value.split('-').map(Number);
      const days = new Date(year, month, 0).getDate();
      const series = (type) =>
        Array.from(
          { length: days },
          (_, i) =>
            rows
              .filter((t) => t.type === type && +t.date.slice(8) === i + 1)
              .reduce((s, t) => s + t.amount, 0) / 100,
        );
      bars = new Chart($('flowChart'), {
        type: 'bar',
        data: {
          labels: Array.from({ length: days }, (_, i) => String(i + 1).padStart(2, '0')),
          datasets: [
            {
              label: 'Receitas',
              data: series('income'),
              backgroundColor: '#c2f570',
              borderRadius: 4,
            },
            {
              label: 'Despesas',
              data: series('expense'),
              backgroundColor: '#799a82',
              borderRadius: 4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: {
              position: 'bottom',
              align: 'start',
              labels: { boxWidth: 8, boxHeight: 8, usePointStyle: true, padding: 20 },
            },
            tooltip: {
              callbacks: {
                title: (items) => `Dia ${items[0].label}`,
                label: (ctx) => `${ctx.dataset.label}: ${money(Math.round(ctx.raw * 100))}`,
              },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { maxTicksLimit: 12 },
              title: { display: true, text: 'Dia do mês' },
            },
            y: {
              beginAtZero: true,
              grid: { color: '#2a352d' },
              border: { display: false },
              ticks: {
                maxTicksLimit: 5,
                callback: (v) =>
                  valuesHidden
                    ? 'R$ •••'
                    : 'R$ ' + new Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(v),
              },
            },
          },
        },
      });
    } else {
      toast('Gráficos indisponíveis. Seus lançamentos continuam disponíveis.');
    }
    renderHistory();
    renderFeatures();
  }
  $('transactionForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const field = $('amount');
    field.setCustomValidity('');
    let amount;
    try {
      amount = cents(field.value);
    } catch (error) {
      field.setCustomValidity(error.message);
      field.reportValidity();
      return;
    }
    const description = $('description').value.trim();
    if (!description) {
      $('description').setCustomValidity('Informe uma descrição.');
      $('description').reportValidity();
      return;
    }
    if (!validDate($('date').value)) return;
    const previousEntry = data.find((t) => t.id === editingId);
    const entry = {
      ...previousEntry,
      id: editingId || uid(),
      description,
      amount,
      type: $('type').value,
      category: $('category').value,
      date: $('date').value,
      sample: false,
      status: $('transactionStatus').value,
    };
    if (
      entry.category === 'Cartão de crédito' &&
      data.some((t) => t.source === 'card-invoice' && t.date.slice(0, 7) === entry.date.slice(0, 7))
    ) {
      toast(
        'Este mês já tem fatura detalhada. Cadastre a compra em Cartões para evitar duplicar despesas.',
      );
      return;
    }
    const previousMonth = $('month').value;
    $('month').value = entry.date.slice(0, 7);
    const wasEditing = Boolean(editingId);
    if (save(editingId ? data.map((t) => (t.id === editingId ? entry : t)) : [...data, entry])) {
      resetForm();
      toast(
        storageAvailable
          ? wasEditing
            ? 'Lançamento atualizado com sucesso.'
            : 'Lançamento salvo com sucesso.'
          : 'Lançamento salvo apenas nesta sessão.',
      );
      $('description').focus();
    } else {
      $('month').value = previousMonth;
    }
  });
  function resetForm() {
    editingId = null;
    $('transactionForm').reset();
    $('amount').setCustomValidity('');
    $('description').setCustomValidity('');
    $('date').value = $('month').value === initialMonth ? today : $('month').value + '-01';
    $('newTitle').textContent = 'Novo lançamento';
    $('submitTransaction').textContent = '+ Adicionar lançamento';
    $('cancelEdit').hidden = true;
  }
  function startEdit(t) {
    editingId = t.id;
    $('description').value = t.description;
    $('amount').value = (t.amount / 100).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    $('type').value = t.type;
    $('category').value = t.category;
    $('date').value = t.date;
    $('transactionStatus').value = t.status === 'completed' ? 'completed' : 'planned';
    $('amount').setCustomValidity('');
    $('description').setCustomValidity('');
    $('newTitle').textContent = 'Editar lançamento';
    $('submitTransaction').textContent = 'Salvar alterações';
    $('cancelEdit').hidden = false;
    $('transactionForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
    $('amount').focus({ preventScroll: true });
  }
  $('cancelEdit').onclick = resetForm;
  $('toggleValues').onclick = () => {
    valuesHidden = !valuesHidden;
    try {
      localStorage.setItem(KEY + '.hideValues', String(valuesHidden));
    } catch {
      toast('Preferência aplicada apenas nesta sessão.');
    }
    render();
  };
  $('export').title = 'O arquivo CSV contém os valores reais, mesmo quando ocultos na tela.';
  $('amount').addEventListener('input', () => $('amount').setCustomValidity(''));
  $('description').addEventListener('input', () => $('description').setCustomValidity(''));
  $('month').addEventListener('change', () => {
    if (!validMonth($('month').value)) $('month').value = initialMonth;
    // Alguns navegadores reenviam change ao desfocar: não substituir o botão durante o clique.
    if (renderedMonth !== $('month').value) render();
  });
  for (const id of ['search', 'categoryFilter', 'typeFilter'])
    $(id).addEventListener('input', renderHistory);
  $('clearSamples').onclick = () => $('confirmDialog').showModal();
  $('cancelClear').onclick = () => $('confirmDialog').close();
  $('confirmClear').onclick = () => {
    if (save(data.filter((t) => t.sample !== true))) {
      if (editingId && !data.some((t) => t.id === editingId)) resetForm();
      $('confirmDialog').close();
      toast('Dados de exemplo removidos.');
    }
  };
  $('export').onclick = async () => {
    const rows = visibleRows();
    if (!rows.length) {
      toast('Não há transações para exportar com estes filtros.');
      return;
    }
    const escapeCSV = (value) =>
      '"' +
      String(value)
        .replace(/^[=+@\-\t\r]/, "'$&")
        .replace(/"/g, '""') +
      '"';
    const content = [
      ['Data', 'Descrição', 'Categoria', 'Tipo', 'Situação', 'Valor (R$)'],
      ...rows.map((t) => [
        t.date.split('-').reverse().join('/'),
        t.description,
        t.category,
        t.type === 'income' ? 'Receita' : 'Despesa',
        completed(t) ? (t.type === 'income' ? 'Recebido' : 'Pago') : 'Previsto',
        (t.amount / 100).toFixed(2).replace('.', ','),
      ]),
    ]
      .map((row) => row.map(escapeCSV).join(';'))
      .join('\r\n');
    try {
      await exportFile(
        '\uFEFF' + content,
        `saldo-${$('month').value}.csv`,
        'text/csv;charset=utf-8',
      );
    } catch {
      toast('Não foi possível salvar o CSV.');
      return;
    }
    toast('CSV exportado com os filtros atuais.');
  };
  async function downloadJSON(content, filename) {
    await exportFile(JSON.stringify(content, null, 2), filename, 'application/json;charset=utf-8');
  }
  $('downloadBackup').onclick = async () => {
    const next = structuredClone(settings);
    next.lastBackupAt = new Date().toISOString();
    next.lastBackupSignature = signature();
    if (!commit(data, next)) return;
    try {
      await downloadJSON(backupPayload(), 'saldo-backup-' + today + '.json');
      toast('Backup completo gerado. Confira o arquivo em Downloads.');
    } catch (error) {
      next.lastBackupSignature = null;
      commit(data, next);
      toast('Não foi possível gerar o arquivo de backup. Tente novamente.');
    }
  };
  $('restoreBackup').onclick = () => $('backupFile').click();
  $('backupFile').onchange = async () => {
    const file = $('backupFile').files[0];
    if (!file) return;
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error('O limite do backup é 10 MB.');
      const backup = JSON.parse(await file.text());
      if (
        backup.application !== 'saldo' ||
        ![1, 2].includes(backup.version) ||
        !Array.isArray(backup.transactions) ||
        !backup.transactions.every(validRecord) ||
        new Set(backup.transactions.map((t) => t.id)).size !== backup.transactions.length
      )
        throw new Error('Arquivo de backup inválido.');
      if (!storageAvailable)
        throw new Error(
          'O armazenamento deste navegador está indisponível. Use outro navegador para restaurar.',
        );
      if (
        !confirm(
          'Restaurar ' +
            backup.transactions.length +
            ' lançamentos? Isso substituirá todos os registros atuais neste navegador. Salve um backup antes se quiser preservá-los.',
        )
      )
        return;
      const restoredSettings =
        backup.version === 2 ? validateSettings(backup.settings) : emptySettings();
      for (const marker of ['demo-investments-v1', 'demo-installments-dec2026-jun2027-v1'])
        if (!restoredSettings.imports.includes(marker)) restoredSettings.imports.push(marker);
      if (!commit(backup.transactions, restoredSettings)) return;
      resetPurchase();
      for (const month of Object.keys(PAYROLLS))
        localStorage.setItem(payrollImportKey(month), 'done');
      localStorage.setItem(EXPENSES_IMPORT_KEY, 'done');
      localStorage.setItem(CARD_IMPORT_KEY, 'done');
      localStorage.setItem(SEPTEMBER_IMPORT_KEY, 'done');
      if (typeof backup.month === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(backup.month))
        $('month').value = backup.month;
      valuesHidden = backup.valuesHidden === true;
      resetForm();
      render();
      toast('Backup restaurado com sucesso.');
    } catch (error) {
      toast(
        error instanceof SyntaxError
          ? 'Não foi possível ler o JSON do backup.'
          : error.message || 'Não foi possível restaurar o backup.',
      );
    } finally {
      $('backupFile').value = '';
    }
  };
  window.addEventListener('storage', (event) => {
    if (event.key !== STATE_KEY || !storageAvailable) return;
    try {
      if (event.newValue === null) {
        toast('Os dados foram removidos em outra aba. Atualize esta página.');
        return;
      }
      const next = JSON.parse(event.newValue);
      validateSettings(next.settings);
      if (!Array.isArray(next.transactions) || !next.transactions.every(validRecord))
        throw new Error('invalid');
      data = next.transactions;
      settings = next.settings;
      lastStateRaw = event.newValue;
      resetForm();
      render();
      toast('Dados atualizados em outra aba.');
    } catch {
      toast('Não foi possível sincronizar. Atualize esta página antes de salvar.');
    }
  });
  window.addEventListener('beforeunload', (event) => {
    if (signature() !== settings.lastBackupSignature) {
      event.preventDefault();
      event.returnValue = '';
    }
  });
  suggestedFirstMonth();
  render();
})();
