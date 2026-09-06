# 🚌 Bora Lá - Excursões

Sistema de gestão de excursões escolares da Semed - Nova Lima (MG).

Perfis de acesso: **Admin** (Semed), **Escola** (solicita viagens), **Pedagogia** (aprova pedagogicamente) e **Motorista** (executa as viagens atribuídas a ele).

## Fluxo de aprovação

```
Escola solicita  →  Pedagogia aprova/recusa  →  Admin aprova e atribui motorista(s)  →  Motorista inicia e conclui a viagem
   (pending)          (pedagogy_approved / rejected)         (approved)                        (in_transit → completed)
```

Esse fluxo acima é o que controla os **botões de ação** da Agenda (Aprovar/Recusar/Atribuir/Iniciar/Concluir).
Em paralelo, a coluna **Situação** (visível pra admin, pedagogia e escola) é um dropdown editável direto na
tabela — igual à planilha usada hoje — com estes valores: `Sem Validação`, `Aguarda ATF`, `Aprovada`, `Confirmada`,
`Envio Coop`, `Reprovada`, `Cancelada`, `Sem Listagem`. Ela começa em "Sem Validação" e é ajustada automaticamente
para "Aguarda ATF" (se o destino for fora de Nova Lima) ou "Aprovada" quando a pedagogia aprova, e para "Reprovada"
quando é recusada — mas depois disso admin/pedagogia podem mudá-la livremente pelo dropdown (ex: marcar "Confirmada",
"Envio Coop" etc.), assim como a coluna **ATF** (`Não Precisa` / `Não Emitida` / `Emitida`). As etapas "Em trânsito"
e "Concluída" continuam sendo controladas só pelos botões do motorista, pois não têm equivalente na lista de Situação.

### Novidades desta versão: Agenda avançada

- **Unidade**: além de escolas que pedem direto pelo site, agora dá pra cadastrar "entidades" (associações etc.)
  que pedem por e-mail e o admin registra a solicitação em nome delas (campo `tipo` em Unidades).
- **Motorista dono do veículo**: cada motorista tem um veículo vinculado (cadastrado na tela Motoristas) e dirige
  sempre esse mesmo veículo — não existe mais um dropdown solto de "veículo" na hora de atribuir uma viagem.
- **Múltiplos motoristas por viagem**: a tela Agenda agora permite marcar mais de um motorista na mesma viagem
  (cada um com a capacidade do próprio veículo mostrada ao lado do nome).
- **Colunas novas na Agenda**: Origem (nome + endereço cadastrado), Destino (nome + endereço), Passageiros (com
  detalhe de quantos são PCA e quantos Apoios), Turno, Data do pedido e nome do solicitante, Data da validação
  pedagógica e nome (primeiro nome) de quem validou, Lista Escola (checkbox), Envio Coop (data), ATF e Situação
  (dropdowns coloridos, iguais à planilha usada hoje).
- **Filtro por período**: além de filtrar por um dia específico, dá pra carregar a semana ou o mês inteiro.
- **Wizard de solicitação**: ganhou os campos Turno, endereço do destino, Nº de Passageiros PCA e Nº de Apoios.

### Novidades desta versão: telas do Admin

- **Agenda Mestra**: colunas separadas de **Saída** e **Retorno** (antes só existia uma coluna de horário); a
  coluna Passageiros agora mostra o **total somado** (alunos + acompanhantes + alunos PCD + apoios) com o
  detalhamento embaixo; **PCA foi renomeado para PCD** em todo o sistema; a **Validação Pedagógica** mostra o
  primeiro nome de quem de fato validou (não mais o nome genérico do perfil — veja a nota sobre `full_name` mais
  abaixo); nova ação **Cancelar** (distinta de Recusar), com motivo obrigatório, disponível pra Admin e pra Escola
  nas próprias viagens.
- **Nova Solicitação**: a "Escola solicitante" agora carrega as unidades cadastradas (tela **Unidades**, nova,
  só do Admin) e tem a opção **"Outra (não cadastrada)"**, que abre uma caixa para registrar nome/endereço/contato
  de quem está pedindo sem estar cadastrado; o **Turno não é mais escolhido manualmente** — é calculado sozinho a
  partir do horário de saída (Manhã até 11:59, Tarde até 17:59, Noite depois disso — **ajustável** se quiser
  outros horários de corte, é só me avisar); "Nº de Passageiros" virou **"Nº de Alunos"**, e "Nº de Passageiros
  PCA" virou **"Nº de Alunos PCD"** — ao informar algum, abre um cadastro por aluno (nome, se é cadeirante, nome
  do apoio); o "Tipo de evento" ganhou as opções **Continuado semanal/quinzenal/mensal**: ao marcar uma delas,
  você escolhe os dias da semana e uma data final, e o sistema cria automaticamente **uma linha independente na
  Agenda para cada ocorrência** (dá pra cancelar uma sem mexer nas outras). Aprovar a 1ª ocorrência da pedagogia
  aprova a série inteira de uma vez.
- **Motoristas**: campo de **Vencimento da CNH** (com aviso visual quando estiver vencida) e os cadastros já
  existentes agora podem ser **editados**.
