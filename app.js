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

let schools = [];
let vehicles = [];
let drivers = [];
let agenda = [];

let assignTargetId = null;
let rejectTargetId = null;

// permissão de tela por perfil (espelha data-roles do index.html)
const SCREEN_ROLES = {
  dashboard: ['admin', 'escola', 'pedagogia', 'motorista'],
  agenda: ['admin', 'escola', 'pedagogia', 'motorista'],
  solicitacao: ['admin', 'escola'],
  veiculos: ['admin'],
  motoristas: ['admin'],
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

// Cada motorista é dono do próprio veículo (vehicle_id) — dirige sempre o mesmo.
const DEMO_DRIVERS = [
  { id: 'd1', name: 'João Silva', cnh: '01234567890', phone: '(31) 99999-1111', cooperative: 'CoopTrans', active: true, vehicle_id: 'v1' },
  { id: 'd2', name: 'Pedro Santos', cnh: '09876543210', phone: '(31) 99999-2222', cooperative: 'CoopTrans', active: true, vehicle_id: 'v2' },
];

function fmtDate(d) { return d.toISOString().split('T')[0]; }

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
  saveDemoData();
}

function saveDemoData() {
  sessionStorage.setItem('demoData', JSON.stringify({ schools, vehicles, drivers, agenda }));
}

