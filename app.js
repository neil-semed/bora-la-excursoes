// ============================================================
// BORA LÁ - EXCURSÕES | Lógica principal com Supabase
// ============================================================

// Credenciais públicas do projeto Supabase do Bora Lá (a chave "anon" é feita para ser
// pública - o que protege os dados de verdade são as regras de RLS no banco, não esta chave).
// Se algum dia precisar trocar de projeto sem mexer no código, ainda dá pra sobrescrever
// pela tela "⚙️ Configurar Supabase" (o que for salvo lá tem prioridade sobre isto aqui).
const DEFAULT_SUPABASE_URL = 'https://rjuzhscynuleypaewgak.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqdXpoc2N5bnVsZXlwYWV3Z2FrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2NTQwNDAsImV4cCI6MjEwNDIzMDA0MH0.enT2gJB4dy2xz_Z91tPY4ysoJ-GEEn2dpo_RHiy5jAs';

let sb = null;
let currentUser = null;
let wizardStep = 1;
let wizardPcdList = []; // [{ nome_aluno, cadeirante, nome_apoio }] - alunos PCD da solicitação em andamento

let schools = [];
let vehicles = [];
let drivers = [];
let agenda = [];
let cooperativas = [];
let appSettings = { remetente_nome: '', remetente_email: '' };

let assignTargetId = null;
let rejectTargetId = null;
let cancelTargetId = null;
let passengerModalExcursionId = null;
let passengerRows = []; // [{ nome, documento }] - listagem em edição no modal
let emailTargetId = null;

// permissão de tela por perfil (espelha data-roles do index.html)
const SCREEN_ROLES = {
  dashboard: ['admin', 'escola', 'pedagogia', 'motorista'],
  agenda: ['admin', 'escola', 'pedagogia', 'motorista'],
  solicitacao: ['admin', 'escola'],
  unidades: ['admin'],
  veiculos: ['admin'],
  motoristas: ['admin'],
  cooperativas: ['admin'],
  relatorios: ['admin', 'pedagogia'],
};

const ROLE_DEFAULT_SCREEN = {
  admin: 'dashboard',
  pedagogia: 'dashboard',
  escola: 'dashboard',
  motorista: 'agenda',
};

const ROLE_LABELS = { admin: 'Admin', escola: 'Escola', pedagogia: 'Pedagogia', motorista: 'Motorista' };

// "Situação" é o status principal que admin/pedagogia/escola acompanham (coluna com
// dropdown editável, igual à planilha usada hoje). O campo interno "status" continua
// controlando por baixo os botões de ação (aprovar/recusar/atribuir/iniciar/concluir).
const SITUACAO_LABELS = {
  sem_validacao: 'Sem Validação',
  aguarda_atf: 'Aguarda ATF',
  aprovada: 'Aprovada',
  confirmada: 'Confirmada',
  envio_coop: 'Envio Coop',
  reprovada: 'Reprovada',
  cancelada: 'Cancelada',
  sem_listagem: 'Sem Listagem',
};
const SITUACAO_COLORS = {
  sem_validacao: 'background:#e5e7eb;color:#374151',
  aguarda_atf: 'background:#fde68a;color:#92400e',
  aprovada: 'background:#bbf7d0;color:#166534',
  confirmada: 'background:#bfdbfe;color:#1e3a8a',
  envio_coop: 'background:#d6d3a1;color:#4d4600',
  reprovada: 'background:#fecaca;color:#7f1d1d',
  cancelada: 'background:#fee2e2;color:#991b1b',
  sem_listagem: 'background:#cbd5e1;color:#334155',
};
const ATF_LABELS = { nao_precisa: 'Não Precisa', nao_emitida: 'Não Emitida', emitida: 'Emitida' };
const ATF_COLORS = {
  nao_precisa: 'background:#fef9c3;color:#854d0e',
  nao_emitida: 'background:#fee2e2;color:#991b1b',
  emitida: 'background:#bbf7d0;color:#166534',
};

// Perfis de outros usuários (pra resolver "validador (primeiro nome)" etc).
let profilesById = {};

// ============ DADOS DE DEMONSTRAÇÃO (usados quando o Supabase não está configurado) ============
const DEMO_SCHOOLS = [
  { id: 's1', name: 'EMEF Prof. João Silva', address: 'Rua das Flores, 100 - Centro', contact: '(31) 3581-0000', tipo: 'escola' },
  { id: 's2', name: 'EMEF Maria Aparecida', address: 'Av. Brasil, 500 - Cristina', contact: '(31) 3581-0001', tipo: 'escola' },
  { id: 's3', name: 'EE Prof. Carlos Drumond', address: 'Rua Minas Gerais, 200 - Vila Operária', contact: '(31) 3581-0002', tipo: 'escola' },
  { id: 's4', name: 'Associação Comunitária Vila Rita', address: 'Rua Piauí, 80 - Vila Rita', contact: '(31) 3581-0010', tipo: 'entidade' },
];

const DEMO_VEHICLES = [
  { id: 'v1', plate: 'ABC-1234', type: 'micro-onibus', capacity: 32, cooperative: 'CoopTrans', active: true },
  { id: 'v2', plate: 'DEF-5678', type: 'van', capacity: 15, cooperative: 'CoopTrans', active: true },
  { id: 'v3', plate: 'GHI-9012', type: 'micro-onibus', capacity: 32, cooperative: 'TransNova', active: true },
];

const DEMO_COOPERATIVAS = [
  { id: 'c1', name: 'CoopTrans', email: 'coopertrans@exemplo.com.br', phone: '(31) 99999-0000' },
  { id: 'c2', name: 'TransNova', email: 'transnova@exemplo.com.br', phone: '(31) 99999-0001' },
];

// Cada motorista é dono do próprio veículo (vehicle_id) — dirige sempre o mesmo.
const DEMO_DRIVERS = [
  { id: 'd1', name: 'João Silva', cnh: '01234567890', phone: '(31) 99999-1111', cooperative: 'CoopTrans', cooperativa_id: 'c1', active: true, vehicle_id: 'v1' },
  { id: 'd2', name: 'Pedro Santos', cnh: '09876543210', phone: '(31) 99999-2222', cooperative: 'CoopTrans', cooperativa_id: 'c1', active: true, vehicle_id: 'v2' },
];

const DEMO_APP_SETTINGS = { remetente_nome: 'Excursão Semed', remetente_email: 'excursao.semed@pnl.mg.gov.br' };

function fmtDate(d) { return d.toISOString().split('T')[0]; }

// Turno é sempre calculado a partir do horário de saída (não é mais escolhido à mão),
// pra nunca ficar desalinhado do horário de verdade da viagem.
function turnoFromHora(hhmm) {
  if (!hhmm) return null;
  const h = parseInt(hhmm.split(':')[0], 10);
  if (isNaN(h)) return null;
  if (h < 12) return 'manha';
  if (h < 18) return 'tarde';
  return 'noite';
}
const TURNO_LABELS = { manha: 'Manhã', tarde: 'Tarde', noite: 'Noite' };

// Gera as datas de ocorrência de um evento "Continuado" (semanal/quinzenal/mensal),
// nos dias da semana marcados, entre a data inicial (inclusive) e a data final (inclusive).
function computeRecurrenceDates(startDateStr, endDateStr, recurrence, weekdays) {
  const start = new Date(startDateStr + 'T00:00');
  const end = new Date(endDateStr + 'T00:00');
  if (isNaN(start) || isNaN(end) || end < start || !weekdays.length) return [];
  const stepDays = recurrence === 'semanal' ? 7 : recurrence === 'quinzenal' ? 14 : 28;
  const weekStart = new Date(start);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const dates = [];
  let cursor = new Date(weekStart);
  while (cursor <= end) {
    weekdays.forEach((wd) => {
      const occ = new Date(cursor);
      occ.setDate(occ.getDate() + wd);
      if (occ >= start && occ <= end) dates.push(fmtDate(occ));
    });
    cursor.setDate(cursor.getDate() + stepDays);
  }
  return [...new Set(dates)].sort();
}

function buildDemoAgenda() {
  const today = new Date();
  const addDays = (n) => { const d = new Date(today); d.setDate(d.getDate() + n); return fmtDate(d); };
  const base = [
    { id: 'e1', school_id: 's1', destination: 'Museu de Ciências e Técnica', city: 'Belo Horizonte', trip_date: addDays(3), departure_time: '08:00', return_time: '17:00', students_count: 30, companions_count: 3, recurrence: 'unico', status: 'pending', situacao: 'sem_validacao', notes: '', created_by: null },
    { id: 'e2', school_id: 's1', destination: 'Parque Ecológico', city: 'Nova Lima', trip_date: addDays(5), departure_time: '13:00', return_time: '17:30', students_count: 25, companions_count: 2, recurrence: 'unico', status: 'pedagogy_approved', situacao: 'aprovada', pedagogy_approved_at: new Date().toISOString(), notes: '', created_by: null },
    { id: 'e3', school_id: 's2', destination: 'Teatro Municipal', city: 'Belo Horizonte', trip_date: addDays(1), departure_time: '09:00', return_time: '12:00', students_count: 40, companions_count: 4, recurrence: 'unico', status: 'approved', situacao: 'confirmada', assigned_vehicle_id: 'v1', assigned_driver_id: 'd1', notes: '', created_by: null },
    { id: 'e4', school_id: 's2', destination: 'Cachoeira do Cardoso', city: 'Nova Lima', trip_date: addDays(0), departure_time: '07:30', return_time: '11:30', students_count: 15, companions_count: 2, recurrence: 'unico', status: 'in_transit', situacao: 'confirmada', assigned_vehicle_id: 'v2', assigned_driver_id: 'd2', notes: '', created_by: null },
    { id: 'e5', school_id: 's3', destination: 'Biblioteca Pública', city: 'Nova Lima', trip_date: addDays(-2), departure_time: '08:30', return_time: '11:00', students_count: 20, companions_count: 2, recurrence: 'unico', status: 'completed', situacao: 'confirmada', assigned_vehicle_id: 'v3', assigned_driver_id: 'd1', notes: '', created_by: null },
    { id: 'e6', school_id: 's3', destination: 'Parque Aquático', city: 'Contagem', trip_date: addDays(7), departure_time: '08:00', return_time: '18:00', students_count: 35, companions_count: 4, recurrence: 'unico', status: 'rejected', situacao: 'reprovada', rejection_reason: 'Fora do calendário letivo aprovado.', notes: '', created_by: null },
  ];
  // completa os campos novos (turno, ATF, motorista(s), etc.) em cima da base acima
  return base.map((a) => ({
    turno: 'manha',
    destination_address: null,
    pca_count: 0,
    apoio_count: 0,
    atf_status: a.city && !a.city.toLowerCase().includes('nova lima') ? 'nao_emitida' : 'nao_precisa',
    envio_coop_data: null,
    lista_escola: false,
    requester_name: (DEMO_SCHOOLS.find((s) => s.id === a.school_id) || {}).name || null,
    requester_address: null,
    requester_contact: null,
    recurrence_group_id: null,
    cancel_reason: null,
    pcd_students: [],
    passengers: [],
    driver_ids: a.assigned_driver_id ? [a.assigned_driver_id] : [],
    created_at: new Date().toISOString(),
    ...a,
  }));
}

// Modo demonstração agora precisa sobreviver à troca de página (login.html -> app.html
// -> volta pro login em outro perfil), então guardamos escolas/veículos/motoristas/agenda
// em sessionStorage em vez de só em memória. sessionStorage some quando a aba fecha, o que
// combina com a natureza "só para teste" do modo demonstração.
function loadDemoData() {
  const raw = sessionStorage.getItem('demoData');
  if (raw) {
    try {
      const d = JSON.parse(raw);
      schools = d.schools || DEMO_SCHOOLS;
      vehicles = d.vehicles || DEMO_VEHICLES;
      drivers = d.drivers || DEMO_DRIVERS;
      agenda = d.agenda || buildDemoAgenda();
      cooperativas = d.cooperativas || DEMO_COOPERATIVAS;
      appSettings = d.appSettings || { ...DEMO_APP_SETTINGS };
      backfillDemoData();
      return;
    } catch (e) {
      console.warn('Não foi possível ler os dados de demonstração salvos, recomeçando:', e);
    }
  }
  schools = DEMO_SCHOOLS;
  vehicles = DEMO_VEHICLES;
  drivers = DEMO_DRIVERS;
  agenda = buildDemoAgenda();
  cooperativas = DEMO_COOPERATIVAS;
  appSettings = { ...DEMO_APP_SETTINGS };
  saveDemoData();
}