- **Veículos**: também podem ser **editados** agora (antes só dava para cadastrar).
- **Unidades** (tela nova, só Admin): cadastro de escolas/entidades com nome, tipo, endereço, e-mail e telefone —
  com edição.
- **Relatórios**: ganhou filtros próprios (período e unidade solicitante) e um botão de **exportar em Excel**,
  além do PDF que já existia.
- **Dashboard**: novos cartões de **Canceladas** e **Desaprovadas** (este último já com o detalhamento por
  motivo), e dois gráficos dinâmicos (viagens por mês e por unidade solicitante), com filtro por mês/unidade.

Regras de validação/cancelamento combinadas com você:

- Toda viagem nasce **"Sem Validação"**. Só o Admin pode marcar como validada direto; caso contrário, cabe à
  Pedagogia avaliar (aprovar/recusar).
- Recusar tem motivo obrigatório, escolhido de uma lista (Falta de dados / Fora do calendário letivo / Falta de
  veículo-motorista disponível / Documentação pendente / Outro, com campo de texto pro "Outro").
- Cancelar (Escola ou Admin, só nas próprias viagens no caso da Escola) também tem motivo obrigatório: Não haverá
  mais a viagem / Mudança de data / Outro.
- Numa série recorrente, cada ocorrência pode ser cancelada **independentemente** das demais — só a aprovação da
  pedagogia é que se propaga pra série toda de uma vez.

Cada perfil só vê e faz o que pode:

| Tela | Admin | Escola | Pedagogia | Motorista |
|---|---|---|---|---|
| Dashboard | ✅ | ✅ (só da própria escola) | ✅ | ✅ (só as suas viagens) |
| Agenda | ✅ (tudo) | ✅ (só da própria escola, pode cancelar) | ✅ (tudo) | ✅ (só as suas viagens) |
| Nova Solicitação | ✅ | ✅ | — | — |
| Unidades | ✅ | — | — | — |
| Veículos | ✅ | — | — | — |
| Motoristas | ✅ | — | — | — |
| Relatórios (PDF/Excel) | ✅ | — | ✅ | — |

---

## 1. Testar agora, sem instalar nada (modo demonstração)

Abra o `index.html` (ou a URL do GitHub Pages depois do deploy) e faça login com **qualquer senha** e um e-mail contendo uma destas palavras, para entrar com o perfil correspondente:

- `admin@teste.com` → perfil Admin
- `escola@teste.com` → perfil Escola
- `pedagogia@teste.com` → perfil Pedagogia
- `motorista@teste.com` → perfil Motorista

Nesse modo os dados ficam só na memória do navegador (não salvam ao recarregar a página) — é só para você ver as telas e o fluxo funcionando antes de configurar o Supabase.

---

## 2. Publicar no GitHub Pages (grátis)

Você já tem o Git instalado neste computador. No terminal (PowerShell, CMD ou Git Bash), dentro desta pasta (`bora-la-excursoes`), rode:

```bash
git init
git add .
git commit -m "Primeira versão do Bora Lá - Excursões"
```

Agora crie o repositório no GitHub (pelo navegador):

1. Acesse https://github.com/new
2. Nome do repositório: `bora-la-excursoes` (pode escolher outro nome)
3. Deixe **público** (necessário para o GitHub Pages grátis) e **não** marque nenhuma opção de criar README/.gitignore
4. Clique em **Create repository**

O GitHub vai te mostrar comandos parecidos com estes — copie exatamente os que aparecerem na sua tela (o usuário/nome do repositório pode variar):

```bash
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/bora-la-excursoes.git
git push -u origin main
```

Depois do push:

1. No GitHub, vá em **Settings → Pages**
2. Em "Source", selecione **Deploy from a branch**, branch `main`, pasta `/ (root)`
3. Salve. Em ~1 minuto seu app estará em `https://SEU-USUARIO.github.io/bora-la-excursoes/`

### Atualizações futuras

Sempre que eu (ou você) alterar algo, os comandos para publicar de novo são:

```bash
git add .
git commit -m "descreva o que mudou"
git push
```

---

## 3. Configurar o Supabase (banco de dados + login)

1. Crie uma conta grátis em https://supabase.com e clique em **New project**
2. Anote a senha do banco que você definir (guarde em local seguro)
3. Espere o projeto terminar de criar (~2 min)
4. No menu lateral, abra o **SQL Editor** → **New query**
5. Abra o arquivo [`supabase/schema.sql`](supabase/schema.sql) desta pasta, copie **todo o conteúdo** e cole no SQL Editor
6. Clique em **Run**. Isso cria todas as tabelas, as regras de segurança (RLS) por perfil, e alguns dados de exemplo (escolas, veículos, motoristas)

### Criar os usuários (login)

1. No menu lateral do Supabase: **Authentication → Users → Add user**
2. Crie um usuário para cada pessoa que vai usar o sistema (ex: `admin@boralasemed.com.br`), marcando **Auto Confirm User**
3. Volte no **SQL Editor** e rode um comando para cada pessoa, definindo o perfil dela. Exemplos (troque o e-mail pelo que você cadastrou):

