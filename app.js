/* auramen bot — invito e configuratore (vanilla JS, nessuna dipendenza) */

const CLIENT_ID = '1550469997986642236';
const PERMISSIONS = '1099780189334';
const INVITE_URL = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&permissions=${PERMISSIONS}&scope=bot%20applications.commands`;

const STORAGE_KEY = 'auramen.setup.v1';
const DASH = 'da selezionare dal menu';

const asChannel = value => (/^\d{15,25}$/.test(value) ? `<#${value}>` : DASH);
const asRole = value => (/^\d{15,25}$/.test(value) ? `<@&${value}>` : DASH);

const FEATURES = {
  ticket: {
    label: '🎫 Ticket',
    rows: [
      [
        { key: 'ticketPanel', label: 'ID canale pannello' },
        { key: 'ticketLog', label: 'ID canale log' },
        { key: 'ticketTranscript', label: 'ID canale transcript' }
      ],
      [
        { key: 'ticketStaff', label: 'ID ruolo staff' },
        { key: 'ticketCategory', label: 'ID categoria (facoltativo)' },
        { key: 'ticketMax', label: 'Max ticket per utente (1-5)' }
      ]
    ],
    build(values) {
      const picks = [
        { label: 'categoria', value: values.ticketCategory ? asChannel(values.ticketCategory) : DASH },
        { label: 'pannello', value: asChannel(values.ticketPanel) },
        { label: 'log', value: asChannel(values.ticketLog) },
        { label: 'transcript', value: asChannel(values.ticketTranscript) },
        { label: 'staff', value: asRole(values.ticketStaff) }
      ];
      if (values.ticketMax) picks.push({ label: 'max_per_utente', value: values.ticketMax });
      return [
        { command: '/ticket setup', picks },
        { command: '/ticket pannello', note: 'Pubblica il pannello nel canale scelto.' }
      ];
    }
  },

  logs: {
    label: '🧾 Log',
    rows: [
      [
        { key: 'logModeration', label: 'ID canale log moderazione' },
        { key: 'logTicket', label: 'ID canale log ticket' }
      ]
    ],
    build(values) {
      return [
        {
          command: '/setup logs categoria:moderation',
          picks: [{ label: 'canale', value: asChannel(values.logModeration) }]
        },
        {
          command: '/setup logs categoria:ticket',
          picks: [{ label: 'canale', value: asChannel(values.logTicket) }]
        }
      ];
    }
  },

  counter: {
    label: '🔢 Counter',
    rows: [
      [
        {
          key: 'counterType',
          label: 'Tipo di counter',
          type: 'select',
          options: [
            { value: 'membri', label: 'Membri' },
            { value: 'online', label: 'Online' },
            { value: 'bot', label: 'Bot' }
          ]
        },
        { key: 'counterChannel', label: 'ID canale vocale/testuale' },
        { key: 'counterFormat', label: 'Formato (facoltativo)' }
      ]
    ],
    build(values) {
      const labels = { membri: 'Membri: {count}', online: 'Online: {count}', bot: 'Bot: {count}' };
      const type = values.counterType || 'membri';
      return [{
        command: `/counter setup tipo:${type}`,
        picks: [
          { label: 'tipo', value: type },
          { label: 'canale', value: asChannel(values.counterChannel) },
          { label: 'formato', value: values.counterFormat || labels[type] }
        ]
      }];
    }
  },

  rules: {
    label: '📜 Regole',
    rows: [[{ key: 'rulesChannel', label: 'ID canale regolamento' }]],
    build(values) {
      return [
        {
          command: '/regole pubblica',
          picks: [{ label: 'canale', value: asChannel(values.rulesChannel) }]
        },
        { command: '/regole config', note: 'Facoltativo: titolo, testo, footer e colore.' }
      ];
    }
  },

  moderation: {
    label: '🛡️ Permessi moderazione',
    rows: [
      [
        {
          key: 'permCommand',
          label: 'Comando',
          type: 'select',
          options: [
            { value: 'warn', label: 'warn' },
            { value: 'timeout', label: 'timeout' },
            { value: 'untimeout', label: 'untimeout' },
            { value: 'kick', label: 'kick' },
            { value: 'ban', label: 'ban' },
            { value: 'unban', label: 'unban' },
            { value: 'purge', label: 'purge' }
          ]
        },
        { key: 'permRole', label: 'ID ruolo autorizzato' },
        { key: 'permChannel', label: 'ID canale del comando' }
      ]
    ],
    build(values) {
      const command = values.permCommand || 'warn';
      return [{
        command: `/setup permessi comando:${command}`,
        picks: [
          { label: 'ruolo', value: asRole(values.permRole) },
          { label: 'canale', value: asChannel(values.permChannel) }
        ],
        note: 'Ripeti il comando per ogni azione che vuoi aprire allo staff.'
      }];
    }
  }
};