function saveDemoData() {
  sessionStorage.setItem('demoData', JSON.stringify({ schools, vehicles, drivers, agenda, cooperativas, appSettings }));
}

// Preenche campos novos (Situação/ATF/turno/motorista(s)/tipo/veículo do motorista etc.)
// em dados de demonstração que ficaram salvos em sessionStorage de uma versão anterior
// do app, pra não quebrar uma sessão de teste já aberta.
function backfillDemoData() {
  schools.forEach((s) => { if (s.tipo === undefined) s.tipo = 'escola'; });
  drivers.forEach((d) => { if (d.vehicle_id === undefined) d.vehicle_id = null; if (d.cooperativa_id === undefined) d.cooperativa_id = null; });
  if (!cooperativas) cooperativas = DEMO_COOPERATIVAS;
  if (!appSettings) appSettings = { ...DEMO_APP_SETTINGS };
  agenda.forEach((a) => {
    if (a.driver_ids === undefined) a.driver_ids = a.assigned_driver_id ? [a.assigned_driver_id] : [];
    if (a.situacao === undefined) a.situacao = 'sem_validacao';
    if (a.atf_status === undefined) a.atf_status = 'nao_precisa';
    if (a.turno === undefined) a.turno = 'manha';
    if (a.lista_escola === undefined) a.lista_escola = false;
    if (a.pca_count === undefined) a.pca_count = 0;
    if (a.apoio_count === undefined) a.apoio_count = 0;
    if (a.pcd_students === undefined) a.pcd_students = [];
    if (a.passengers === undefined) a.passengers = [];
    if (a.recurrence_group_id === undefined) a.recurrence_group_id = null;
  });
}

// ============ ÍCONES (tolera falha de rede ao carregar a lib externa) ============
function safeIcons() {
  try {
    if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
  } catch (e) {
    console.warn('⚠️ Ícones (lucide) não carregaram:', e);
  }
}

// ============ INICIALIZAÇÃO ============
// Agora são duas páginas de verdade: index.html (login) e app.html (sistema).
// O <body data-page="login"|"app"> diz pra este mesmo app.js (compartilhado pelas
// duas páginas) qual das duas inicializações rodar.
document.addEventListener('DOMContentLoaded', () => {
  safeIcons();
  initSupabase();

  const page = document.body.dataset.page;
  if (page === 'login') {
    initLoginPage();
  } else if (page === 'app') {
    initAppPage();
  }
});

async function initLoginPage() {
  document.getElementById('loginForm').addEventListener('submit', handleLogin);

  if (!sb) {
    document.getElementById('demoNotice').classList.remove('hidden');
    // Se já existia uma sessão demo ativa (ex: usuário voltou pro index.html sem sair),
    // pula direto pra página do sistema em vez de pedir login de novo.
    if (sessionStorage.getItem('demoUser')) {
      window.location.href = 'app.html';
    }
    return;
  }

  // Supabase configurado: se já existe uma sessão válida (usuário não saiu),
  // vai direto pra página do sistema em vez de mostrar o login de novo.
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (session) window.location.href = 'app.html';
  } catch (err) {
    console.warn('Erro ao checar sessão existente:', err);
  }
}

async function initAppPage() {
  if (!sb) {
    const saved = sessionStorage.getItem('demoUser');
    if (!saved) {
      window.location.href = 'index.html';
      return;
    }
    currentUser = JSON.parse(saved);
    loadDemoData();
    await enterApp();
    return;
  }

  try {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) {
      window.location.href = 'index.html';
      return;
    }
    currentUser = session.user;
    await loadUserProfile();
    await enterApp();
  } catch (err) {
    console.error('Erro ao carregar sessão/perfil na página do sistema:', err);
    window.location.href = 'index.html';
  }
}

// ============ SUPABASE ============
function initSupabase() {
  const url = localStorage.getItem('sb_url') || DEFAULT_SUPABASE_URL;
  const key = localStorage.getItem('sb_key') || DEFAULT_SUPABASE_ANON_KEY;

  if (url && key) {
    try {
      sb = window.supabase.createClient(url, key);
      console.log('✅ Supabase conectado');
    } catch (e) {
      console.warn('⚠️ Erro ao conectar Supabase:', e);
    }
  } else {
    console.log('ℹ️ Supabase não configurado - usando modo demo');
  }
}

function togglePasswordVisibility() {
  const input = document.getElementById('loginPassword');
  const icon = document.getElementById('togglePasswordIcon');
  const btn = document.getElementById('togglePasswordBtn');
  const showing = input.type === 'text';
  input.type = showing ? 'password' : 'text';
  if (icon) icon.textContent = showing ? '👁️' : '🙈';
  if (btn) btn.setAttribute('aria-label', showing ? 'Mostrar senha' : 'Ocultar senha');
}

// ============ AUTENTICAÇÃO ============
async function loadUserProfile() {
  if (!sb || !currentUser) return;

  let { data } = await sb.from('profiles').select('*').eq('id', currentUser.id).single();

  if (!data) {
    // primeiro login: cria o perfil com papel padrão 'escola'.
    // Um admin deve ajustar o papel correto depois (veja sb/schema.sql, seção "PRIMEIRO ACESSO").
    const { data: created } = await sb
      .from('profiles')
      .insert([{ id: currentUser.id, email: currentUser.email, role: 'escola', full_name: currentUser.email.split('@')[0] }])
      .select()
      .single();
    data = created;
  }

  if (data) {
    currentUser.role = data.role || 'escola';
    currentUser.schoolId = data.school_id || null;
    currentUser.driverId = data.driver_id || null;
    currentUser.user_metadata = { full_name: data.full_name };
  } else {
    currentUser.role = 'escola';
  }
}

// ============ LOGIN ============
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  const btn = document.getElementById('loginSubmitBtn');
  const btnTextoOriginal = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = 'Entrando...'; }

  try {
    if (sb) {
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) {
        toast('❌ ' + error.message, true);
        return;
      }
      currentUser = data.user;
      if (btn) btn.textContent = 'Carregando perfil...';
      await loadUserProfile();
    } else {
      // Modo demo
      const role = detectRole(email);
      currentUser = {
        id: 'demo-' + Date.now(),
        email: email,
        role: role,
        schoolId: role === 'escola' ? DEMO_SCHOOLS[0].id : null,
        driverId: role === 'motorista' ? DEMO_DRIVERS[0].id : null,
        user_metadata: { full_name: email.split('@')[0] },
      };
      // Como o modo demo não usa sessão real do Supabase, guardamos o usuário aqui
      // pra sobreviver à troca de página (login.html -> app.html).
      sessionStorage.setItem('demoUser', JSON.stringify(currentUser));
    }

    // Login e carregamento do perfil confirmados: agora sim navega pra página
    // separada do sistema. É uma troca de página de verdade (nova URL), não
    // só uma div escondida/mostrada.
    window.location.href = 'app.html';
  } catch (err) {
    console.error('Erro no login:', err);
    toast('❌ Não foi possível entrar: ' + (err && err.message ? err.message : err), true);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = btnTextoOriginal || 'Entrar no Sistema'; }
  }
}

function detectRole(email) {
  const lower = email.toLowerCase();
  if (lower.includes('admin')) return 'admin';
  if (lower.includes('pedagogia')) return 'pedagogia';
  if (lower.includes('motorista')) return 'motorista';
  if (lower.includes('escola')) return 'escola';
  return 'admin';
}

async function enterApp() {
  document.getElementById('userRole').textContent = ROLE_LABELS[currentUser.role] || currentUser.role;
  document.getElementById('userInfo').textContent = currentUser.email;

  applyRoleUI(currentUser.role);

  await Promise.all([loadSchools(), loadVehicles(), loadDrivers(), loadProfiles(), loadCooperativas(), loadAppSettings()]);
  await loadAgenda();

  showScreen(ROLE_DEFAULT_SCREEN[currentUser.role] || 'dashboard');
}

function applyRoleUI(role) {
  document.querySelectorAll('.sidebar-link').forEach((a) => {
    const roles = (a.dataset.roles || '').split(',');
    a.hidden = !roles.includes(role);
  });
  document.getElementById('navAgendaLabel').textContent = role === 'motorista' ? 'Minhas Viagens' : 'Agenda';
}

async function logout() {
  try {
    if (sb) await sb.auth.signOut();
  } catch (err) {
    console.warn('Erro ao encerrar sessão no Supabase (seguindo com o logout local):', err);
  }
  currentUser = null;
  sessionStorage.removeItem('demoUser');
  // Volta pra página de login separada (URL diferente, não é só trocar de div).
  window.location.href = 'index.html';
}

// ============ VISIBILIDADE POR PERFIL (espelha as políticas RLS) ============
function getVisibleAgenda() {
  if (!currentUser) return [];
  if (currentUser.role === 'admin' || currentUser.role === 'pedagogia') return agenda;
  if (currentUser.role === 'escola') return agenda.filter((a) => a.school_id === currentUser.schoolId);
  if (currentUser.role === 'motorista') return agenda.filter((a) => (a.driver_ids || []).includes(currentUser.driverId));
  return [];
}

// ============ PERFIS (pra mostrar "validador (primeiro nome)" etc.) ============
async function loadProfiles() {
  if (sb) {
    const { data } = await sb.from('profiles').select('id, full_name, email');
    profilesById = {};
    (data || []).forEach((p) => { profilesById[p.id] = p; });
  } else if (currentUser) {
    // Modo demo não tem outros perfis "reais" pra consultar - registra pelo menos
    // o usuário atual, então se ele mesmo validar algo o nome aparece certinho.
    profilesById[currentUser.id] = { id: currentUser.id, full_name: currentUser.user_metadata?.full_name, email: currentUser.email };
  }
}

function firstNameOf(text) {
  if (!text) return '';
  return text.trim().split(' ')[0];
}

function validatorFirstName(id) {
  if (!id) return '—';
  const p = profilesById[id];
  if (!p) return '—';
  return firstNameOf(p.full_name || p.email) || '—';
}

// ============ NAVEGAÇÃO ============
function showScreen(name, el) {
  if (currentUser && !(SCREEN_ROLES[name] || []).includes(currentUser.role)) {
    name = ROLE_DEFAULT_SCREEN[currentUser.role] || 'dashboard';
  }

  document.querySelectorAll('[id^="screen-"]').forEach((sec) => {
    sec.classList.add('hidden-screen');
    sec.classList.remove('active-screen');
  });
  const target = document.getElementById('screen-' + name);
  if (target) {
    target.classList.remove('hidden-screen');
    target.classList.add('active-screen');
  }

  document.querySelectorAll('.sidebar-link').forEach((l) => l.classList.remove('active'));
  const link = el || document.querySelector('.sidebar-link[data-screen="' + name + '"]');
  if (link) link.classList.add('active');

  const isMotoristaAgenda = name === 'agenda' && currentUser && currentUser.role === 'motorista';
  const titles = {
    dashboard: ['Dashboard', 'Visão geral do sistema'],
    agenda: isMotoristaAgenda
      ? ['Minhas Viagens', 'Viagens atribuídas a você']
      : ['Agenda Mestra', 'Todas as viagens ordenadas por data/hora'],
    solicitacao: ['Nova Solicitação', 'Wizard de cadastro de excursão'],
    unidades: ['Unidades', 'Escolas e entidades cadastradas'],
    veiculos: ['Veículos', 'Frota disponível'],
    motoristas: ['Motoristas', 'Cadastro de motoristas e cooperativas'],
    cooperativas: ['Cooperativas', 'E-mail de cada cooperativa e assinatura do setor'],
    relatorios: ['Relatórios', 'Geração de PDFs e documentos'],
  };
  document.getElementById('pageTitle').textContent = titles[name]?.[0] || '';
  document.getElementById('pageSubtitle').textContent = titles[name]?.[1] || '';

  if (name === 'dashboard') renderDashboard();
  if (name === 'agenda') renderAgenda();
  if (name === 'solicitacao') openSolicitacaoScreen();
  if (name === 'unidades') renderUnidades();
  if (name === 'veiculos') renderVeiculos();
  if (name === 'motoristas') renderMotoristas();
  if (name === 'cooperativas') { renderCooperativas(); fillSettingsForm(); }
  if (name === 'relatorios') populateRelatorioFilters();
}