```sql
-- vira administrador do sistema:
update profiles set role = 'admin' where email = 'admin@boralasemed.com.br';

-- vira usuário de uma escola específica:
update profiles set role = 'escola',
  school_id = (select id from schools where name = 'EMEF Prof. João Silva')
  where email = 'escola@boralasemed.com.br';

-- vira pedagogia:
update profiles set role = 'pedagogia' where email = 'pedagogia@boralasemed.com.br';

-- vira motorista (precisa já existir na tabela drivers):
update profiles set role = 'motorista',
  driver_id = (select id from drivers where name = 'João Silva')
  where email = 'motorista@boralasemed.com.br';
```

> ⚠️ Rode esse UPDATE **depois** que a pessoa fizer o primeiro login no app pelo menos uma vez — é o primeiro login que cria a linha dela na tabela `profiles`. Se preferir criar antes, veja o comentário no final do `schema.sql`.

### Ligar o app ao seu Supabase

A URL e a chave do projeto Supabase já vêm embutidas em `app.js` (constantes `DEFAULT_SUPABASE_URL` e
`DEFAULT_SUPABASE_ANON_KEY`, no topo do arquivo) — não existe mais uma tela de configuração no login. Se um dia
for preciso apontar o app para outro projeto Supabase, é só editar essas duas constantes em `app.js` e publicar
de novo. Sem isso configurado, o app funciona sozinho no **modo demonstração** (dados só na memória do navegador).

### Já uso o sistema e só quero as novidades (migração incremental)

Se seu projeto Supabase **já está em uso** (com contas e viagens reais cadastradas), **não rode o `schema.sql`
de novo** — ele é só para projetos novos. Em vez disso, abra o **SQL Editor** e rode, **nesta ordem**, cada um
desses arquivos que você ainda não tiver rodado (pode rodar todos de novo sem problema — são idempotentes, ou
seja, só adicionam o que ainda não existe):

1. [`supabase/migration_002_agenda_avancada.sql`](supabase/migration_002_agenda_avancada.sql) — Agenda avançada (se ainda não rodou)
2. [`supabase/migration_003_telas_admin.sql`](supabase/migration_003_telas_admin.sql) — telas do Admin desta versão (Unidades, PCD por aluno, recorrência, cancelamento, vencimento de CNH etc.)

Nenhum dos dois apaga dados existentes — só adicionam colunas/tabelas/políticas novas.

### Corrigir o nome exibido na Validação Pedagógica

Se a coluna "Validação Pedagógica" está mostrando o nome do **perfil** (ex: "Pedagogia") em vez do nome da
**pessoa** que validou, é porque a conta ainda não tem um nome próprio cadastrado — por padrão o sistema usa o
que vem antes do "@" do e-mail. Para corrigir, rode no SQL Editor (trocando o e-mail e o nome pelos reais):

```sql
update profiles set full_name = 'Maria da Silva' where email = 'pedagogia@boralasemed.com.br';
```

Repita para cada conta cujo nome você quiser corrigir (inclusive admins). Depois disso, a Agenda passa a mostrar
o primeiro nome dessa pessoa automaticamente, sem precisar mexer em nenhum código.

---

## 4. Estrutura do projeto

```
bora-la-excursoes/
├── index.html          → página de login (separada do sistema)
├── app.html              → página do sistema (dashboard, agenda, wizard, veículos, motoristas, relatórios)
├── app.js               → toda a lógica (login, perfis, agenda, wizard, PDF...) — compartilhada pelas duas páginas
├── manifest.json         → configuração do PWA (instalar como app)
├── sw.js                 → cache offline (PWA)
├── assets/
│   ├── logo_bora-la.png  → logo original
│   ├── icon-192.png       → ícone do app (gerado a partir da logo)
│   └── icon-512.png       → ícone do app (gerado a partir da logo)
├── supabase/
│   ├── schema.sql                        → script que cria todo o banco de dados (projeto novo)
│   ├── migration_002_agenda_avancada.sql  → migração incremental (projeto já em uso) com as novidades da Agenda
│   └── migration_003_telas_admin.sql      → migração incremental com as novidades desta versão (telas do Admin)
└── README.md              → este guia
```

> A partir desta versão, login e sistema são duas páginas separadas de verdade: fazer login em `index.html` navega para `app.html` (URL diferente), e o botão "Sair" navega de volta para `index.html`.

## 5. Instalar como aplicativo (PWA)

**No celular (Android/iOS):** acesse a URL do GitHub Pages pelo Chrome/Safari → menu → "Adicionar à tela inicial".

**No computador (Chrome/Edge):** acesse a URL → clique no ícone de instalação que aparece na barra de endereço.

## 6. Próximos passos sugeridos

- Cadastrar as escolas reais de Nova Lima na tabela `schools` (substituindo os exemplos)
- Cadastrar a frota e os motoristas reais nas telas Veículos/Motoristas
- Criar um domínio próprio (ex: `excursoes.novalima.mg.gov.br`) apontando para o GitHub Pages, se desejar
- Adicionar notificação por e-mail quando uma solicitação for aprovada/recusada (pode ser feito depois com Supabase Edge Functions)
