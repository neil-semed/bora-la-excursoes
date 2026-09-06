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

Cada perfil só vê e faz o que pode:

| Tela | Admin | Escola | Pedagogia | Motorista |
|---|---|---|---|---|
| Dashboard | ✅ | ✅ (só da própria escola) | ✅ | ✅ (só as suas viagens) |
| Agenda | ✅ (tudo) | ✅ (só da própria escola) | ✅ (tudo) | ✅ (só as suas viagens) |
| Nova Solicitação | ✅ | ✅ | — | — |
| Veículos | ✅ | — | — | — |
| Motoristas | ✅ | — | — | — |
| Relatórios (PDF) | ✅ | — | ✅ | — |

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

### Já uso o sistema e só quero as novidades da Agenda (migração incremental)

Se seu projeto Supabase **já está em uso** (com contas e viagens reais cadastradas), **não rode o `schema.sql`
de novo** — ele é só para projetos novos. Em vez disso, abra o **SQL Editor**, cole todo o conteúdo de
[`supabase/migration_002_agenda_avancada.sql`](supabase/migration_002_agenda_avancada.sql) e clique em **Run**.
Esse arquivo só **adiciona** colunas/tabelas/políticas novas — não apaga nada do que já está cadastrado.

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
│   └── migration_002_agenda_avancada.sql  → migração incremental (projeto já em uso) com as novidades da Agenda
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