// Preenche campos novos (Situação/ATF/turno/motorista(s)/tipo/veículo do motorista etc.)
// em dados de demonstração que ficaram salvos em sessionStorage de uma versão anterior
// do app, pra não quebrar uma sessão de teste já aberta.
function backfillDemoData() {
  schools.forEach((s) => { if (s.tipo === undefined) s.tipo = 'escola'; });
  drivers.forEach((d) => { if (d.vehicle_id === undefined) d.vehicle_id = null; });
  agenda.forEach((a) => {
    if (a.driver_ids === undefined) a.driver_ids = a.assigned_driver_id ? [a.assigned_driver_id] : [];
    if (a.situacao === undefined) a.situacao = 'sem_validacao';
    if (a.atf_status === undefined) a.atf_status = 'nao_precisa';
    if (a.turno === undefined) a.turno = 'manha';
    if (a.lista_escola === undefined) a.lista_escola = false;
    if (a.pca_count === undefined) a.pca_count = 0;
    if (a.apoio_count === undefined) a.apoio_count = 0;
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

  await Promise.all([loadSchools(), loadVehicles(), loadDrivers(), loadProfiles()]);
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
    veiculos: ['Veículos', 'Frota disponível'],
    motoristas: ['Motoristas', 'Cadastro de motoristas e cooperativas'],
    relatorios: ['Relatórios', 'Geração de PDFs e documentos'],
  };
  document.getElementById('pageTitle').textContent = titles[name]?.[0] || '';
  document.getElementById('pageSubtitle').textContent = titles[name]?.[1] || '';

  if (name === 'dashboard') renderDashboard();
  if (name === 'agenda') renderAgenda();
  if (name === 'solicitacao') openSolicitacaoScreen();
  if (name === 'veiculos') renderVeiculos();
  if (name === 'motoristas') renderMotoristas();
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
function renderDashboard() {
  const visible = getVisibleAgenda();
  const hoje = fmtDate(new Date());
  const viagensHoje = visible.filter((a) => a.trip_date === hoje).length;
  const pendentes = visible.filter((a) => a.situacao === 'sem_validacao').length;
  const aprovadas = visible.filter((a) => a.situacao === 'aprovada' || a.situacao === 'confirmada').length;
  const alunos = visible.reduce((s, a) => s + (a.students_count || 0), 0);

  document.getElementById('statHoje').textContent = viagensHoje;
  document.getElementById('statPendentes').textContent = pendentes;
  document.getElementById('statAprovadas').textContent = aprovadas;
  document.getElementById('statAlunos').textContent = alunos;

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
    tbody.innerHTML = '<tr><td colspan="12" class="text-center py-8 text-slate-500 text-sm">Nenhuma viagem encontrada</td></tr>';
    return;
  }

  const role = currentUser.role;
  const podeEditarSituacao = role === 'admin' || role === 'pedagogia';
  const podeEditarOperacional = role === 'admin';

  tbody.innerHTML = filtered
    .sort((a, b) => (a.trip_date + a.departure_time).localeCompare(b.trip_date + b.departure_time))
    .map((a) => {
      const turnoLabel = { manha: 'Manhã', tarde: 'Tarde', noite: 'Noite' }[a.turno] || '-';

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

      return `
    <tr class="hover:bg-slate-50">
      <td class="px-4 py-3 text-sm">
        <div class="font-medium">${new Date(a.trip_date + 'T00:00').toLocaleDateString('pt-BR')}</div>
        <div class="text-xs text-slate-500">${turnoLabel} • ${a.departure_time}</div>
      </td>
      <td class="px-4 py-3 text-sm">
        <div>${schoolName(a.school_id)}</div>
        <div class="text-xs text-slate-500">${schoolAddress(a.school_id) || '-'}</div>
      </td>
      <td class="px-4 py-3 text-sm">
        <div>${a.destination}</div>
        <div class="text-xs text-slate-500">${a.destination_address || a.city || '-'}</div>
      </td>
      <td class="px-4 py-3 text-sm">
        <div class="font-medium">${a.students_count}</div>
        ${a.pca_count ? `<div class="text-xs text-slate-500">${a.pca_count} PCA / ${a.apoio_count || 0} apoio(s)</div>` : ''}
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

async function pedagogyApprove(id) {
  const trip = agenda.find((a) => a.id === id);
  const precisaAtf = trip && trip.city && !trip.city.toLowerCase().includes('nova lima');
  const ok = await updateExcursion(id, {
    status: 'pedagogy_approved',
    pedagogy_approved_by: currentUser.id,
    pedagogy_approved_at: new Date().toISOString(),
    situacao: precisaAtf ? 'aguarda_atf' : 'aprovada',
  });
  if (!ok) return;
  await loadAgenda(); renderAgenda(); renderDashboard();
  toast('✅ Viagem aprovada pela pedagogia! Aguardando aprovação final do admin.');
}

function openRejectModal(id) {
  rejectTargetId = id;
  document.getElementById('rejectMotivo').value = '';
  document.getElementById('rejectModal').classList.remove('hidden');
}
function closeRejectModal() { document.getElementById('rejectModal').classList.add('hidden'); rejectTargetId = null; }
async function confirmReject() {
  const motivo = document.getElementById('rejectMotivo').value.trim();
  const ok = await updateExcursion(rejectTargetId, { status: 'rejected', rejection_reason: motivo || null, situacao: 'reprovada' });
  if (ok) { await loadAgenda(); renderAgenda(); renderDashboard(); toast('🚫 Solicitação recusada.'); }
  closeRejectModal();
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
  sel.innerHTML = schools.map((s) => `<option value="${s.id}">${s.name}</option>`).join('');
  if (currentUser.role === 'escola' && currentUser.schoolId) {
    sel.value = currentUser.schoolId;
    sel.disabled = true;
  } else {
    sel.disabled = false;
  }
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
  document.getElementById('wDestino').value = '';
  document.getElementById('wDestinoEndereco').value = '';
  document.getElementById('wCidade').value = '';
  document.getElementById('wData').value = '';
  document.getElementById('wHora').value = '';
  document.getElementById('wHoraRetorno').value = '';
  document.getElementById('wAlunos').value = 0;
  document.getElementById('wAcompanhantes').value = 0;
  document.getElementById('wPCA').value = 0;
  document.getElementById('wApoios').value = 0;
  document.getElementById('wObservacoes').value = '';
  const unico = document.querySelector('input[name="wRecorrencia"][value="unico"]');
  if (unico) unico.checked = true;
  const manha = document.querySelector('input[name="wTurno"][value="manha"]');
  if (manha) manha.checked = true;
}

function validateWizardStep(step) {
  if (step === 2) {
    if (!document.getElementById('wDestino').value.trim()) { toast('⚠️ Informe o destino.', true); return false; }
  }
  if (step === 3) {
    if (!document.getElementById('wData').value || !document.getElementById('wHora').value) {
      toast('⚠️ Informe data e horário de saída.', true); return false;
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
  const escola = schoolName(document.getElementById('wEscola').value);
  const destino = document.getElementById('wDestino').value;
  const destinoEndereco = document.getElementById('wDestinoEndereco').value;
  const cidade = document.getElementById('wCidade').value;
  const turno = document.querySelector('input[name="wTurno"]:checked').value;
  const data = document.getElementById('wData').value;
  const hora = document.getElementById('wHora').value;
  const horaRetorno = document.getElementById('wHoraRetorno').value;
  const alunos = parseInt(document.getElementById('wAlunos').value) || 0;
  const acompanhantes = parseInt(document.getElementById('wAcompanhantes').value) || 0;
  const pca = parseInt(document.getElementById('wPCA').value) || 0;
  const apoios = parseInt(document.getElementById('wApoios').value) || 0;
  const recorrencia = document.querySelector('input[name="wRecorrencia"]:checked').value;
  const turnoLabel = { manha: 'Manhã', tarde: 'Tarde', noite: 'Noite' }[turno] || turno;

  document.getElementById('resumoSolicitacao').innerHTML = `
    <div><strong>Origem:</strong> ${escola || '-'}</div>
    <div><strong>Destino:</strong> ${destino || '-'}${destinoEndereco ? ' - ' + destinoEndereco : ''} (${cidade || '-'})</div>
    <div><strong>Turno:</strong> ${turnoLabel}</div>
    <div><strong>Data/Hora:</strong> ${data ? new Date(data + 'T00:00').toLocaleDateString('pt-BR') : '-'} às ${hora || '-'}${horaRetorno ? ' (retorno previsto ' + horaRetorno + ')' : ''}</div>
    <div><strong>Passageiros:</strong> ${alunos} + ${acompanhantes} acompanhantes${pca ? ` (sendo ${pca} PCA, com ${apoios} apoio(s))` : ''} = <strong>${alunos + acompanhantes} pessoas</strong></div>
    <div><strong>Tipo:</strong> ${recorrencia === 'unico' ? 'Evento Único' : 'Continuado ' + recorrencia}</div>
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

async function submitSolicitacao() {
  const nova = {
    school_id: document.getElementById('wEscola').value || null,
    turno: document.querySelector('input[name="wTurno"]:checked').value,
    destination: document.getElementById('wDestino').value,
    destination_address: document.getElementById('wDestinoEndereco').value || null,
    city: document.getElementById('wCidade').value,
    trip_date: document.getElementById('wData').value,
    departure_time: document.getElementById('wHora').value,
    return_time: document.getElementById('wHoraRetorno').value || null,
    students_count: parseInt(document.getElementById('wAlunos').value) || 0,
    companions_count: parseInt(document.getElementById('wAcompanhantes').value) || 0,
    pca_count: parseInt(document.getElementById('wPCA').value) || 0,
    apoio_count: parseInt(document.getElementById('wApoios').value) || 0,
    recurrence: document.querySelector('input[name="wRecorrencia"]:checked').value,
    notes: document.getElementById('wObservacoes').value || null,
    status: 'pending',
    situacao: 'sem_validacao',
    atf_status: 'nao_precisa',
    requester_name: currentUser?.user_metadata?.full_name || (currentUser?.email ? currentUser.email.split('@')[0] : null),
    created_by: currentUser?.id || null,
  };

  if (sb) {
    const { error } = await sb.from('excursions').insert([nova]);
    if (error) { toast('❌ Erro ao salvar: ' + error.message, true); return; }
    toast('✅ Solicitação enviada com sucesso!');
  } else {
    nova.id = 'e' + Date.now();
    agenda.push(nova);
    saveDemoData();
    toast('✅ Solicitação enviada (modo demo)!');
  }

  resetWizard();
  await loadAgenda();
  renderDashboard();
  showScreen('agenda');
}

// ============ VEÍCULOS ============
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
        <span class="text-xs bg-slate-100 px-2 py-1 rounded font-mono">${v.plate}</span>
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

function openVehicleModal() {
  ['newVeiculoPlaca', 'newVeiculoCapacidade', 'newVeiculoCooperativa'].forEach((id) => document.getElementById(id).value = '');
  document.getElementById('vehicleModal').classList.remove('hidden');
}
function closeVehicleModal() { document.getElementById('vehicleModal').classList.add('hidden'); }
async function confirmAddVehicle() {
  const plate = document.getElementById('newVeiculoPlaca').value.trim();
  if (!plate) { toast('⚠️ Informe a placa.', true); return; }
  const novo = {
    plate,
    type: document.getElementById('newVeiculoTipo').value,
    capacity: parseInt(document.getElementById('newVeiculoCapacidade').value) || 0,
    cooperative: document.getElementById('newVeiculoCooperativa').value.trim() || null,
    active: true,
  };
  if (sb) {
    const { error } = await sb.from('vehicles').insert([novo]);
    if (error) { toast('❌ ' + error.message, true); return; }
  } else {
    novo.id = 'v' + Date.now();
    vehicles.push(novo);
    saveDemoData();
  }
  await loadVehicles();
  renderVeiculos();
  closeVehicleModal();
  toast('✅ Veículo cadastrado!');
}

// ============ MOTORISTAS ============
function renderMotoristas() {
  const tbody = document.getElementById('motoristasTable');
  if (drivers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-slate-500 text-sm">Nenhum motorista cadastrado</td></tr>';
    return;
  }
  tbody.innerHTML = drivers.map((m) => {
    const v = driverVehicle(m.id);
    return `
    <tr class="hover:bg-slate-50">
      <td class="px-4 py-3 text-sm font-medium">${m.name}</td>
      <td class="px-4 py-3 text-sm font-mono text-xs">${m.cnh || '-'}</td>
      <td class="px-4 py-3 text-sm">${m.phone || '-'}</td>
      <td class="px-4 py-3 text-sm">${m.cooperative || '-'}</td>
      <td class="px-4 py-3 text-sm">${v ? `${v.plate} (${v.capacity} lug.)` : '<span class="text-slate-400">—</span>'}</td>
      <td class="px-4 py-3 text-sm">${m.active === false ? '<span class="bg-slate-100 text-slate-500 px-2 py-1 rounded text-xs font-medium">Inativo</span>' : '<span class="bg-emerald-100 text-emerald-800 px-2 py-1 rounded text-xs font-medium">Ativo</span>'}</td>
    </tr>`;
  }).join('');
}

function openDriverModal() {
  ['newMotoristaNome', 'newMotoristaCnh', 'newMotoristaTelefone', 'newMotoristaCooperativa'].forEach((id) => document.getElementById(id).value = '');
  const vSel = document.getElementById('newMotoristaVeiculo');
  if (vSel) {
    vSel.innerHTML = '<option value="">— nenhum —</option>' + vehicles.filter((v) => v.active !== false).map((v) => `<option value="${v.id}">${v.plate} (${v.capacity} lugares)</option>`).join('');
  }
  document.getElementById('driverModal').classList.remove('hidden');
}
function closeDriverModal() { document.getElementById('driverModal').classList.add('hidden'); }
async function confirmAddDriver() {
  const name = document.getElementById('newMotoristaNome').value.trim();
  if (!name) { toast('⚠️ Informe o nome.', true); return; }
  const vSel = document.getElementById('newMotoristaVeiculo');
  const novo = {
    name,
    cnh: document.getElementById('newMotoristaCnh').value.trim() || null,
    phone: document.getElementById('newMotoristaTelefone').value.trim() || null,
    cooperative: document.getElementById('newMotoristaCooperativa').value.trim() || null,
    vehicle_id: (vSel && vSel.value) || null,
    active: true,
  };
  if (sb) {
    const { error } = await sb.from('drivers').insert([novo]);
    if (error) { toast('❌ ' + error.message, true); return; }
  } else {
    novo.id = 'd' + Date.now();
    drivers.push(novo);
    saveDemoData();
  }
  await loadDrivers();
  renderMotoristas();
  closeDriverModal();
  toast('✅ Motorista cadastrado!');
}

// ============ PDF ============
function exportPDF(tipo = 'agenda') {
  if (!window.jspdf) {
    toast('⚠️ Não foi possível carregar o gerador de PDF (verifique sua internet) e tente novamente.', true);
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const rows = filterAgenda().sort((a, b) => (a.trip_date + a.departure_time).localeCompare(b.trip_date + b.departure_time));

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
        { manha: 'Manhã', tarde: 'Tarde', noite: 'Noite' }[a.turno] || '-',
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
