const { chromium } = require('playwright');
const BASE = 'http://localhost:8877';
let failures = 0;
function fail(msg) { failures++; console.log('❌ FAIL:', msg); }
function ok(msg) { console.log('✅', msg); }

async function loginAs(page, email) {
  await page.fill('#loginEmail', email);
  await page.fill('#loginPassword', 'x');
  await page.click('#loginForm button[type=submit]');
  await page.waitForURL('**/app.html', { timeout: 5000 }).catch(() => {});
  await page.waitForLoadState('networkidle');
}
async function logout(page) {
  await page.click('button:has-text("Sair")');
  await page.waitForURL('**/index.html', { timeout: 5000 }).catch(() => {});
  await page.waitForLoadState('networkidle');
}
async function goAgenda(page) {
  await page.click('.sidebar-link[data-screen="agenda"]');
  await page.waitForTimeout(150);
}
async function rowText(page, needle) {
  return page.locator('#agendaTable tr', { hasText: needle });
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.route('**cdn.tailwindcss.com**', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.route('**unpkg.com/lucide@latest**', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.lucide={createIcons:function(){}};' }));
  await page.route('**cdn.jsdelivr.net/npm/@supabase/supabase-js@2**', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.route('**cdnjs.cloudflare.com/ajax/libs/jspdf/**', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.route('**cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/**', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  page.on('pageerror', (e) => fail('pageerror: ' + e.message));

  await page.goto(BASE + '/index.html', { waitUntil: 'networkidle' });

  // ---- 1) PEDAGOGIA aprova a solicitação pendente "Museu de Ciências e Técnica" ----
  // (destino em Belo Horizonte -> fora de Nova Lima -> Situação deve virar "Aguarda ATF")
  await loginAs(page, 'pedagogia@teste.com');
  await goAgenda(page);
  let row = await rowText(page, 'Museu de Ciências e Técnica');
  if ((await row.locator('select').inputValue()) !== 'sem_validacao') fail('e1 não estava com Situação "Sem Validação" para a pedagogia');
  await row.locator('button:has-text("Aprovar (Pedagogia)")').click();
  await page.waitForTimeout(200);
  row = await rowText(page, 'Museu de Ciências e Técnica');
  if ((await row.locator('select').inputValue()) === 'aguarda_atf') ok('pedagogia aprovou -> Situação "Aguarda ATF" (destino fora de Nova Lima)');
  else fail('Situação não mudou para "Aguarda ATF" após aprovação da pedagogia');
  await logout(page);

  // ---- 2) ADMIN atribui motorista(s) (aprovação final) ----
  await loginAs(page, 'admin@teste.com');
  await goAgenda(page);
  row = await rowText(page, 'Museu de Ciências e Técnica');
  await row.locator('button:has-text("Aprovar e atribuir motorista(s)")').click();
  await page.waitForTimeout(150);
  await page.locator('#assignMotoristasList label', { hasText: 'João Silva' }).locator('input[type=checkbox]').check();
  await page.click('#assignModal button:has-text("Confirmar aprovação")');
  await page.waitForTimeout(200);
  row = await rowText(page, 'Museu de Ciências e Técnica');
  const rowTxt = await row.textContent();
  if (rowTxt.includes('João Silva - 32')) {
    ok('admin aprovou e atribuiu motorista (com capacidade do próprio veículo dele) corretamente');
  } else {
    fail('atribuição de motorista não refletiu na tabela: ' + rowTxt);
  }
  await logout(page);

  // ---- 3) MOTORISTA (João Silva = d1) inicia e conclui a viagem ----
  // (Situação não tem valor equivalente a "em trânsito"/"concluída" - isso é rastreado
  // internamente e refletido na troca dos botões de ação, não na coluna Situação)
  await loginAs(page, 'motorista@teste.com');
  await goAgenda(page); // rótulo vira "Minhas Viagens"
  row = await rowText(page, 'Museu de Ciências e Técnica');
  if (!(await row.isVisible())) fail('motorista não enxergou a viagem atribuída a ele');
  await row.locator('button:has-text("Iniciar viagem")').click();
  await page.waitForTimeout(200);
  row = await rowText(page, 'Museu de Ciências e Técnica');
  if (!(await row.locator('button:has-text("Concluir viagem")').isVisible())) fail('viagem iniciada não passou a mostrar o botão "Concluir viagem"');
  else ok('motorista iniciou a viagem -> botão vira "Concluir viagem"');
  await row.locator('button:has-text("Concluir viagem")').click();
  await page.waitForTimeout(200);
  row = await rowText(page, 'Museu de Ciências e Técnica');
  const rowTxtFinal = await row.textContent();
  if (rowTxtFinal.includes('Iniciar viagem') || rowTxtFinal.includes('Concluir viagem')) fail('viagem concluída ainda mostra botão de ação de execução: ' + rowTxtFinal);
  else ok('motorista concluiu a viagem -> nenhum botão de execução pendente');
  await logout(page);

  // ---- 4) ESCOLA cria uma nova solicitação, PEDAGOGIA recusa com motivo ----
  await loginAs(page, 'escola@teste.com');
  await page.click('.sidebar-link[data-screen="solicitacao"]');
  await page.waitForTimeout(150);
  await page.click('#btnNext');
  await page.fill('#wDestino', 'Fazenda Modelo XYZ');
  await page.fill('#wCidade', 'Nova Lima');
  await page.click('#btnNext');
  await page.fill('#wData', '2026-11-20');
  await page.fill('#wHora', '09:00');
  await page.click('#btnNext');
  await page.fill('#wAlunos', '10');
  await page.click('#btnNext');
  await page.click('#btnNext'); // enviar
  await page.waitForTimeout(200);
  await logout(page);

  await loginAs(page, 'pedagogia@teste.com');
  await goAgenda(page);
  row = await rowText(page, 'Fazenda Modelo XYZ');
  if (!(await row.isVisible())) fail('pedagogia não viu a nova solicitação da escola');
  await row.locator('button:has-text("Recusar")').click();
  await page.waitForTimeout(150);
  await page.fill('#rejectMotivo', 'Data conflita com o calendário letivo.');
  await page.click('#rejectModal button:has-text("Confirmar recusa")');
  await page.waitForTimeout(200);
  row = await rowText(page, 'Fazenda Modelo XYZ');
  if ((await row.locator('select').inputValue()) === 'reprovada') ok('pedagogia recusou a solicitação -> Situação "Reprovada"');
  else fail('Situação não mudou para "Reprovada"');
  await logout(page);

  // ---- 5) ESCOLA (outra escola) NÃO deve ver a viagem da primeira escola ----
  // e3/e4/e5 pertencem à escola s2; o usuário demo "escola" está fixo em s1.
  await loginAs(page, 'escola@teste.com');
  await goAgenda(page);
  const bodyTxt = await page.textContent('#agendaTable');
  if (bodyTxt.includes('Teatro Municipal')) fail('isolamento por escola falhou: escola s1 está vendo viagem da escola s2');
  else ok('isolamento por escola OK: escola só vê as próprias viagens');
  await logout(page);

  await browser.close();
  console.log('\n=== RESULTADO:', failures === 0 ? 'TODOS OS TESTES DE FLUXO PASSARAM ✅' : `${failures} FALHA(S) ❌`, '===');
  process.exit(failures === 0 ? 0 : 1);
})();