// ============ CARGA DE DADOS ============
async function loadSchools() {
  if (sb) {
    const { data } = await sb.from('schools').select('*').order('name');
    schools = data || [];
  }
}

async function loadVehicles() {
  if (sb) {
    const { data } = await sb.from('vehicles').select('*').order('plate');
    vehicles = data || [];
  }
}

async function loadDrivers() {
  if (sb) {
    const { data } = await sb.from('drivers').select('*').order('name');
    drivers = data || [];
  }
}

async function loadCooperativas() {
  if (sb) {
    const { data } = await sb.from('cooperativas').select('*').order('name');
    cooperativas = data || [];
  }
}

async function loadAppSettings() {
  if (sb) {
    const { data } = await sb.from('app_settings').select('*');
    const map = {};
    (data || []).forEach((r) => { map[r.key] = r.value; });
    appSettings = { remetente_nome: map.remetente_nome || '', remetente_email: map.remetente_email || '' };
  }
}

async function loadAgenda() {
  if (sb) {
    const { data } = await sb.from('excursions').select('*').order('trip_date', { ascending: true });
    agenda = data || [];
    await loadExcursionDriversInto(agenda);
  }
}

// Junta a tabela excursion_drivers (motorista(s) de cada viagem) dentro do array de
// viagens, como agenda[i].driver_ids = ['uuid-motorista-1', 'uuid-motorista-2', ...].
async function loadExcursionDriversInto(list) {
  if (!sb || list.length === 0) return;
  const { data } = await sb.from('excursion_drivers').select('excursion_id, driver_id');
  const map = {};
  (data || []).forEach((row) => {
    (map[row.excursion_id] = map[row.excursion_id] || []).push(row.driver_id);
  });
  list.forEach((a) => { a.driver_ids = map[a.id] || []; });
}

function schoolName(id) { return schools.find((s) => s.id === id)?.name || '—'; }
function schoolAddress(id) { return schools.find((s) => s.id === id)?.address || null; }
function vehiclePlate(id) { return vehicles.find((v) => v.id === id)?.plate || null; }
function driverName(id) { return drivers.find((d) => d.id === id)?.name || null; }

// Cada motorista dirige sempre o próprio veículo (vehicle_id) - a capacidade exibida
// numa viagem vem sempre do veículo do motorista atribuído, nunca de uma escolha solta.
function driverVehicle(driverId) {
  const d = drivers.find((x) => x.id === driverId);
  if (!d || !d.vehicle_id) return null;
  return vehicles.find((v) => v.id === d.vehicle_id) || null;
}

function cooperativaById(id) {
  return id ? (cooperativas.find((c) => c.id === id) || null) : null;
}
// Nome da cooperativa de um motorista - usa o vínculo novo (cooperativa_id) e cai pro
// texto livre antigo (m.cooperative) se o motorista ainda não tiver sido religado.
function cooperativaName(m) {
  const c = cooperativaById(m.cooperativa_id);
  return (c && c.name) || m.cooperative || '-';
}
// Preenche um <select> com as cooperativas cadastradas, marcando a opção selecionada.
function populateCooperativaSelect(selectId, selectedId) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML = '<option value="">— nenhuma —</option>'
    + cooperativas.map((c) => `<option value="${c.id}" ${selectedId === c.id ? 'selected' : ''}>${c.name}${c.email ? '' : ' (sem e-mail)'}</option>`).join('');
}

function driverLabel(driverId) {
  const d = drivers.find((x) => x.id === driverId);
  if (!d) return '—';
  const v = driverVehicle(driverId);
  return d.name + (v ? ` - ${v.capacity}` : '');
}

function driversLabelHtml(ids) {
  if (!ids || ids.length === 0) return '<span class="text-slate-400">—</span>';
  return ids.map((id) => `<div>${driverLabel(id)}</div>`).join('');
}

function totalCapacity(ids) {
  return (ids || []).reduce((sum, id) => { const v = driverVehicle(id); return sum + (v ? v.capacity : 0); }, 0);
}

// ============ DASHBOARD ============
let chartMesInstance = null;
let chartUnidadeInstance = null;