const ORDER = ['ticket', 'logs', 'counter', 'rules', 'moderation'];

const state = {
  active: new Set(['ticket', 'logs']),
  values: {
    counterType: 'membri',
    permCommand: 'warn'
  }
};

/* ------------------------------------------------------------------ state -- */
function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!saved) return;
    if (Array.isArray(saved.active)) state.active = new Set(saved.active.filter(id => FEATURES[id]));
    if (saved.values && typeof saved.values === 'object') state.values = { ...state.values, ...saved.values };
  } catch { /* preferenze non leggibili: si parte dai valori predefiniti */ }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ active: [...state.active], values: state.values }));
  } catch { /* modalità privata */ }
}

/* ------------------------------------------------------------------- dom --- */
const fieldsEl = document.getElementById('fields');
const outputEl = document.getElementById('output');
const toastEl = document.getElementById('toast');

let toastTimer;
function toast(message) {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('is-visible'), 1900);
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function fieldNode(featureId, field) {
  const label = el('label', 'field');
  label.append(el('span', null, field.label));

  if (field.type === 'select') {
    const select = document.createElement('select');
    select.dataset.key = field.key;
    for (const option of field.options) {
      const node = document.createElement('option');
      node.value = option.value;
      node.textContent = option.label;
      if ((state.values[field.key] || field.options[0].value) === option.value) node.selected = true;
      select.append(node);
    }
    select.addEventListener('change', () => {
      state.values[field.key] = select.value;
      saveState();
      renderPlan();
    });
    label.append(select);
    return label;
  }

  const input = document.createElement('input');
  input.type = 'text';
  input.inputMode = 'numeric';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.dataset.key = field.key;
  input.placeholder = 'es. 123456789012345678';
  input.value = state.values[field.key] || '';
  input.addEventListener('input', () => {
    const cleaned = input.value.replace(/[^\d]/g, '').slice(0, 25);
    if (cleaned !== input.value) input.value = cleaned;
    state.values[field.key] = cleaned;
    saveState();
    renderPlan();
  });
  label.append(input);
  return label;
}

function renderFields() {
  if (!fieldsEl) return;
  fieldsEl.replaceChildren();

  const active = ORDER.filter(id => state.active.has(id));
  if (!active.length) {
    fieldsEl.append(el('p', 'hint', 'Nessuna funzione selezionata: attiva almeno un chip qui sopra.'));
    return;
  }

  for (const id of active) {
    const feature = FEATURES[id];
    const group = el('div', 'group');
    group.append(el('p', 'group__title', feature.label.replace(/^\S+\s/, '')));
    for (const row of feature.rows) {
      const rowEl = el('div', 'group__row');
      for (const field of row) rowEl.append(fieldNode(id, field));
      group.append(rowEl);
    }
    fieldsEl.append(group);
  }
}

/* ------------------------------------------------------------------ plan --- */
function buildPlan() {
  const steps = [];
  for (const id of ORDER) {
    if (!state.active.has(id)) continue;
    const feature = FEATURES[id];
    for (const step of feature.build(state.values, state)) {
      steps.push({ section: feature.label, ...step });
    }
  }
  return steps;
}

function copyButton(getText, label = 'copia') {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'copy';
  button.textContent = label;
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(getText());
      toast('Copiato');
    } catch {
      toast('Copia non disponibile: seleziona il testo');
    }
  });
  return button;
}

function renderPlan() {
  if (!outputEl) return;
  outputEl.replaceChildren();
  const steps = buildPlan();

  if (!steps.length) {
    outputEl.append(el('li', 'plan__empty', 'Attiva una funzione per vedere i comandi.'));
    return;
  }

  for (const step of steps) {
    const item = document.createElement('li');

    const head = el('div', 'plan__cmd');
    head.append(el('code', null, step.command));
    head.append(copyButton(() => step.command));

    item.append(head);

    if (step.picks?.length) {
      const list = el('ul', 'plan__picks');
      for (const pick of step.picks) {
        const row = document.createElement('li');
        row.append(el('b', null, pick.label));
        row.append(el('span', null, pick.value));
        list.append(row);
      }
      item.append(list);
    }

    if (step.note) item.append(el('p', 'hint', step.note));
    outputEl.append(item);
  }
}

function planAsText() {
  return buildPlan()
    .map((step, index) => {
      const picks = (step.picks || []).map(pick => `   · ${pick.label}: ${pick.value}`).join('\n');
      return `${index + 1}. ${step.section} — ${step.command}${picks ? `\n${picks}` : ''}${step.note ? `\n   (${step.note})` : ''}`;
    })
    .join('\n\n');
}