function monthKey(dateStr) { return (dateStr || '').slice(0, 7); }
function monthLabel(key) {
  const [y, m] = key.split('-');
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${meses[parseInt(m, 10) - 1] || m}/${(y || '').slice(2)}`;
}

function populateDashUnidadeFilter() {
  const sel = document.getElementById('dashFiltroUnidade');
  if (!sel) return;
  const atual = sel.value;
  sel.innerHTML = '<option value="">Todas</option>' + schools.map((s) => `<option value="${s.id}">${s.name}</option>`).join('');
  sel.value = atual;
}

function renderDashboardCharts(visible) {
  if (!window.Chart) return; // biblioteca de gráficos não carregou (ex: sem internet) - segue sem quebrar o resto do dashboard
  const mesEl = document.getElementById('dashFiltroMes');
  const unidadeEl = document.getElementById('dashFiltroUnidade');
  const mesFiltro = mesEl ? mesEl.value : '';
  const unidadeFiltro = unidadeEl ? unidadeEl.value : '';

  const dados = visible.filter((a) => {
    if (mesFiltro && monthKey(a.trip_date) !== mesFiltro) return false;
    if (unidadeFiltro && a.school_id !== unidadeFiltro) return false;
    return true;
  });

  const porMes = {};
  dados.forEach((a) => { const k = monthKey(a.trip_date); porMes[k] = (porMes[k] || 0) + 1; });
  const mesesOrdenados = Object.keys(porMes).sort();

  const porUnidade = {};
  dados.forEach((a) => { const nome = schoolName(a.school_id) !== '—' ? schoolName(a.school_id) : (a.requester_name || 'Outra'); porUnidade[nome] = (porUnidade[nome] || 0) + 1; });
  const unidadesOrdenadas = Object.entries(porUnidade).sort((a, b) => b[1] - a[1]).slice(0, 10);

  const ctx1 = document.getElementById('chartPorMes');
  if (ctx1) {
    if (chartMesInstance) chartMesInstance.destroy();
    chartMesInstance = new Chart(ctx1, {
      type: 'bar',
      data: { labels: mesesOrdenados.map(monthLabel), datasets: [{ label: 'Viagens', data: mesesOrdenados.map((k) => porMes[k]), backgroundColor: '#059669' }] },
      options: { responsive: true, plugins: { legend: { display: false }, title: { display: true, text: 'Viagens por mês' } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } },
    });
  }
  const ctx2 = document.getElementById('chartPorUnidade');
  if (ctx2) {
    if (chartUnidadeInstance) chartUnidadeInstance.destroy();
    chartUnidadeInstance = new Chart(ctx2, {
      type: 'bar',
      data: { labels: unidadesOrdenadas.map((e) => e[0]), datasets: [{ label: 'Viagens', data: unidadesOrdenadas.map((e) => e[1]), backgroundColor: '#0ea5e9' }] },
      options: { indexAxis: 'y', responsive: true, plugins: { legend: { display: false }, title: { display: true, text: 'Viagens por unidade solicitante' } }, scales: { x: { beginAtZero: true, ticks: { precision: 0 } } } },
    });
  }
}

function renderDashboard() {
  const visible = getVisibleAgenda();
  const hoje = fmtDate(new Date());
  const viagensHoje = visible.filter((a) => a.trip_date === hoje).length;
  const pendentes = visible.filter((a) => a.situacao === 'sem_validacao').length;
  const aprovadas = visible.filter((a) => a.situacao === 'aprovada' || a.situacao === 'confirmada').length;
  const alunos = visible.reduce((s, a) => s + (a.students_count || 0), 0);
  const canceladas = visible.filter((a) => a.situacao === 'cancelada').length;
  const desaprovadas = visible.filter((a) => a.situacao === 'reprovada');

  document.getElementById('statHoje').textContent = viagensHoje;
  document.getElementById('statPendentes').textContent = pendentes;
  document.getElementById('statAprovadas').textContent = aprovadas;
  document.getElementById('statAlunos').textContent = alunos;
  document.getElementById('statCanceladas').textContent = canceladas;
  document.getElementById('statDesaprovadas').textContent = desaprovadas.length;

  const porMotivo = {};
  desaprovadas.forEach((a) => { const m = a.rejection_reason || 'Sem motivo'; porMotivo[m] = (porMotivo[m] || 0) + 1; });
  const motivosEl = document.getElementById('statDesaprovadasMotivos');
  if (motivosEl) {
    motivosEl.innerHTML = Object.entries(porMotivo).sort((a, b) => b[1] - a[1]).map(([m, n]) => `<div>${n}x ${m}</div>`).join('');
  }

  populateDashUnidadeFilter();
  renderDashboardCharts(visible);

  const proximas = visible
    .filter((a) => a.trip_date >= hoje && a.situacao !== 'reprovada' && a.situacao !== 'cancelada')
    .sort((a, b) => (a.trip_date + a.departure_time).localeCompare(b.trip_date + b.departure_time))
    .slice(0, 5);

  const container = document.getElementById('proximasViagens');
  if (proximas.length === 0) {
    container.innerHTML = '<p class="text-sm text-slate-500 text-center py-8">Nenhuma viagem agendada</p>';
    return;
  }

  container.innerHTML = proximas.map((a) => `
    <div class="flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:bg-slate-50">
      <div class="flex items-center gap-3">
        <div class="w-12 h-12 rounded-lg bg-emerald-100 flex flex-col items-center justify-center shrink-0">
          <span class="text-xs text-emerald-700 font-semibold">${new Date(a.trip_date + 'T00:00').toLocaleDateString('pt-BR', { month: 'short' })}</span>
          <span class="text-lg font-bold text-emerald-800">${new Date(a.trip_date + 'T00:00').getDate()}</span>
        </div>
        <div>
          <div class="font-medium text-slate-800">${a.destination}</div>
          <div class="text-xs text-slate-500">${schoolName(a.school_id)} • ${a.departure_time} • ${a.students_count} passageiros</div>
        </div>
      </div>
      <span style="${SITUACAO_COLORS[a.situacao] || ''}" class="px-2 py-1 rounded text-xs font-medium">${SITUACAO_LABELS[a.situacao] || a.situacao}</span>
    </div>
  `).join('');
}

function statusLabel(s) {
  return { pending: 'Pendente', pedagogy_approved: 'Aprov. Pedagogia', approved: 'Aprovada', in_transit: 'Em trânsito', transit: 'Em trânsito', rejected: 'Recusada', completed: 'Concluída' }[s] || s;
}

// ============ AGENDA ============
function filterAgenda() {
  const data = document.getElementById('filtroData').value;
  const periodo = document.getElementById('filtroPeriodo').value; // 'dia' | 'semana' | 'mes'
  const situacao = document.getElementById('filtroSituacao').value;

  return getVisibleAgenda().filter((a) => {
    if (situacao && a.situacao !== situacao) return false;

    if (periodo === 'semana' || periodo === 'mes') {
      const ref = data ? new Date(data + 'T00:00') : new Date();
      const t = new Date(a.trip_date + 'T00:00');
      if (periodo === 'semana') {
        const start = new Date(ref); start.setDate(ref.getDate() - ref.getDay());
        const end = new Date(start); end.setDate(start.getDate() + 6);
        if (t < start || t > end) return false;
      } else {
        if (t.getFullYear() !== ref.getFullYear() || t.getMonth() !== ref.getMonth()) return false;
      }
    } else if (data && a.trip_date !== data) {
      return false;
    }
    return true;
  });
}

function filtrarAgenda() { renderAgenda(); }

function renderAgenda() {
  const filtered = filterAgenda();
  const tbody = document.getElementById('agendaTable');

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="14" class="text-center py-8 text-slate-500 text-sm">Nenhuma viagem encontrada</td></tr>';
    return;
  }

  const role = currentUser.role;
  const podeEditarSituacao = role === 'admin' || role === 'pedagogia';
  const podeEditarOperacional = role === 'admin';

  tbody.innerHTML = filtered
    .sort((a, b) => (a.trip_date + a.departure_time).localeCompare(b.trip_date + b.departure_time))
    .map((a) => {
      const turnoLabel = TURNO_LABELS[a.turno || turnoFromHora(a.departure_time)] || '-';
      const podeCancelar = a.situacao !== 'cancelada' && a.situacao !== 'reprovada' && a.status !== 'completed'
        && (role === 'admin' || (role === 'escola' && a.school_id === currentUser.schoolId));

      let acoes = '<span class="text-slate-300 text-xs">—</span>';
      if (a.status === 'pending' && (role === 'pedagogia' || role === 'admin')) {
        acoes = `
          <button onclick="pedagogyApprove('${a.id}')" class="text-emerald-600 hover:text-emerald-800 text-xs font-medium mr-3">Aprovar (Pedagogia)</button>
          <button onclick="openRejectModal('${a.id}')" class="text-red-600 hover:text-red-800 text-xs font-medium">Recusar</button>`;
      } else if (a.status === 'pedagogy_approved' && role === 'admin') {
        acoes = `<button onclick="openAssignModal('${a.id}')" class="text-emerald-600 hover:text-emerald-800 text-xs font-medium">Aprovar e atribuir motorista(s)</button>`;
      } else if (a.status === 'approved' && (role === 'admin' || (role === 'motorista' && (a.driver_ids || []).includes(currentUser.driverId)))) {
        acoes = `<button onclick="startTransit('${a.id}')" class="text-blue-600 hover:text-blue-800 text-xs font-medium">Iniciar viagem</button>`;
        if (role === 'admin') acoes += ` <button onclick="openAssignModal('${a.id}')" class="text-slate-500 hover:text-slate-700 text-xs font-medium ml-2">Editar motorista(s)</button>`;
      } else if (a.status === 'in_transit' && (role === 'admin' || (role === 'motorista' && (a.driver_ids || []).includes(currentUser.driverId)))) {
        acoes = `<button onclick="completeTrip('${a.id}')" class="text-slate-700 hover:text-slate-900 text-xs font-medium">Concluir viagem</button>`;
      } else if (a.status === 'rejected' && a.rejection_reason) {
        acoes = `<span class="text-xs text-red-500" title="${a.rejection_reason}">Motivo ⓘ</span>`;
      } else if (a.situacao === 'cancelada' && a.cancel_reason) {
        acoes = `<span class="text-xs text-orange-500" title="${a.cancel_reason}">Cancelada ⓘ</span>`;
      }
      if (podeCancelar) {
        const cancelBtn = `<button onclick="openCancelModal('${a.id}')" class="text-orange-600 hover:text-orange-800 text-xs font-medium ml-2">Cancelar</button>`;
        acoes = acoes.includes('text-slate-300') ? cancelBtn : acoes + cancelBtn;
      }

      const podeVerListagem = role === 'admin' || (role === 'escola' && a.school_id === currentUser.schoolId);
      const precisaCooperativa = (a.atf_status && a.atf_status !== 'nao_precisa') || (a.pca_count || 0) > 0;
      if (podeVerListagem) {
        const listaBtn = `<button onclick="openPassengerModal('${a.id}')" class="text-slate-500 hover:text-slate-700 text-xs font-medium ml-2" title="Listagem de passageiros (nome + CI/CNH/CPF)">📋 Lista</button>`;
        acoes = acoes.includes('text-slate-300') ? listaBtn : acoes + listaBtn;
      }
      if (role === 'admin' && precisaCooperativa) {
        const coopBtn = a.envio_coop_data
          ? `<button onclick="openCooperativaEmailModal('${a.id}')" class="text-blue-600 hover:text-blue-800 text-xs font-medium ml-2" title="Enviado em ${new Date(a.envio_coop_data + 'T00:00').toLocaleDateString('pt-BR')} - clique para reenviar">✉️ Reenviar</button>`
          : `<button onclick="openCooperativaEmailModal('${a.id}')" class="text-blue-600 hover:text-blue-800 text-xs font-medium ml-2">✉️ Cooperativa</button>`;
        acoes = acoes.includes('text-slate-300') ? coopBtn : acoes + coopBtn;
      }

      const situacaoCell = podeEditarSituacao
        ? `<select onchange="updateSituacao('${a.id}', this.value)" style="${SITUACAO_COLORS[a.situacao] || ''}" class="px-2 py-1 rounded text-xs font-medium border-0">
            ${Object.entries(SITUACAO_LABELS).map(([v, l]) => `<option value="${v}" ${a.situacao === v ? 'selected' : ''}>${l}</option>`).join('')}
          </select>`
        : `<span style="${SITUACAO_COLORS[a.situacao] || ''}" class="px-2 py-1 rounded text-xs font-medium">${SITUACAO_LABELS[a.situacao] || a.situacao}</span>`;

      const atfCell = podeEditarOperacional
        ? `<select onchange="updateAtf('${a.id}', this.value)" style="${ATF_COLORS[a.atf_status] || ''}" class="px-2 py-1 rounded text-xs font-medium border-0">
            ${Object.entries(ATF_LABELS).map(([v, l]) => `<option value="${v}" ${a.atf_status === v ? 'selected' : ''}>${l}</option>`).join('')}
          </select>`
        : `<span style="${ATF_COLORS[a.atf_status] || ''}" class="px-2 py-1 rounded text-xs font-medium">${ATF_LABELS[a.atf_status] || a.atf_status}</span>`;

      const listaEscolaCell = podeEditarOperacional
        ? `<input type="checkbox" ${a.lista_escola ? 'checked' : ''} onchange="updateExcursionField('${a.id}', 'lista_escola', this.checked)" />`
        : (a.lista_escola ? '✅' : '—');

      const envioCoopCell = podeEditarOperacional
        ? `<input type="date" value="${a.envio_coop_data || ''}" onchange="updateExcursionField('${a.id}', 'envio_coop_data', this.value || null)" class="px-1 py-0.5 border rounded text-xs w-32" />`
        : (a.envio_coop_data ? new Date(a.envio_coop_data + 'T00:00').toLocaleDateString('pt-BR') : '—');

      const totalPax = (a.students_count || 0) + (a.companions_count || 0) + (a.pca_count || 0) + (a.apoio_count || 0);

      return `
    <tr class="hover:bg-slate-50">
      <td class="px-4 py-3 text-sm">
        <div class="font-medium">${new Date(a.trip_date + 'T00:00').toLocaleDateString('pt-BR')}</div>
        <div class="text-xs text-slate-500">${turnoLabel}</div>
      </td>
      <td class="px-4 py-3 text-sm">${a.departure_time || '-'}</td>
      <td class="px-4 py-3 text-sm">${a.return_time || '-'}</td>
      <td class="px-4 py-3 text-sm">
        <div>${schoolName(a.school_id)}</div>
        <div class="text-xs text-slate-500">${schoolAddress(a.school_id) || '-'}</div>
      </td>
      <td class="px-4 py-3 text-sm">
        <div>${a.destination}</div>
        <div class="text-xs text-slate-500">${a.destination_address || a.city || '-'}</div>
      </td>
      <td class="px-4 py-3 text-sm">
        <div class="font-medium">${totalPax} total</div>
        <div class="text-xs text-slate-500">${a.students_count || 0} alunos + ${a.companions_count || 0} acomp.${a.pca_count ? ` + ${a.pca_count} PCD + ${a.apoio_count || 0} apoio(s)` : ''}</div>
      </td>
      <td class="px-4 py-3 text-xs text-slate-500">
        <div>${a.created_at ? new Date(a.created_at).toLocaleDateString('pt-BR') : '-'}</div>
        <div>${a.requester_name || '-'}</div>
      </td>
      <td class="px-4 py-3 text-xs text-slate-500">
        <div>${a.pedagogy_approved_at ? new Date(a.pedagogy_approved_at).toLocaleDateString('pt-BR') : '-'}</div>
        <div>${validatorFirstName(a.pedagogy_approved_by)}</div>
      </td>
      <td class="px-4 py-3 text-sm text-center">${listaEscolaCell}</td>
      <td class="px-4 py-3 text-sm">${envioCoopCell}</td>
      <td class="px-4 py-3">${atfCell}</td>
      <td class="px-4 py-3">${situacaoCell}</td>
      <td class="px-4 py-3 text-xs">${driversLabelHtml(a.driver_ids)}</td>
      <td class="px-4 py-3 whitespace-nowrap">${acoes}</td>
    </tr>`;
    }).join('');
}

async function updateSituacao(id, value) {
  const ok = await updateExcursion(id, { situacao: value });
  if (ok) { await loadAgenda(); renderAgenda(); renderDashboard(); }
}

async function updateAtf(id, value) {
  const ok = await updateExcursion(id, { atf_status: value });
  if (ok) { await loadAgenda(); renderAgenda(); }
}

async function updateExcursionField(id, field, value) {
  const ok = await updateExcursion(id, { [field]: value });
  if (ok) { await loadAgenda(); renderAgenda(); }
}

async function updateExcursion(id, patch) {
  if (sb) {
    const { error } = await sb.from('excursions').update(patch).eq('id', id);
    if (error) { toast('❌ Erro ao atualizar: ' + error.message, true); return false; }
  } else {
    const v = agenda.find((a) => a.id === id);
    if (v) { Object.assign(v, patch); saveDemoData(); }
  }
  return true;
}

// Quando a viagem faz parte de uma série recorrente (recurrence_group_id), aprovar
// a primeira ocorrência aprova a série inteira. Recusar/cancelar fica sempre por linha.
async function updateExcursionCascade(id, patch) {
  const trip = agenda.find((a) => a.id === id);
  const groupId = trip && trip.recurrence_group_id;
  if (!groupId) return updateExcursion(id, patch);

  if (sb) {
    const { error } = await sb.from('excursions').update(patch).eq('recurrence_group_id', groupId);
    if (error) { toast('❌ Erro ao atualizar: ' + error.message, true); return false; }
  } else {
    agenda.filter((a) => a.recurrence_group_id === groupId).forEach((a) => Object.assign(a, patch));
    saveDemoData();
  }
  return true;
}

async function pedagogyApprove(id) {
  const trip = agenda.find((a) => a.id === id);
  const precisaAtf = trip && trip.city && !trip.city.toLowerCase().includes('nova lima');
  const ok = await updateExcursionCascade(id, {
    status: 'pedagogy_approved',
    pedagogy_approved_by: currentUser.id,
    pedagogy_approved_at: new Date().toISOString(),
    situacao: precisaAtf ? 'aguarda_atf' : 'aprovada',
    atf_status: precisaAtf ? 'nao_emitida' : 'nao_precisa',
  });
  if (!ok) return;
  await loadAgenda(); renderAgenda(); renderDashboard();
  toast(trip && trip.recurrence_group_id
    ? '✅ Viagem aprovada pela pedagogia - toda a série recorrente foi validada junto!'
    : '✅ Viagem aprovada pela pedagogia! Aguardando aprovação final do admin.');
}

const REJECT_REASONS = ['Falta de dados', 'Fora do calendário letivo', 'Falta de veículo/motorista disponível', 'Documentação pendente', 'Outro'];
const CANCEL_REASONS = ['Não haverá mais a viagem', 'Mudança de data', 'Outro'];

function onMotivoSelectChange(selectId, outroId) {
  document.getElementById(outroId).classList.toggle('hidden', document.getElementById(selectId).value !== 'Outro');
}

function openRejectModal(id) {
  rejectTargetId = id;
  document.getElementById('rejectMotivoSelect').value = REJECT_REASONS[0];
  document.getElementById('rejectMotivoOutro').value = '';
  document.getElementById('rejectMotivoOutro').classList.add('hidden');
  document.getElementById('rejectModal').classList.remove('hidden');
}
function closeRejectModal() { document.getElementById('rejectModal').classList.add('hidden'); rejectTargetId = null; }
async function confirmReject() {
  const escolhido = document.getElementById('rejectMotivoSelect').value;
  const motivo = escolhido === 'Outro' ? (document.getElementById('rejectMotivoOutro').value.trim() || 'Outro') : escolhido;
  const ok = await updateExcursion(rejectTargetId, { status: 'rejected', rejection_reason: motivo, situacao: 'reprovada' });
  if (ok) { await loadAgenda(); renderAgenda(); renderDashboard(); toast('🚫 Solicitação recusada.'); }
  closeRejectModal();
}

function openCancelModal(id) {
  cancelTargetId = id;
  document.getElementById('cancelMotivoSelect').value = CANCEL_REASONS[0];
  document.getElementById('cancelMotivoOutro').value = '';
  document.getElementById('cancelMotivoOutro').classList.add('hidden');
  document.getElementById('cancelModal').classList.remove('hidden');
}
function closeCancelModal() { document.getElementById('cancelModal').classList.add('hidden'); cancelTargetId = null; }
async function confirmCancel() {
  const escolhido = document.getElementById('cancelMotivoSelect').value;
  const motivo = escolhido === 'Outro' ? (document.getElementById('cancelMotivoOutro').value.trim() || 'Outro') : escolhido;
  const ok = await updateExcursion(cancelTargetId, {
    situacao: 'cancelada', cancel_reason: motivo, cancelled_by: currentUser.id, cancelled_at: new Date().toISOString(),
  });
  if (ok) { await loadAgenda(); renderAgenda(); renderDashboard(); toast('🚫 Viagem cancelada.'); }
  closeCancelModal();
}

// ============ LISTAGEM DE PASSAGEIROS (nome + CI/CNH/CPF, pra ATF) ============
async function openPassengerModal(id) {
  passengerModalExcursionId = id;
  const trip = agenda.find((a) => a.id === id);
  if (sb) {
    const { data } = await sb.from('excursion_passengers').select('*').eq('excursion_id', id).order('created_at');
    passengerRows = (data || []).map((p) => ({ nome: p.nome, documento: p.documento || '' }));
  } else {
    passengerRows = ((trip && trip.passengers) || []).map((p) => ({ ...p }));
  }
  if (passengerRows.length === 0) passengerRows.push({ nome: '', documento: '' });
  renderPassengerRows();
  document.getElementById('passengerModal').classList.remove('hidden');
}
function closePassengerModal() { document.getElementById('passengerModal').classList.add('hidden'); passengerModalExcursionId = null; }
function renderPassengerRows() {
  document.getElementById('passengerRows').innerHTML = passengerRows.map((p, i) => `
    <div class="flex gap-2 items-center">
      <span class="text-xs text-slate-400 w-5 text-right">${i + 1}.</span>
      <input type="text" value="${p.nome}" placeholder="Nome do passageiro" oninput="updatePassengerField(${i}, 'nome', this.value)" class="flex-1 px-2 py-1.5 border rounded text-sm" />
      <input type="text" value="${p.documento}" placeholder="CI/CNH/CPF" oninput="updatePassengerField(${i}, 'documento', this.value)" class="w-36 px-2 py-1.5 border rounded text-sm" />
      <button onclick="removePassengerRow(${i})" class="text-slate-400 hover:text-red-600 text-sm px-1">✕</button>
    </div>`).join('');
}
function addPassengerRow() { passengerRows.push({ nome: '', documento: '' }); renderPassengerRows(); }
function removePassengerRow(i) { passengerRows.splice(i, 1); renderPassengerRows(); }
function updatePassengerField(i, field, value) { if (passengerRows[i]) passengerRows[i][field] = value; }
async function confirmSavePassengers() {
  const rows = passengerRows.filter((p) => p.nome && p.nome.trim());
  const id = passengerModalExcursionId;
  if (sb) {
    const { error: delErr } = await sb.from('excursion_passengers').delete().eq('excursion_id', id);
    if (delErr) { toast('❌ Erro ao salvar listagem: ' + delErr.message, true); return; }
    if (rows.length) {
      const { error: insErr } = await sb.from('excursion_passengers')
        .insert(rows.map((p) => ({ excursion_id: id, nome: p.nome.trim(), documento: (p.documento || '').trim() || null })));
      if (insErr) { toast('❌ Erro ao salvar listagem: ' + insErr.message, true); return; }
    }
  } else {
    const trip = agenda.find((a) => a.id === id);
    if (trip) { trip.passengers = rows.map((p) => ({ nome: p.nome.trim(), documento: (p.documento || '').trim() })); saveDemoData(); }
  }
  closePassengerModal();
  toast('✅ Listagem de passageiros salva!');
}
async function getExcursionPassengers(id) {
  if (sb) {
    const { data } = await sb.from('excursion_passengers').select('*').eq('excursion_id', id).order('created_at');
    return (data || []).map((p) => ({ nome: p.nome, documento: p.documento || '' }));
  }
  const trip = agenda.find((a) => a.id === id);
  return ((trip && trip.passengers) || []).map((p) => ({ ...p }));
}
// No modo Supabase de verdade os alunos PCD não vêm junto do select de excursions
// (ficam na tabela à parte excursion_pcd_students) - busca sob demanda, só quando
// precisa montar o e-mail (no modo demo já vem junto em trip.pcd_students).
async function getExcursionPcdStudents(id) {
  if (sb) {
    const { data } = await sb.from('excursion_pcd_students').select('*').eq('excursion_id', id).order('created_at');
    return (data || []).map((p) => ({ nome_aluno: p.nome_aluno, cadeirante: !!p.cadeirante, nome_apoio: p.nome_apoio || '' }));
  }
  const trip = agenda.find((a) => a.id === id);
  return ((trip && trip.pcd_students) || []).map((p) => ({ ...p }));
}

// ============ ENVIAR PARA A COOPERATIVA (ATF ou transporte PCD) ============
// Não geramos a ATF - quem emite é a cooperativa. Aqui só preparamos um e-mail com os
// dados da viagem + a listagem, prontinho pra abrir no e-mail de quem estiver logado
// (imita exatamente o que já é feito manualmente hoje pelo setor de excursão).
async function openCooperativaEmailModal(id) {
  emailTargetId = id;
  const trip = agenda.find((a) => a.id === id);
  if (!trip) return;

  const driverIds = trip.driver_ids || [];
  const primeiroMotorista = driverIds.length ? drivers.find((d) => d.id === driverIds[0]) : null;
  const defaultCoopId = (primeiroMotorista && primeiroMotorista.cooperativa_id) || '';

  populateCooperativaSelect('emailCooperativaId', defaultCoopId);

  const isPcd = (trip.pca_count || 0) > 0;
  const passengers = await getExcursionPassengers(id);
  const pcdStudents = isPcd ? await getExcursionPcdStudents(id) : [];
  const driverNames = driverIds.map((did) => (drivers.find((d) => d.id === did) || {}).name).filter(Boolean);

  document.getElementById('emailAssunto').value = buildCooperativaEmailSubject(trip, isPcd);
  document.getElementById('emailCorpo').value = isPcd
    ? buildPcdEmailBody(trip, pcdStudents)
    : buildAtfEmailBody(trip, passengers, driverNames);

  onEmailCooperativaChange();
  document.getElementById('cooperativaEmailModal').classList.remove('hidden');
}
function closeCooperativaEmailModal() { document.getElementById('cooperativaEmailModal').classList.add('hidden'); emailTargetId = null; }
function onEmailCooperativaChange() {
  const coop = cooperativaById(document.getElementById('emailCooperativaId').value);
  document.getElementById('emailCooperativaAviso').classList.toggle('hidden', !coop || !!coop.email);
}

function buildCooperativaEmailSubject(trip, isPcd) {
  const dataFmt = trip.trip_date ? new Date(trip.trip_date + 'T00:00').toLocaleDateString('pt-BR') : '';
  return isPcd
    ? `Transporte PCD - ${schoolName(trip.school_id)}_${dataFmt}`
    : `Solicitação de ATF - ${trip.destination} - ${dataFmt}`;
}

// Modelo real usado pelo setor (transporte PCD/veículo adaptado - vale pra qualquer
// destino, mesmo dentro de Nova Lima, e não depende de motorista cadastrado no sistema).
function buildPcdEmailBody(trip, pcdStudents) {
  const destinoCompleto = trip.destination_address
    ? `${trip.destination}, ${trip.destination_address}${trip.city ? ', ' + trip.city : ''}`
    : `${trip.destination}${trip.city ? ', ' + trip.city : ''}`;
  const listagem = (pcdStudents && pcdStudents.length)
    ? pcdStudents.map((p) => p.nome_aluno).filter(Boolean).join('\n')
    : '(nenhum aluno cadastrado ainda - edite a solicitação antes de enviar)';
  const assinatura = appSettings.remetente_nome || (currentUser && (currentUser.user_metadata?.full_name || currentUser.email)) || '';
  return `Bom dia
Solicita-se transporte PCD, com origem na ${schoolName(trip.school_id)}
destino: ${destinoCompleto}
saída ${trip.departure_time || '-'}h - retorno ${trip.return_time || '-'}h
listagem:
${listagem}

Gentileza acusar o recebimento
${assinatura}`;
}

// Rascunho nosso (não recebemos um modelo real desse - só o de PCD) para o pedido de
// ATF de uma excursão comum pra fora de Nova Lima. Ajustável no próprio modal antes
// de enviar, ou me avise se tiver um modelo diferente pra eu adaptar.
function buildAtfEmailBody(trip, passengers, driverNames) {
  const destinoCompleto = trip.destination_address
    ? `${trip.destination}, ${trip.destination_address}${trip.city ? ', ' + trip.city : ''}`
    : `${trip.destination}${trip.city ? ', ' + trip.city : ''}`;
  const dataFmt = trip.trip_date ? new Date(trip.trip_date + 'T00:00').toLocaleDateString('pt-BR') : '-';
  const totalPax = (trip.students_count || 0) + (trip.companions_count || 0) + (trip.pca_count || 0) + (trip.apoio_count || 0);
  const listagem = passengers.length
    ? passengers.map((p, i) => `${i + 1}. ${p.nome}${p.documento ? ' - ' + p.documento : ''}`).join('\n')
    : '(listagem de passageiros ainda não cadastrada - use o botão "📋 Lista" antes de enviar)';
  const assinatura = appSettings.remetente_nome || (currentUser && (currentUser.user_metadata?.full_name || currentUser.email)) || '';
  return `Bom dia,

Solicita-se apoio para emissão de ATF para a excursão abaixo:

Unidade: ${schoolName(trip.school_id)}
Destino: ${destinoCompleto}
Data: ${dataFmt}
Saída: ${trip.departure_time || '-'} - Retorno: ${trip.return_time || '-'}
Motorista(s): ${driverNames.length ? driverNames.join(', ') : '(a definir)'}
Nº de passageiros: ${totalPax}

Listagem:
${listagem}

Gentileza acusar o recebimento.

${assinatura}`;
}

function copyEmailText() {
  const texto = document.getElementById('emailCorpo').value;
  navigator.clipboard.writeText(texto).then(
    () => toast('📋 Texto copiado! Cole no seu e-mail.'),
    () => toast('⚠️ Não foi possível copiar automaticamente - selecione e copie o texto manualmente.', true)
  );
}

async function sendCooperativaEmail() {
  const coop = cooperativaById(document.getElementById('emailCooperativaId').value);
  if (!coop) { toast('⚠️ Selecione a cooperativa.', true); return; }
  if (!coop.email) { toast('⚠️ Essa cooperativa não tem e-mail cadastrado (tela Cooperativas).', true); return; }

  const assunto = document.getElementById('emailAssunto').value;
  const corpo = document.getElementById('emailCorpo').value;
  const mailto = `mailto:${encodeURIComponent(coop.email)}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
  window.open(mailto, '_blank');

  const ok = await updateExcursion(emailTargetId, { envio_coop_data: fmtDate(new Date()), situacao: 'envio_coop' });
  if (ok) { await loadAgenda(); renderAgenda(); }
  closeCooperativaEmailModal();
  toast('✉️ E-mail preparado! Confira e clique em enviar no seu programa de e-mail.');
}

// Atribuição de motorista(s): cada motorista dirige sempre o próprio veículo, então
// não existe mais um dropdown separado de veículo - a capacidade já vem junto do nome.
function openAssignModal(id) {
  assignTargetId = id;
  const trip = agenda.find((a) => a.id === id);
  const currentIds = (trip && trip.driver_ids) || [];
  const list = document.getElementById('assignMotoristasList');
  const ativos = drivers.filter((d) => d.active !== false);
  list.innerHTML = ativos.length
    ? ativos.map((d) => {
        const v = driverVehicle(d.id);
        const capTxt = v ? `${v.capacity} lugares${v.plate ? ' • ' + v.plate : ''}` : 'sem veículo vinculado';
        return `
          <label class="flex items-center gap-2 text-sm py-1">
            <input type="checkbox" value="${d.id}" ${currentIds.includes(d.id) ? 'checked' : ''} onchange="updateAssignCapacidade()" class="assign-driver-check" />
            <span>${d.name}${d.cooperative ? ' - ' + d.cooperative : ''} <span class="text-xs text-slate-500">(${capTxt})</span></span>
          </label>`;
      }).join('')
    : '<p class="text-sm text-slate-500">Nenhum motorista ativo cadastrado.</p>';
  updateAssignCapacidade();
  document.getElementById('assignModal').classList.remove('hidden');
}