/* ----------------------------------------------------------------- setup --- */
function wireChips() {
  document.querySelectorAll('.chip[data-feature]').forEach(chip => {
    const id = chip.dataset.feature;
    if (!FEATURES[id]) return;
    chip.setAttribute('aria-pressed', String(state.active.has(id)));
    chip.addEventListener('click', () => {
      const pressed = chip.getAttribute('aria-pressed') === 'true';
      chip.setAttribute('aria-pressed', String(!pressed));
      if (pressed) state.active.delete(id);
      else state.active.add(id);
      saveState();
      renderFields();
      renderPlan();
    });
  });
}

function wireInvites() {
  document.querySelectorAll('[data-invite]').forEach(link => {
    link.href = INVITE_URL;
  });
}

function wireActions() {
  document.getElementById('copy-all')?.addEventListener('click', async () => {
    const text = planAsText();
    if (!text) {
      toast('Nessun comando da copiare');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast('Piano copiato');
    } catch {
      toast('Copia non disponibile: seleziona il testo');
    }
  });

  document.getElementById('reset')?.addEventListener('click', () => {
    state.active = new Set();
    state.values = { counterType: 'membri', permCommand: 'warn' };
    document.querySelectorAll('.chip[data-feature]').forEach(chip => chip.setAttribute('aria-pressed', 'false'));
    saveState();
    renderFields();
    renderPlan();
    toast('Piano svuotato');
  });
}

function wireReveal() {
  const targets = document.querySelectorAll('.section, .card, .config, .cta');
  if (!('IntersectionObserver' in window) || !targets.length) return;
  targets.forEach(node => node.classList.add('reveal'));
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      }
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
  targets.forEach(node => observer.observe(node));
}

/* Sidebar: lente di vetro che scivola sulla voce attiva + drawer su mobile. */
function wireRail() {
  const rail = document.querySelector('.rail');
  const nav = document.getElementById('rail-nav');
  const toggle = document.getElementById('rail-toggle');
  if (!rail || !nav) return;

  const lens = nav.querySelector('.rail__lens');
  const items = [...nav.querySelectorAll('.rail__item')];

  const setOpen = open => {
    nav.classList.toggle('is-open', open);
    toggle?.setAttribute('aria-expanded', String(open));
  };

  toggle?.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));
  items.forEach(item => item.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') setOpen(false);
  });
  document.addEventListener('pointerdown', event => {
    if (!nav.classList.contains('is-open')) return;
    if (rail.contains(event.target)) return;
    setOpen(false);
  });

  const placeLens = item => {
    if (!lens || !item) return;
    nav.classList.add('is-active');
    lens.style.setProperty('--lens-y', `${item.offsetTop}px`);
    lens.style.height = `${item.offsetHeight}px`;
  };

  items.forEach(item => item.addEventListener('mouseenter', () => placeLens(item)));
  items.forEach(item => item.addEventListener('focus', () => placeLens(item)));

  const sections = items
    .map(item => document.getElementById(item.dataset.section))
    .filter(Boolean);

  if ('IntersectionObserver' in window && sections.length) {
    const ratios = new Map();
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) ratios.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0);
      let bestId = null;
      let bestRatio = 0;
      for (const [id, ratio] of ratios) {
        if (ratio > bestRatio) { bestRatio = ratio; bestId = id; }
      }
      const active = items.find(item => item.dataset.section === bestId) || null;
      items.forEach(item => item.classList.toggle('is-active', item === active));
      if (active) placeLens(active);
      else nav.classList.remove('is-active');
    }, { rootMargin: '-25% 0px -50% 0px', threshold: [0, 0.1, 0.3, 0.6, 1] });
    sections.forEach(section => observer.observe(section));
  }

  window.addEventListener('resize', () => {
    const active = items.find(item => item.classList.contains('is-active'));
    if (active) placeLens(active);
  });
}

/* Effetto liquido: riflesso che segue il puntatore + ripple gooey al tocco. */
function wireLiquidButtons() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.querySelectorAll('.btn, .chip').forEach(node => {
    node.addEventListener('pointermove', event => {
      const rect = node.getBoundingClientRect();
      node.style.setProperty('--mx', `${event.clientX - rect.left}px`);
      node.style.setProperty('--my', `${event.clientY - rect.top}px`);
    });

    node.addEventListener('pointerleave', () => {
      node.style.removeProperty('--mx');
      node.style.removeProperty('--my');
    });

    node.addEventListener('pointerdown', event => {
      if (reduced) return;
      const rect = node.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 1.7;
      const ripple = document.createElement('span');
      ripple.className = 'btn__ripple';
      ripple.setAttribute('aria-hidden', 'true');
      ripple.style.width = `${size}px`;
      ripple.style.height = `${size}px`;
      ripple.style.left = `${event.clientX - rect.left}px`;
      ripple.style.top = `${event.clientY - rect.top}px`;
      node.append(ripple);
      ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
    });
  });
}

loadState();
wireChips();
wireInvites();
wireActions();
renderFields();
renderPlan();
wireReveal();
wireRail();
wireLiquidButtons();