function updateAssignCapacidade() {
  const ids = Array.from(document.querySelectorAll('.assign-driver-check:checked')).map((el) => el.value);
  const el = document.getElementById('assignCapacidadeTotal');
  el.textContent = ids.length ? `Capacidade total selecionada: ${totalCapacity(ids)} lugares` : '';
}

function closeAssignModal() { document.getElementById('assignModal').classList.add('hidden'); assignTargetId = null; }

async function confirmAssign() {
  const ids = Array.from(document.querySelectorAll('.assign-driver-check:checked')).map((el) => el.value);
  if (ids.length === 0) { toast('⚠️ Selecione ao menos um motorista.', true); return; }

  if (sb) {
    const { error: delErr } = await sb.from('excursion_drivers').delete().eq('excursion_id', assignTargetId);
    if (delErr) { toast('❌ Erro ao atualizar motoristas: ' + delErr.message, true); return; }
    const { error: insErr } = await sb.from('excursion_drivers').insert(ids.map((driver_id) => ({ excursion_id: assignTargetId, driver_id })));
    if (insErr) { toast('❌ Erro ao atribuir motoristas: ' + insErr.message, true); return; }
  }

  const patch = {
    status: 'approved',
    assigned_driver_id: ids[0] || null, // mantido só por compatibilidade
    approved_by: currentUser.id,
    approved_at: new Date().toISOString(),
  };
  if (!sb) patch.driver_ids = ids;

  const ok = await updateExcursion(assignTargetId, patch);
  if (ok) { await loadAgenda(); renderAgenda(); renderDashboard(); toast('✅ Viagem aprovada e motorista(s) atribuído(s)!'); }
  closeAssignModal();
}

async function startTransit(id) {
  const ok = await updateExcursion(id, { status: 'in_transit' });
  if (ok) { await loadAgenda(); renderAgenda(); renderDashboard(); toast('🚌 Viagem iniciada!'); }
}
async function completeTrip(id) {
  const ok = await updateExcursion(id, { status: 'completed' });
  if (ok) { await loadAgenda(); renderAgenda(); renderDashboard(); toast('🏁 Viagem concluída!'); }
}

// ============ WIZARD (NOVA SOLICITAÇÃO) ============
function openSolicitacaoScreen() {
  populateEscolaSelect();
  resetWizard();
}

function populateEscolaSelect() {
  const sel = document.getElementById('wEscola');
  sel.innerHTML = schools.map((s) => `<option value="${s.id}">${s.name}</option>`).join('')
    + '<option value="__outra__">Outra (não cadastrada)</option>';
  if (currentUser.role === 'escola' && currentUser.schoolId) {
    sel.value = currentUser.schoolId;
    sel.disabled = true;
  } else {
    sel.disabled = false;
  }
  onWEscolaChange();
}

function onWEscolaChange() {
  const isOutra = document.getElementById('wEscola').value === '__outra__';
  document.getElementById('wOutraBox').classList.toggle('hidden', !isOutra);
}

function onWRecorrenciaChange() {
  const recorrencia = document.querySelector('input[name="wRecorrencia"]:checked').value;
  document.getElementById('wRecorrenciaDetalhes').classList.toggle('hidden', recorrencia === 'unico');
}

// Redesenha as linhas de "aluno PCD" conforme o número digitado em wPCA, preservando
// o que já tiver sido preenchido nas linhas existentes.
function renderPcdRows() {
  const n = parseInt(document.getElementById('wPCA').value) || 0;
  document.getElementById('wPcdBox').classList.toggle('hidden', n === 0);

  while (wizardPcdList.length < n) wizardPcdList.push({ nome_aluno: '', cadeirante: false, nome_apoio: '' });
  wizardPcdList.length = n;

  const rows = document.getElementById('wPcdRows');
  rows.innerHTML = wizardPcdList.map((p, i) => `
    <div class="grid grid-cols-3 gap-2 items-end border-b border-slate-200 pb-2">
      <div>
        <label class="block text-xs font-medium mb-1">Nome do aluno</label>
        <input type="text" value="${p.nome_aluno}" oninput="updatePcdField(${i}, 'nome_aluno', this.value)" class="w-full px-2 py-1.5 border rounded text-sm" />
      </div>
      <div>
        <label class="block text-xs font-medium mb-1">Cadeirante?</label>
        <select onchange="updatePcdField(${i}, 'cadeirante', this.value === 'sim')" class="w-full px-2 py-1.5 border rounded text-sm">
          <option value="nao" ${!p.cadeirante ? 'selected' : ''}>Não</option>
          <option value="sim" ${p.cadeirante ? 'selected' : ''}>Sim</option>
        </select>
      </div>
      <div>
        <label class="block text-xs font-medium mb-1">Nome do apoio</label>
        <input type="text" value="${p.nome_apoio}" oninput="updatePcdField(${i}, 'nome_apoio', this.value)" class="w-full px-2 py-1.5 border rounded text-sm" />
      </div>
    </div>`).join('');
}

function updatePcdField(i, field, value) {
  if (wizardPcdList[i]) wizardPcdList[i][field] = value;
}

function resetWizard() {
  wizardStep = 1;
  for (let i = 1; i <= 5; i++) {
    document.getElementById('step' + i).classList.add('hidden');
    document.getElementById('prog' + i).className = i === 1 ? 'h-1.5 flex-1 bg-emerald-500 rounded' : 'h-1.5 flex-1 bg-slate-200 rounded';
  }
  document.getElementById('step1').classList.remove('hidden');
  document.getElementById('wizardStep').textContent = 1;
  document.getElementById('btnPrev').classList.add('hidden');
  document.getElementById('btnNext').textContent = 'Próximo →';
  document.getElementById('wOutraNome').value = '';
  document.getElementById('wOutraEndereco').value = '';
  document.getElementById('wOutraContato').value = '';
  document.getElementById('wOutraBox').classList.add('hidden');
  document.getElementById('wDestino').value = '';
  document.getElementById('wDestinoEndereco').value = '';
  document.getElementById('wCidade').value = '';
  document.getElementById('wData').value = '';
  document.getElementById('wHora').value = '';
  document.getElementById('wHoraRetorno').value = '';
  document.getElementById('wAlunos').value = 0;
  document.getElementById('wAcompanhantes').value = 0;
  document.getElementById('wPCA').value = 0;
  wizardPcdList = [];
  document.getElementById('wPcdBox').classList.add('hidden');
  document.getElementById('wPcdRows').innerHTML = '';
  document.getElementById('wObservacoes').value = '';
  const unico = document.querySelector('input[name="wRecorrencia"][value="unico"]');
  if (unico) unico.checked = true;
  document.getElementById('wRecorrenciaDetalhes').classList.add('hidden');
  document.querySelectorAll('input[name="wDiaSemana"]').forEach((el) => { el.checked = false; });
  document.getElementById('wRecorrenciaFim').value = '';
}

function validateWizardStep(step) {
  if (step === 1) {
    if (document.getElementById('wEscola').value === '__outra__' && !document.getElementById('wOutraNome').value.trim()) {
      toast('⚠️ Informe o nome da unidade/solicitante.', true); return false;
    }
  }
  if (step === 2) {
    if (!document.getElementById('wDestino').value.trim()) { toast('⚠️ Informe o destino.', true); return false; }
  }
  if (step === 3) {
    if (!document.getElementById('wData').value || !document.getElementById('wHora').value) {
      toast('⚠️ Informe data e horário de saída.', true); return false;
    }
  }
  if (step === 4) {
    if (wizardPcdList.some((p) => !p.nome_aluno.trim())) {
      toast('⚠️ Informe o nome de cada aluno PCD (ou reduza a quantidade).', true); return false;
    }
    const recorrencia = document.querySelector('input[name="wRecorrencia"]:checked').value;
    if (recorrencia !== 'unico') {
      const temDia = document.querySelectorAll('input[name="wDiaSemana"]:checked').length > 0;
      const fim = document.getElementById('wRecorrenciaFim').value;
      if (!temDia || !fim) { toast('⚠️ Escolha os dias da semana e a data final da recorrência.', true); return false; }
    }
  }
  return true;
}

function wizardNext() {
  if (!validateWizardStep(wizardStep)) return;

  if (wizardStep < 5) {
    document.getElementById('step' + wizardStep).classList.add('hidden');
    wizardStep++;
    document.getElementById('step' + wizardStep).classList.remove('hidden');
    document.getElementById('wizardStep').textContent = wizardStep;

    for (let i = 1; i <= 5; i++) {
      document.getElementById('prog' + i).className = i <= wizardStep
        ? 'h-1.5 flex-1 bg-emerald-500 rounded'
        : 'h-1.5 flex-1 bg-slate-200 rounded';
    }

    document.getElementById('btnPrev').classList.remove('hidden');
    if (wizardStep === 5) {
      document.getElementById('btnNext').textContent = '✓ Enviar Solicitação';
      renderResumo();
    }
  } else {
    submitSolicitacao();
  }
}

function wizardPrev() {
  if (wizardStep > 1) {
    document.getElementById('step' + wizardStep).classList.add('hidden');
    wizardStep--;
    document.getElementById('step' + wizardStep).classList.remove('hidden');
    document.getElementById('wizardStep').textContent = wizardStep;

    for (let i = 1; i <= 5; i++) {
      document.getElementById('prog' + i).className = i <= wizardStep
        ? 'h-1.5 flex-1 bg-emerald-500 rounded'
        : 'h-1.5 flex-1 bg-slate-200 rounded';
    }

    document.getElementById('btnNext').textContent = 'Próximo →';
    if (wizardStep === 1) document.getElementById('btnPrev').classList.add('hidden');
  }
}

function renderResumo() {
  const isOutra = document.getElementById('wEscola').value === '__outra__';
  const escola = isOutra ? (document.getElementById('wOutraNome').value || '-') : schoolName(document.getElementById('wEscola').value);
  const destino = document.getElementById('wDestino').value;
  const destinoEndereco = document.getElementById('wDestinoEndereco').value;
  const cidade = document.getElementById('wCidade').value;
  const data = document.getElementById('wData').value;
  const hora = document.getElementById('wHora').value;
  const horaRetorno = document.getElementById('wHoraRetorno').value;
  const alunos = parseInt(document.getElementById('wAlunos').value) || 0;
  const acompanhantes = parseInt(document.getElementById('wAcompanhantes').value) || 0;
  const pca = wizardPcdList.length;
  const apoios = wizardPcdList.filter((p) => p.nome_apoio && p.nome_apoio.trim()).length;
  const recorrencia = document.querySelector('input[name="wRecorrencia"]:checked').value;
  const turnoLabel = TURNO_LABELS[turnoFromHora(hora)] || '-';

  let recorrenciaTxt = 'Evento Único';
  if (recorrencia !== 'unico') {
    const dias = Array.from(document.querySelectorAll('input[name="wDiaSemana"]:checked'))
      .map((el) => ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][parseInt(el.value)]).join(', ');
    const fim = document.getElementById('wRecorrenciaFim').value;
    recorrenciaTxt = `Continuado ${recorrencia} - ${dias || 'nenhum dia escolhido'}, até ${fim ? new Date(fim + 'T00:00').toLocaleDateString('pt-BR') : '-'}`;
  }

  document.getElementById('resumoSolicitacao').innerHTML = `
    <div><strong>Origem:</strong> ${escola || '-'}</div>
    <div><strong>Destino:</strong> ${destino || '-'}${destinoEndereco ? ' - ' + destinoEndereco : ''} (${cidade || '-'})</div>
    <div><strong>Turno (automático):</strong> ${turnoLabel}</div>
    <div><strong>Data/Hora:</strong> ${data ? new Date(data + 'T00:00').toLocaleDateString('pt-BR') : '-'} às ${hora || '-'}${horaRetorno ? ' (retorno previsto ' + horaRetorno + ')' : ''}</div>
    <div><strong>Passageiros:</strong> ${alunos} alunos + ${acompanhantes} acompanhantes${pca ? ` + ${pca} PCD + ${apoios} apoio(s)` : ''} = <strong>${alunos + acompanhantes + pca + apoios} pessoas</strong></div>
    <div><strong>Tipo:</strong> ${recorrenciaTxt}</div>
  `;

  const total = alunos + acompanhantes;
  const micros = Math.floor(total / 32);
  const resto = total % 32;
  const vans = Math.ceil(resto / 15);

  let sug = `<strong>🚌 Sugestão Automática de Veículos:</strong><br/>`;
  if (total === 0) {
    sug += 'Informe a quantidade de alunos para calcular.';
  } else {
    sug += `Total: ${total} pessoas<br/>`;
    if (micros > 0) sug += `• ${micros} micro-ônibus (32 lugares)<br/>`;
    if (vans > 0) sug += `• ${vans} van (15 lugares)<br/>`;
    const foraMunicipio = cidade && !cidade.toLowerCase().includes('nova lima');
    if (foraMunicipio) sug += `<br/>⚠️ Viagem FORA de Nova Lima - será necessária <strong>ATF</strong>`;
  }
  document.getElementById('sugestaoVeiculos').innerHTML = sug;
}

function newGroupId() {
  return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'grp_' + Date.now() + '_' + Math.random().toString(36).slice(2);
}

async function submitSolicitacao() {
  const isOutra = document.getElementById('wEscola').value === '__outra__';
  const hora = document.getElementById('wHora').value;
  const dataInicial = document.getElementById('wData').value;
  const recorrencia = document.querySelector('input[name="wRecorrencia"]:checked').value;

  const base = {
    school_id: isOutra ? null : (document.getElementById('wEscola').value || null),
    requester_address: isOutra ? (document.getElementById('wOutraEndereco').value || null) : null,
    requester_contact: isOutra ? (document.getElementById('wOutraContato').value || null) : null,
    turno: turnoFromHora(hora),
    destination: document.getElementById('wDestino').value,
    destination_address: document.getElementById('wDestinoEndereco').value || null,
    city: document.getElementById('wCidade').value,
    departure_time: hora,
    return_time: document.getElementById('wHoraRetorno').value || null,
    students_count: parseInt(document.getElementById('wAlunos').value) || 0,
    companions_count: parseInt(document.getElementById('wAcompanhantes').value) || 0,
    pca_count: wizardPcdList.length,
    apoio_count: wizardPcdList.filter((p) => p.nome_apoio && p.nome_apoio.trim()).length,
    recurrence: recorrencia,
    notes: document.getElementById('wObservacoes').value || null,
    status: 'pending',
    situacao: 'sem_validacao',
    atf_status: 'nao_precisa',
    requester_name: isOutra
      ? (document.getElementById('wOutraNome').value || null)
      : (currentUser?.user_metadata?.full_name || (currentUser?.email ? currentUser.email.split('@')[0] : null)),
    created_by: currentUser?.id || null,
  };

  let tripDates = [dataInicial];
  let recurrenceGroupId = null;
  if (recorrencia !== 'unico') {
    const weekdays = Array.from(document.querySelectorAll('input[name="wDiaSemana"]:checked')).map((el) => parseInt(el.value));
    const fim = document.getElementById('wRecorrenciaFim').value;
    const geradas = computeRecurrenceDates(dataInicial, fim, recorrencia, weekdays);
    tripDates = geradas.length ? geradas : [dataInicial];
    recurrenceGroupId = newGroupId();
  }

  const novas = tripDates.map((d) => ({ ...base, trip_date: d, recurrence_group_id: recurrenceGroupId }));

  if (sb) {
    const { data, error } = await sb.from('excursions').insert(novas).select();
    if (error) { toast('❌ Erro ao salvar: ' + error.message, true); return; }
    if (wizardPcdList.length && data && data.length) {
      const pcdRows = [];
      data.forEach((row) => {
        wizardPcdList.forEach((p) => pcdRows.push({
          excursion_id: row.id, nome_aluno: p.nome_aluno, cadeirante: !!p.cadeirante, nome_apoio: p.nome_apoio || null,
        }));
      });
      const { error: pcdErr } = await sb.from('excursion_pcd_students').insert(pcdRows);
      if (pcdErr) toast('⚠️ Viagem salva, mas houve erro ao salvar os alunos PCD: ' + pcdErr.message, true);
    }
    toast(novas.length > 1 ? `✅ ${novas.length} viagens da recorrência foram criadas!` : '✅ Solicitação enviada com sucesso!');
  } else {
    novas.forEach((nova, i) => {
      nova.id = 'e' + Date.now() + '_' + i;
      nova.pcd_students = wizardPcdList.map((p) => ({ ...p }));
      agenda.push(nova);
    });
    saveDemoData();
    toast(novas.length > 1 ? `✅ ${novas.length} viagens da recorrência foram criadas (modo demo)!` : '✅ Solicitação enviada (modo demo)!');
  }

  resetWizard();
  await loadAgenda();
  renderDashboard();
  showScreen('agenda');
}

// ============ VEÍCULOS ============
let editVehicleId = null;

function renderVeiculos() {
  const grid = document.getElementById('veiculosGrid');
  if (vehicles.length === 0) {
    grid.innerHTML = '<p class="text-sm text-slate-500 col-span-full text-center py-8">Nenhum veículo cadastrado</p>';
    return;
  }
  grid.innerHTML = vehicles.map((v) => `
    <div class="bg-white rounded-xl border border-slate-200 p-5 card-hover">
      <div class="flex items-start justify-between mb-3">
        <div class="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center">
          <i data-lucide="bus" class="w-6 h-6 text-emerald-600"></i>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs bg-slate-100 px-2 py-1 rounded font-mono">${v.plate}</span>
          <button onclick="openVehicleModal('${v.id}')" class="text-xs text-emerald-600 hover:text-emerald-800">Editar</button>
        </div>
      </div>
      <h3 class="font-semibold text-slate-800 capitalize">${(v.type || '').replace('-', ' ')}</h3>
      <p class="text-sm text-slate-500 mb-3">${v.cooperative || '-'}</p>
      <div class="flex items-center justify-between text-sm border-t border-slate-100 pt-3">
        <span class="text-slate-600"><i data-lucide="users" class="w-4 h-4 inline"></i> ${v.capacity} lugares</span>
        ${v.active === false ? '<span class="text-xs text-slate-400">Inativo</span>' : '<span class="text-xs text-emerald-600">Ativo</span>'}
      </div>
    </div>
  `).join('');
  safeIcons();
}

function openVehicleModal(id) {
  editVehicleId = id || null;
  const v = editVehicleId ? vehicles.find((x) => x.id === editVehicleId) : null;
  document.getElementById('newVeiculoPlaca').value = v ? v.plate : '';
  document.getElementById('newVeiculoTipo').value = v ? (v.type || 'micro-onibus') : 'micro-onibus';
  document.getElementById('newVeiculoCapacidade').value = v ? v.capacity : '';
  document.getElementById('newVeiculoCooperativa').value = v ? (v.cooperative || '') : '';
  document.getElementById('vehicleModalTitle').textContent = v ? '🚌 Editar veículo' : '🚌 Novo veículo';
  document.getElementById('vehicleModal').classList.remove('hidden');
}
function closeVehicleModal() { document.getElementById('vehicleModal').classList.add('hidden'); editVehicleId = null; }
async function confirmSaveVehicle() {
  const wasEdit = !!editVehicleId;
  const plate = document.getElementById('newVeiculoPlaca').value.trim();
  if (!plate) { toast('⚠️ Informe a placa.', true); return; }
  const patch = {
    plate,
    type: document.getElementById('newVeiculoTipo').value,
    capacity: parseInt(document.getElementById('newVeiculoCapacidade').value) || 0,
    cooperative: document.getElementById('newVeiculoCooperativa').value.trim() || null,
  };
  if (wasEdit) {
    if (sb) {
      const { error } = await sb.from('vehicles').update(patch).eq('id', editVehicleId);
      if (error) { toast('❌ ' + error.message, true); return; }
    } else {
      const v = vehicles.find((x) => x.id === editVehicleId);
      if (v) Object.assign(v, patch);
      saveDemoData();
    }
  } else {
    patch.active = true;
    if (sb) {
      const { error } = await sb.from('vehicles').insert([patch]);
      if (error) { toast('❌ ' + error.message, true); return; }
    } else {
      patch.id = 'v' + Date.now();
      vehicles.push(patch);
      saveDemoData();
    }
  }
  await loadVehicles();
  renderVeiculos();
  closeVehicleModal();
  toast(wasEdit ? '✅ Veículo atualizado!' : '✅ Veículo cadastrado!');
}

// ============ MOTORISTAS ============
let editDriverId = null;

function renderMotoristas() {
  const tbody = document.getElementById('motoristasTable');
  if (drivers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-slate-500 text-sm">Nenhum motorista cadastrado</td></tr>';
    return;
  }
  const hoje = fmtDate(new Date());
  tbody.innerHTML = drivers.map((m) => {
    const v = driverVehicle(m.id);
    const cnhVencida = m.cnh_vencimento && m.cnh_vencimento < hoje;
    return `
    <tr class="hover:bg-slate-50">
      <td class="px-4 py-3 text-sm font-medium">${m.name}</td>
      <td class="px-4 py-3 text-sm font-mono text-xs">${m.cnh || '-'}</td>
      <td class="px-4 py-3 text-sm ${cnhVencida ? 'text-red-600 font-medium' : ''}">${m.cnh_vencimento ? new Date(m.cnh_vencimento + 'T00:00').toLocaleDateString('pt-BR') : '-'}${cnhVencida ? ' ⚠️' : ''}</td>
      <td class="px-4 py-3 text-sm">${m.phone || '-'}</td>
      <td class="px-4 py-3 text-sm">${cooperativaName(m)}</td>
      <td class="px-4 py-3 text-sm">${v ? `${v.plate} (${v.capacity} lug.)` : '<span class="text-slate-400">—</span>'}</td>
      <td class="px-4 py-3 text-sm whitespace-nowrap">
        ${m.active === false ? '<span class="bg-slate-100 text-slate-500 px-2 py-1 rounded text-xs font-medium">Inativo</span>' : '<span class="bg-emerald-100 text-emerald-800 px-2 py-1 rounded text-xs font-medium">Ativo</span>'}
        <button onclick="openDriverModal('${m.id}')" class="ml-2 text-xs text-emerald-600 hover:text-emerald-800">Editar</button>
      </td>
    </tr>`;
  }).join('');
}

function openDriverModal(id) {
  editDriverId = id || null;
  const m = editDriverId ? drivers.find((x) => x.id === editDriverId) : null;
  document.getElementById('newMotoristaNome').value = m ? m.name : '';
  document.getElementById('newMotoristaCnh').value = m ? (m.cnh || '') : '';
  document.getElementById('newMotoristaCnhVencimento').value = m ? (m.cnh_vencimento || '') : '';
  document.getElementById('newMotoristaTelefone').value = m ? (m.phone || '') : '';
  populateCooperativaSelect('newMotoristaCooperativaId', m ? m.cooperativa_id : '');
  const vSel = document.getElementById('newMotoristaVeiculo');
  if (vSel) {
    vSel.innerHTML = '<option value="">— nenhum —</option>' + vehicles.filter((v) => v.active !== false).map((v) => `<option value="${v.id}" ${m && m.vehicle_id === v.id ? 'selected' : ''}>${v.plate} (${v.capacity} lugares)</option>`).join('');
  }
  document.getElementById('driverModalTitle').textContent = m ? '👤 Editar motorista' : '👤 Novo motorista';
  document.getElementById('driverModal').classList.remove('hidden');
}
function closeDriverModal() { document.getElementById('driverModal').classList.add('hidden'); editDriverId = null; }
async function confirmSaveDriver() {
  const wasEdit = !!editDriverId;
  const name = document.getElementById('newMotoristaNome').value.trim();
  if (!name) { toast('⚠️ Informe o nome.', true); return; }
  const vSel = document.getElementById('newMotoristaVeiculo');
  const coopSel = document.getElementById('newMotoristaCooperativaId');
  const cooperativaId = (coopSel && coopSel.value) || null;
  const coop = cooperativaId ? cooperativas.find((c) => c.id === cooperativaId) : null;
  const patch = {
    name,
    cnh: document.getElementById('newMotoristaCnh').value.trim() || null,
    cnh_vencimento: document.getElementById('newMotoristaCnhVencimento').value || null,
    phone: document.getElementById('newMotoristaTelefone').value.trim() || null,
    cooperativa_id: cooperativaId,
    cooperative: coop ? coop.name : null, // mantido por compatibilidade com telas antigas
    vehicle_id: (vSel && vSel.value) || null,
  };
  if (wasEdit) {
    if (sb) {
      const { error } = await sb.from('drivers').update(patch).eq('id', editDriverId);
      if (error) { toast('❌ ' + error.message, true); return; }
    } else {
      const d = drivers.find((x) => x.id === editDriverId);
      if (d) Object.assign(d, patch);
      saveDemoData();
    }
  } else {
    patch.active = true;
    if (sb) {
      const { error } = await sb.from('drivers').insert([patch]);
      if (error) { toast('❌ ' + error.message, true); return; }
    } else {
      patch.id = 'd' + Date.now();
      drivers.push(patch);
      saveDemoData();
    }
  }
  await loadDrivers();
  renderMotoristas();
  closeDriverModal();
  toast(wasEdit ? '✅ Motorista atualizado!' : '✅ Motorista cadastrado!');
}

// ============ UNIDADES (escolas/entidades) ============
let editUnidadeId = null;

function renderUnidades() {
  const tbody = document.getElementById('unidadesTable');
  if (schools.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-slate-500 text-sm">Nenhuma unidade cadastrada</td></tr>';
    return;
  }
  tbody.innerHTML = schools.map((s) => `
    <tr class="hover:bg-slate-50">
      <td class="px-4 py-3 text-sm font-medium">${s.name}</td>
      <td class="px-4 py-3 text-sm">${s.tipo === 'entidade' ? 'Entidade' : 'Escola'}</td>
      <td class="px-4 py-3 text-sm">${s.address || '-'}</td>
      <td class="px-4 py-3 text-sm">${s.email || '-'}</td>
      <td class="px-4 py-3 text-sm">${s.phone || s.contact || '-'}</td>
      <td class="px-4 py-3 text-sm"><button onclick="openUnidadeModal('${s.id}')" class="text-xs text-emerald-600 hover:text-emerald-800">Editar</button></td>
    </tr>`).join('');
}

function openUnidadeModal(id) {
  editUnidadeId = id || null;
  const s = editUnidadeId ? schools.find((x) => x.id === editUnidadeId) : null;
  document.getElementById('newUnidadeNome').value = s ? s.name : '';
  document.getElementById('newUnidadeTipo').value = s ? s.tipo : 'escola';
  document.getElementById('newUnidadeEndereco').value = s ? (s.address || '') : '';
  document.getElementById('newUnidadeEmail').value = s ? (s.email || '') : '';
  document.getElementById('newUnidadeTelefone').value = s ? (s.phone || s.contact || '') : '';
  document.getElementById('unidadeModalTitle').textContent = s ? '🏫 Editar unidade' : '🏫 Nova unidade';
  document.getElementById('unidadeModal').classList.remove('hidden');
}
function closeUnidadeModal() { document.getElementById('unidadeModal').classList.add('hidden'); editUnidadeId = null; }
async function confirmSaveUnidade() {
  const wasEdit = !!editUnidadeId;
  const name = document.getElementById('newUnidadeNome').value.trim();
  if (!name) { toast('⚠️ Informe o nome da unidade.', true); return; }
  const patch = {
    name,
    tipo: document.getElementById('newUnidadeTipo').value,
    address: document.getElementById('newUnidadeEndereco').value.trim() || null,
    email: document.getElementById('newUnidadeEmail').value.trim() || null,
    phone: document.getElementById('newUnidadeTelefone').value.trim() || null,
  };
  if (wasEdit) {
    if (sb) {
      const { error } = await sb.from('schools').update(patch).eq('id', editUnidadeId);
      if (error) { toast('❌ ' + error.message, true); return; }
    } else {
      const s = schools.find((x) => x.id === editUnidadeId);
      if (s) Object.assign(s, patch);
      saveDemoData();
    }
  } else {
    if (sb) {
      const { error } = await sb.from('schools').insert([patch]);
      if (error) { toast('❌ ' + error.message, true); return; }
    } else {
      patch.id = 's' + Date.now();
      schools.push(patch);
      saveDemoData();
    }
  }
  await loadSchools();
  renderUnidades();
  closeUnidadeModal();
  toast(wasEdit ? '✅ Unidade atualizada!' : '✅ Unidade cadastrada!');
}

// ============ COOPERATIVAS + CONFIGURAÇÕES DE E-MAIL ============
let editCooperativaId = null;

function renderCooperativas() {
  const tbody = document.getElementById('cooperativasTable');
  if (cooperativas.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-slate-500 text-sm">Nenhuma cooperativa cadastrada</td></tr>';
    return;
  }
  tbody.innerHTML = cooperativas.map((c) => `
    <tr class="hover:bg-slate-50">
      <td class="px-4 py-3 text-sm font-medium">${c.name}</td>
      <td class="px-4 py-3 text-sm">${c.email || '<span class="text-amber-600">sem e-mail cadastrado</span>'}</td>
      <td class="px-4 py-3 text-sm">${c.phone || '-'}</td>
      <td class="px-4 py-3 text-sm"><button onclick="openCooperativaModal('${c.id}')" class="text-xs text-emerald-600 hover:text-emerald-800">Editar</button></td>
    </tr>`).join('');
}

function openCooperativaModal(id) {
  editCooperativaId = id || null;
  const c = editCooperativaId ? cooperativas.find((x) => x.id === editCooperativaId) : null;
  document.getElementById('newCooperativaNome').value = c ? c.name : '';
  document.getElementById('newCooperativaEmail').value = c ? (c.email || '') : '';
  document.getElementById('newCooperativaTelefone').value = c ? (c.phone || '') : '';
  document.getElementById('cooperativaModalTitle').textContent = c ? '📨 Editar cooperativa' : '📨 Nova cooperativa';
  document.getElementById('cooperativaModal').classList.remove('hidden');
}
function closeCooperativaModal() { document.getElementById('cooperativaModal').classList.add('hidden'); editCooperativaId = null; }
async function confirmSaveCooperativa() {
  const wasEdit = !!editCooperativaId;
  const name = document.getElementById('newCooperativaNome').value.trim();
  if (!name) { toast('⚠️ Informe o nome da cooperativa.', true); return; }
  const patch = {
    name,
    email: document.getElementById('newCooperativaEmail').value.trim() || null,
    phone: document.getElementById('newCooperativaTelefone').value.trim() || null,
  };
  if (wasEdit) {
    if (sb) {
      const { error } = await sb.from('cooperativas').update(patch).eq('id', editCooperativaId);
      if (error) { toast('❌ ' + error.message, true); return; }
    } else {
      const c = cooperativas.find((x) => x.id === editCooperativaId);
      if (c) Object.assign(c, patch);
      saveDemoData();
    }
  } else {
    if (sb) {
      const { error } = await sb.from('cooperativas').insert([patch]);
      if (error) { toast('❌ ' + error.message, true); return; }
    } else {
      patch.id = 'c' + Date.now();
      cooperativas.push(patch);
      saveDemoData();
    }
  }
  await loadCooperativas();
  renderCooperativas();
  closeCooperativaModal();
  toast(wasEdit ? '✅ Cooperativa atualizada!' : '✅ Cooperativa cadastrada!');
}

function fillSettingsForm() {
  document.getElementById('settingsRemetenteNome').value = appSettings.remetente_nome || '';
  document.getElementById('settingsRemetenteEmail').value = appSettings.remetente_email || '';
}
async function confirmSaveSettings() {
  const nome = document.getElementById('settingsRemetenteNome').value.trim();
  const email = document.getElementById('settingsRemetenteEmail').value.trim();
  if (sb) {
    const { error: e1 } = await sb.from('app_settings').update({ value: nome }).eq('key', 'remetente_nome');
    const { error: e2 } = await sb.from('app_settings').update({ value: email }).eq('key', 'remetente_email');
    if (e1 || e2) { toast('❌ Erro ao salvar configurações: ' + ((e1 || e2).message), true); return; }
  }
  appSettings = { remetente_nome: nome, remetente_email: email };
  if (!sb) saveDemoData();
  toast('✅ Configurações salvas!');
}

// ============ PDF ============
// ============ RELATÓRIOS (filtros próprios: período + unidade) ============
function populateUnidadeFilterSelect(selId) {
  const sel = document.getElementById(selId);
  if (!sel) return;
  const atual = sel.value;
  sel.innerHTML = '<option value="">Todas</option>' + schools.map((s) => `<option value="${s.id}">${s.name}</option>`).join('');
  sel.value = atual;
}

function populateRelatorioFilters() { populateUnidadeFilterSelect('relFiltroUnidade'); }

function filterRelatorio() {
  const inicio = document.getElementById('relFiltroInicio').value;
  const fim = document.getElementById('relFiltroFim').value;
  const unidade = document.getElementById('relFiltroUnidade').value;
  return getVisibleAgenda().filter((a) => {
    if (inicio && a.trip_date < inicio) return false;
    if (fim && a.trip_date > fim) return false;
    if (unidade && a.school_id !== unidade) return false;
    return true;
  });
}

function exportPDF(tipo = 'agenda') {
  if (!window.jspdf) {
    toast('⚠️ Não foi possível carregar o gerador de PDF (verifique sua internet) e tente novamente.', true);
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const rows = filterRelatorio().sort((a, b) => (a.trip_date + a.departure_time).localeCompare(b.trip_date + b.departure_time));

  doc.setFillColor(5, 150, 105);
  doc.rect(0, 0, 210, 25, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('BORA LÁ - EXCURSÕES', 14, 16);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Semed - Nova Lima/MG', 196, 16, { align: 'right' });

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');

  if (tipo === 'agenda') {
    doc.text('Agenda de Viagens', 14, 40);
    doc.autoTable({
      startY: 45,
      head: [['Data', 'Turno', 'Origem', 'Destino', 'Cidade', 'Passageiros', 'Situação']],
      body: rows.map((a) => [
        new Date(a.trip_date + 'T00:00').toLocaleDateString('pt-BR'),
        TURNO_LABELS[a.turno || turnoFromHora(a.departure_time)] || '-',
        schoolName(a.school_id), a.destination, a.city || '-', a.students_count, SITUACAO_LABELS[a.situacao] || a.situacao,
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [5, 150, 105] },
    });
  }

  const pages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')} - Página ${i} de ${pages}`, 14, 290);
  }

  doc.save(`bora-la-${tipo}-${Date.now()}.pdf`);
  toast('📄 PDF gerado com sucesso!');
}

function exportExcel() {
  if (!window.XLSX) {
    toast('⚠️ Não foi possível carregar o gerador de Excel (verifique sua internet) e tente novamente.', true);
    return;
  }
  const rows = filterRelatorio().sort((a, b) => (a.trip_date + a.departure_time).localeCompare(b.trip_date + b.departure_time));
  const data = rows.map((a) => ({
    Data: new Date(a.trip_date + 'T00:00').toLocaleDateString('pt-BR'),
    Turno: TURNO_LABELS[a.turno || turnoFromHora(a.departure_time)] || '-',
    'Saída': a.departure_time || '-',
    'Retorno': a.return_time || '-',
    Origem: schoolName(a.school_id),
    Destino: a.destination,
    Cidade: a.city || '-',
    Alunos: a.students_count || 0,
    Acompanhantes: a.companions_count || 0,
    PCD: a.pca_count || 0,
    Apoios: a.apoio_count || 0,
    'Situação': SITUACAO_LABELS[a.situacao] || a.situacao,
    ATF: ATF_LABELS[a.atf_status] || a.atf_status,
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Agenda');
  XLSX.writeFile(wb, `bora-la-agenda-${Date.now()}.xlsx`);
  toast('📊 Excel gerado com sucesso!');
}

// ============ TOAST ============
function toast(msg, isError = false) {
  const t = document.getElementById('toast');
  const m = document.getElementById('toastMsg');
  m.textContent = msg;
  m.className = 'text-sm font-medium ' + (isError ? 'text-red-600' : 'text-slate-800');
  t.classList.remove('hidden');
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => t.classList.add('hidden'), 3000);
}

// ============ SERVICE WORKER (PWA) ============
// Desativado por enquanto: o cache do Service Worker estava fazendo alguns navegadores
// mostrarem versões antigas do app mesmo depois de corrigidas, sem nenhum aviso disso
// acontecendo. Este bloco remove automaticamente, de qualquer aparelho que abrir o site,
// qualquer Service Worker/cache de visitas antigas — sem precisar de nenhum passo manual.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((reg) => reg.unregister());
  });
}
if (window.caches && caches.keys) {
  caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
}
