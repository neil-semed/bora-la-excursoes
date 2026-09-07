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
  nome completo de quem de fato validou (não mais o nome genérico do perfil — veja a nota sobre `full_name` mais
  abaixo); mesma regra vale em todas as outras telas onde aparece quem deu o parecer (Validações, listagem por
  veículo etc.) — sempre o nome completo, nunca só o primeiro nome; nova ação **Cancelar** (distinta de Recusar),
  com motivo obrigatório, disponível pra Admin e pra Escola nas próprias viagens.
- **Nova Solicitação**: a "Escola solicitante" agora carrega as unidades cadastradas (tela **Unidades**, nova,
  só do Admin) e tem a opção **"Outra (não cadastrada)"**, que abre uma caixa para registrar nome/endereço/contato
  de quem está pedindo sem estar cadastrado; o **Turno não é mais escolhido manualmente** — é calculado sozinho a
  partir do horário de saída (Manhã até 11:59, Tarde até 17:59, Noite depois disso); "Nº de Passageiros" virou **"Nº de Alunos"**, e "Nº de Passageiros
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
  motivo), e dois gráficos dinâmicos (viagens por mês e por unidade solicitante), com filtro por mês/unidade. O
  filtro de **Mês** é um dropdown com o nome do mês por extenso (ex: "Setembro de 2026"), listando só os meses
  que de fato têm alguma viagem para aquele perfil — não é mais o seletor nativo de mês/ano do navegador (que só
  mostrava números). O filtro de **Unidade** não aparece pro perfil **Escola**: como ela já só vê as próprias
  solicitações (a Agenda e os gráficos dela já vêm escopados à própria unidade), um filtro pra "escolher outra
  unidade" não fazia sentido ali — continua aparecendo normalmente pro Admin e pra Pedagogia.

### Novidades desta versão: Cooperativas e envio de ATF/PCD por e-mail

Confirmado com você: quem emite a ATF é a própria cooperativa — o sistema **não gera o documento de ATF**, só
prepara e-mail com os dados e a listagem necessários, exatamente como já é feito hoje manualmente (usei como
modelo o e-mail real que você me mandou, do pedido de transporte PCD).

- **Cooperativas** (tela nova, só Admin, no menu "📨 Cooperativas"): cadastro de cada cooperativa com nome, e-mail
  e telefone. Cada motorista agora é ligado a uma cooperativa (no cadastro de Motoristas, no lugar do campo de
  texto livre de antes) — é esse vínculo que decide pra qual e-mail vai o pedido.
- **Configurações de envio** (mesma tela, no topo): nome e e-mail do setor de excursão, usados na assinatura do
  e-mail preparado. Fica registrado aqui, então se um dia mudar o e-mail do setor não precisa mexer em código.
- **Listagem de passageiros** (botão "📋 Lista" na Agenda, disponível pra Admin e pra Escola nas próprias viagens):
  nome + CI/CNH/CPF de cada passageiro, linha por linha — é essa lista que entra no e-mail de pedido de ATF. **A
  partir da versão com "Listagem por veículo" (veja a seção logo abaixo), esse botão simples só continua valendo
  pra viagens que não precisam de cooperativa** (dentro de Nova Lima, sem aluno PCD) — as demais passaram a usar o
  fluxo novo, por veículo.
- **Botão "✉️ Cooperativa"** (Admin, na Agenda): aparece quando a viagem precisa de ATF (destino fora de Nova
  Lima, depois que a pedagogia aprova) ou quando tem aluno PCD. Abre uma janela com o e-mail já pronto (destinatário,
  assunto e corpo, editáveis) — o texto do pedido de transporte PCD segue exatamente o modelo que você me mandou;
  o texto do pedido de ATF é um rascunho meu (não recebi um modelo real desse, só o de PCD — me avise se tiver um
  modelo diferente que eu ajusto). Tem um botão "Copiar texto" também, caso o "Abrir e-mail" não funcione direito
  no seu navegador/computador. Ao clicar em "Abrir e-mail", o sistema abre seu programa de e-mail padrão (Gmail,
  Outlook etc.) já preenchido — você só confere e clica em Enviar de lá; a viagem fica marcada com a data do envio
  (e o botão vira "Reenviar", caso precise mandar de novo). Continua disponível como envio manual a qualquer
  momento, mesmo depois que a listagem por veículo (seção abaixo) já tiver mandado o e-mail automaticamente.

### Novidades desta versão: Usuários, filtro por unidade e ajustes na Agenda

- **Usuários** (tela nova, só Admin, no menu "🔑 Usuários"): lista todo mundo que já acessou o sistema pelo menos
  uma vez, com um botão **Editar** para definir o **perfil** (Admin/Escola/Pedagogia/Motorista), a **unidade
  escolar**, o **motorista vinculado** ou o **setor pedagógico** (conforme o perfil escolhido) — tudo pela tela,
  sem precisar mais rodar `update profiles set role = ...` no SQL Editor a cada pessoa nova. O botão **"+ Novo
  usuário"** cria o login (e-mail + senha) e já define o perfil de uma vez só — isso depende de uma função de
  servidor (Edge Function) publicada no seu projeto Supabase; veja o passo a passo na seção 3 abaixo
  ("Publicar a função de criar usuários"). Enquanto ela não estiver publicada, o botão avisa e você pode
  continuar criando o login pelo painel do Supabase normalmente (**Authentication → Users → Add user**) e depois
  só editar o perfil pela tela.
- **Filtro por Unidade na Agenda Mestra** (Admin e Pedagogia): mesmo filtro que já existia no Dashboard, agora
  também na Agenda — escolha uma unidade escolar e a tabela carrega só as viagens dela.
- **Horários no formato hh:mm**: Saída e Retorno agora aparecem sempre como "08:00" (sem os segundos que o banco
  de dados guarda por baixo), tanto na Agenda quanto no Dashboard, no Excel exportado e nos e-mails preparados
  para a cooperativa.
- **Botões "📋 Lista"/"📋 Listagem" e "✉️ Cooperativa" só depois da validação completa**: como nem toda solicitação é aceita,
  não fazia sentido cobrar a listagem de passageiros antes da viagem passar pela Pedagogia **e** pelo Admin. Os
  dois botões agora só aparecem depois que a viagem está de fato aprovada (motorista já atribuído). Também
  corrigido um bug em que o botão "✉️ Cooperativa" podia não aparecer em viagens aprovadas antes desse ajuste —
  agora a necessidade de ATF é sempre recalculada a partir da cidade de destino, em vez de depender só de um
  campo que podia ficar desatualizado.
- **Nova Solicitação da Escola pula a Tela 1**: como a unidade solicitante da Escola já é fixa (é sempre a dela
  mesma), o wizard agora começa direto na Tela 2 (Destino) — a Tela 1 (escolha de unidade) só aparece para o
  Admin, que pode registrar em nome de qualquer unidade (inclusive "Outra").

### Novidades desta versão: Validações pedagógicas por documento (novo menu "🗂️ Validações")

Toda solicitação agora passa por uma validação pedagógica baseada em documento, além da aprovação que já existia.
Isso mudou o papel da Pedagogia na Agenda: ela **não edita mais nada diretamente lá** (nem a Situação, nem o
Aprovar/Recusar) — a Agenda só *reflete* o que o Admin fizer, e mostra "📋 Ver em Validações" enquanto uma
solicitação está pendente. O parecer de verdade agora é dado na tela **Validações**. O Admin continua podendo
aprovar/recusar direto pela Agenda também, como atalho, se preferir não passar pelo fluxo de documento.

**Como funciona:**

1. No wizard de Nova Solicitação, a Escola agora escolhe um **Público-alvo** (Educação Infantil / Ens.
   Fundamental - Anos Iniciais / Ens. Fundamental - Anos Finais / Ensino Médio / EJA - Adulto). Isso decide pra
   qual dos 6 setores pedagógicos a solicitação vai primeiro (veja o mapeamento mais abaixo).
2. Na tela **Validações** (perfil Escola), cada solicitação mostra o status do documento (Aguardando envio / Em
   análise / Correções solicitadas / Aprovado / Rejeitado) e um botão para **anexar o projeto pedagógico** (PDF
   ou Word). O arquivo vai para a pasta do Google Drive combinada, nomeado `data_unidade.extensão` — reenviar
   substitui o arquivo anterior com o mesmo nome.
3. Na tela **Validações** (perfil Pedagogia), qualquer uma das 6 "estâncias" (Educação Infantil, Ensino
   Fundamental, Étnico-Racial, Educação Inclusiva, Tempo Integral, Administração) vê as solicitações do seu
   setor (ou de todos, filtro "Todos os setores"), abre o documento numa pré-visualização dentro da própria tela
   e dá o parecer: **Aceitar** (a solicitação segue pro Admin, igual já acontecia), **Solicitar correções**
   (volta pra Escola com o comentário do que falta, sem reprovar) ou **Rejeitar** (com motivo obrigatório). Se a
   solicitação caiu no setor errado (ex: é de Educação Infantil, mas foi pro Ensino Fundamental), qualquer setor
   pode **encaminhar** para o setor certo, sem precisar decidir o parecer primeiro.
4. Mapeamento padrão do público-alvo pro setor responsável (a escola escolhe o público-alvo; o sistema já
   direciona automaticamente, mas qualquer setor pode encaminhar se estiver errado):

   | Público-alvo escolhido pela Escola | Setor pedagógico padrão |
   |---|---|
   | Educação Infantil | Educação Infantil |
   | Ens. Fundamental - Anos Iniciais / Anos Finais | Ensino Fundamental |
   | Ensino Médio / EJA - Adulto | Administração (não têm setor próprio - caem aqui até serem encaminhados, se for o caso) |

   Étnico-Racial, Educação Inclusiva e Tempo Integral não têm faixa etária própria — uma solicitação só chega
   neles através de um **encaminhamento manual** de quem analisar primeiro (é o cenário que você descreveu: um
   pedagogo do Ensino Fundamental percebe que o público é na verdade de Educação Infantil, e encaminha).
5. Defina o **setor pedagógico** de cada pessoa da Pedagogia na tela **Usuários** (campo que aparece quando o
   perfil escolhido é "Pedagogia") — é esse setor que abre pré-selecionado no filtro da tela Validações para
   ela, embora qualquer pessoa da Pedagogia possa trocar o filtro e ver/analisar solicitações de outro setor.
6. **Google Drive**: o upload de verdade pro Drive depende de um pequeno script (Google Apps Script) publicado
   com a sua própria conta do Google — veja o passo a passo em [`google-apps-script/README.md`](google-apps-script/README.md).
   Enquanto a URL desse script não estiver configurada (Admin, em Cooperativas → Configurações → "URL do Google
   Apps Script"), a tela Validações continua funcionando, mas o arquivo fica registrado só localmente (sem
   mandar de verdade pro Drive) — um aviso amarelo aparece pra deixar isso claro.
7. **"Liberada para escala"**: depois que a Pedagogia aceita e o Admin atribui motorista(s), a solicitação vira
   a mesma viagem "Aprovada"/"Confirmada" que você já vê na Agenda Mestra, com o botão "📋 Lista" liberado pra
   montar a listagem de passageiros — ou seja, o "esboço da tela final" que você pediu é a própria linha da
   Agenda, já com todas as informações consolidadas (documento aprovado, motorista/veículo, situação), sem
   precisar de uma tela extra separada.

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
| Agenda | ✅ (edita tudo) | ✅ (só da própria escola, pode cancelar) | ✅ (só visualiza - vê "📋 Ver em Validações" quando pendente) | ✅ (só as suas viagens) |
| Agenda por Data | — | — | — | ✅ (semana inteira ou hoje + 3 dias, agrupado por dia) |
| Nova Solicitação | ✅ | ✅ | — | — |
| Validações | — | ✅ (envia o projeto pedagógico) | ✅ (dá o parecer/encaminha) | — |
| KM Rodado | — | — | — | ✅ (registra o próprio odômetro e vê o próprio dashboard) |
| Unidades | ✅ | — | — | — |
| Veículos | ✅ | — | — | — |
| Motoristas | ✅ | — | — | — |
| KM dos Motoristas | ✅ (edita qualquer registro, relatórios) | — | — | — |
| Cooperativas | ✅ | — | — | — |
| Usuários | ✅ | — | — | — |
| Relatórios (PDF/Excel) | ✅ | — | ✅ | — |

### Novidades desta versão: Motorista - Agenda por Data, KM rodado e app instalável

- **🗓️ Agenda por Data** (novo menu, só Motorista): resolve o problema de sexta-feira - a "semana" do filtro
  normal da Agenda é presa ao calendário (domingo a sábado), então numa sexta ela termina na própria sexta e o
  motorista não vê a segunda-feira seguinte. Esta tela nova mostra as viagens agrupadas em cards por dia, com dois
  modos: **"Semana"** (a semana de calendário atual, igual ao filtro que já existia) e **"Hoje + 3 dias"** (uma
  janela móvel a partir de hoje - numa sexta, sempre alcança a segunda). Cada card de dia mostra as viagens
  daquele dia (ou "Nenhuma viagem atribuída"), com os mesmos botões de Iniciar/Concluir viagem da Agenda normal.
- **🛣️ KM Rodado** (novo menu, só Motorista): o motorista registra o odômetro no início do dia e de novo no fim
  do dia (um botão muda pro outro conforme o que já foi preenchido); o **km rodado é calculado sozinho** (não
  precisa fazer conta), com uma prévia em tempo real no próprio formulário antes de salvar. A tela também mostra
  estatísticas (km na semana, km no mês) e um **gráfico de km rodado por período** (últimos 7 dias / últimos 30
  dias / últimos 12 meses), reaproveitando o Chart.js que já é usado no Dashboard. Cada motorista só vê e edita os
  próprios registros (1 por dia).
- **🛣️ KM dos Motoristas** (novo menu, só Admin): mesma informação de todos os motoristas, com permissão pra
  **corrigir qualquer registro** (ex: o motorista digitou o odômetro errado) e filtros por **motorista**,
  **cooperativa** e **período** (data inicial/final) - com exportação em **PDF** e **Excel**, no mesmo padrão da
  tela Relatórios.
- **App instalável só do Motorista**: veja a seção "7. App instalável do Motorista" mais abaixo.
- **Atalho de odômetro na lateral**: o botão "📟 Registrar odômetro" agora também aparece fixo na lateral
  (embaixo, logo acima do "Sair"), só pro perfil Motorista — abre o registro direto, de qualquer tela, sem
  precisar entrar primeiro em "🛣️ KM Rodado". Pensado pro uso no celular: as duas ações mais repetidas do dia
  (registrar km e sair) ficam uma embaixo da outra, fáceis de alcançar com o polegar. A tela "🛣️ KM Rodado"
  continua no menu normal, com o histórico completo e o gráfico.

### Novidades desta versão: Listagem de passageiros por veículo (viagens pra fora de Nova Lima) e envio automático pra cooperativa

Você pediu: quando a viagem é pra fora de Nova Lima (ou tem aluno PCD), já foi aprovada pela pedagogia e já tem
motorista(s)/veículo(s) atribuído(s), a Escola deve preencher **uma listagem por veículo** (respeitando a
capacidade de cada um, sem precisar usar a capacidade toda), enviar, o Gestor conferir e aceitar ou rejeitar — se
aceitar, os dados seguem pra cooperativa correspondente por e-mail; se rejeitar, a Escola corrige e reenvia. Foi
exatamente isso que ficou pronto:

- **Só entra nesse fluxo quem precisa de cooperativa**: viagens dentro de Nova Lima e sem aluno PCD continuam
  exatamente como antes, com o botão "📋 Lista" simples (uma única listagem, sem separar por veículo). O botão
  muda pra "📋 Preencher listagem" (Escola) / "📋 Listagem" (Admin) só quando a viagem é fora de Nova Lima, tem
  ATF emitida, ou tem aluno PCD.
- **Uma listagem por veículo**: se o Gestor atribuiu, por exemplo, um micro-ônibus de 32 lugares e uma van de 15
  (exatamente o exemplo que você deu), a tela mostra os dois blocos separados, cada um com sua própria capacidade
  — a Escola preenche cada um à parte, e o sistema nunca deixa passar da capacidade daquele veículo específico.
  Não precisa preencher todos os lugares disponíveis, só o que for de fato usado.
- **Envio (📤 Enviar listagem)**: só a Escola pode preencher e enviar (nas próprias viagens), e só enquanto o
  status for "Aguardando envio" ou "Rejeitada". Ao enviar, o sistema gera um PDF por veículo e manda pro Google
  Drive (mesma pasta/script já configurado pros documentos da tela Validações — veja a seção 3, item "Google
  Drive") e muda o status pra "Enviada". **Não existe prazo/deadline nesse envio** — o Gestor confere quando tiver
  disponibilidade, sem contagem regressiva nem aviso de atraso.
- **Conferência do Gestor**: assim que a Escola envia, o botão na Agenda do Admin vira "📋 Revisar listagem 🔔".
  Abrindo, o Gestor vê a listagem de cada veículo (somente leitura — quem edita é sempre a Escola) e pode:
  - **✅ Aceitar**: o sistema tenta mandar um e-mail automático de verdade pra cooperativa correspondente a cada
    veículo (veja "Envio automático por e-mail" logo abaixo); se não conseguir (função ainda não publicada, ou
    sem e-mail cadastrado), abre o mesmo modal manual de sempre, já com o assunto/corpo prontos (destino,
    motorista, veículo e listagem de cada um) — você só confere e clica em "Abrir e-mail", igual ao fluxo que já
    existia.
  - **🚫 Rejeitar**: exige um comentário explicando o que precisa corrigir (igual ao parecer da Pedagogia). A
    Escola vê o motivo, corrige e reenvia — os dados já preenchidos não se perdem, só o status volta pra
    "Rejeitada" até o reenvio.
- **Envio automático por e-mail (opcional)**: criei uma nova Edge Function, `send-cooperativa-email`, que manda
  o e-mail de verdade (sem precisar abrir nenhum programa de e-mail) usando o serviço **Resend**
  (`https://resend.com`, tem plano gratuito). Enquanto ela não estiver publicada/configurada no seu projeto, o
  sistema cai automaticamente pro rascunho manual de sempre (o "Abrir e-mail" que já existia) — nada trava
  esperando isso. Pra publicar (uma vez só):
  1. Crie uma conta grátis em `https://resend.com` e pegue uma API key (Dashboard → API Keys → Create API Key)
  2. Se ainda não tiver feito os passos da Edge Function `admin-create-user` (seção 3), instale a Supabase CLI e
     rode `supabase login` e `supabase link --project-ref <ref-do-seu-projeto>`
  3. `supabase secrets set RESEND_API_KEY=re_xxxxxxxx`
  4. (opcional, recomendado) depois de verificar seu próprio domínio no Resend: `supabase secrets set
     RESEND_FROM="Excursão Semed <excursao@seudominio.com.br>"` — sem isso, os e-mails saem de um remetente de
     teste do próprio Resend (funciona, mas identifica como "teste" pra quem recebe)
  5. `supabase functions deploy send-cooperativa-email`
- **Histórico**: cada envio/reenvio/aceite/rejeição da listagem fica registrado no mesmo histórico que já existia
  pro projeto pedagógico (`excursion_doc_history`), agora com uma coluna a mais (`tipo`) pra distinguir
  "documento" de "listagem".
- **Migração do banco**: [`supabase/migration_007_listagem_por_veiculo.sql`](supabase/migration_007_listagem_por_veiculo.sql)
  (veja a seção 3).

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
3. Peça para a pessoa fazer o **primeiro login** no app (isso cria a linha dela na tabela `profiles`, com perfil
   "Escola" por padrão)
4. Como Admin, abra a tela **🔑 Usuários** no app, clique em **Editar** ao lado da pessoa e defina o perfil certo
   (Admin/Escola/Pedagogia/Motorista) e, conforme o perfil, a unidade escolar ou o motorista vinculado

> ⚠️ Como a tela "Usuários" só é visível para quem já é Admin, o **primeiro** administrador do sistema precisa
> ser promovido pelo SQL Editor mesmo (só essa vez — depois disso, todo o resto é feito pela tela):
> ```sql
> update profiles set role = 'admin' where email = 'admin@boralasemed.com.br';
> ```
> Esse UPDATE só funciona **depois** que a pessoa fizer o primeiro login no app pelo menos uma vez. Se preferir
> criar o perfil antes disso, veja o comentário no final do `schema.sql`.

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
2. [`supabase/migration_003_telas_admin.sql`](supabase/migration_003_telas_admin.sql) — telas do Admin (Unidades, PCD por aluno, recorrência, cancelamento, vencimento de CNH etc.)
3. [`supabase/migration_004_cooperativas_email.sql`](supabase/migration_004_cooperativas_email.sql) — Cooperativas (com e-mail), configurações de envio e listagem de passageiros para ATF. Essa migração já aproveita as cooperativas que você tiver digitado como texto livre em Motoristas/Veículos e liga automaticamente cada motorista à cooperativa certa — só falta você completar o e-mail de cada uma na tela "Cooperativas".
4. [`supabase/migration_005_validacoes.sql`](supabase/migration_005_validacoes.sql) — Validações pedagógicas por documento (público-alvo, setor pedagógico, status/parecer do documento e o histórico de encaminhamentos).
5. [`supabase/migration_006_motorista_km.sql`](supabase/migration_006_motorista_km.sql) — Registro de KM (odômetro) dos motoristas: tabela nova `driver_km_logs`, 1 linha por motorista por dia, com o km rodado calculado automaticamente.
6. [`supabase/migration_007_listagem_por_veiculo.sql`](supabase/migration_007_listagem_por_veiculo.sql) — Listagem de passageiros por veículo (viagens fora de Nova Lima/com PCD): status/parecer da listagem em `excursions`, `driver_id` em `excursion_passengers`, tabela nova `excursion_listagem_files` (arquivos enviados ao Drive, 1 por veículo) e a coluna `tipo` em `excursion_doc_history`.

Nenhuma delas apaga dados existentes — só adicionam colunas/tabelas/políticas novas.

### Publicar a função de criar usuários (Edge Function, opcional)

O botão **"+ Novo usuário"** da tela Usuários (cria login + perfil de uma vez) depende de uma pequena função de
servidor publicada no seu projeto Supabase. Sem ela, o botão continua ali mas avisa que não está disponível — e
você segue criando o login pelo painel do Supabase normalmente, editando o perfil depois pela tela.

Pra publicar (uma vez só):

1. Instale a [Supabase CLI](https://supabase.com/docs/guides/cli) (`npm install -g supabase` ou veja outras opções no link)
2. No terminal, dentro desta pasta do projeto: `supabase login` (abre o navegador pra autorizar)
3. `supabase link --project-ref <ref-do-seu-projeto>` (o `<ref>` aparece na URL do seu projeto no painel do Supabase, algo como `rjuzhscynuleypaewgak`)
4. `supabase functions deploy admin-create-user`

Pronto — não precisa configurar nenhuma variável de ambiente separada (a função já recebe automaticamente as
credenciais do seu projeto). Se um dia precisar reenviar depois de editar o código em
[`supabase/functions/admin-create-user/index.ts`](supabase/functions/admin-create-user/index.ts), repita só o
passo 4.

### Publicar o envio automático de e-mail pra cooperativa (Edge Function, opcional)

Veja o passo a passo completo na seção "Novidades desta versão: Listagem de passageiros por veículo..." mais
acima. Resumindo: cadastre uma API key grátis no Resend (`https://resend.com`), rode `supabase secrets set
RESEND_API_KEY=...` e depois `supabase functions deploy send-cooperativa-email`. Sem isso, o sistema continua
funcionando normalmente — só cai pro rascunho manual de e-mail (mesmo "Abrir e-mail" de sempre) em vez de mandar
sozinho.

### Corrigir o nome exibido na Validação Pedagógica

Se a coluna "Validação Pedagógica" está mostrando o nome do **perfil** (ex: "Pedagogia") em vez do nome da
**pessoa** que validou, é porque a conta ainda não tem um nome próprio cadastrado — por padrão o sistema usa o
que vem antes do "@" do e-mail. Para corrigir, rode no SQL Editor (trocando o e-mail e o nome pelos reais):

```sql
update profiles set full_name = 'Maria da Silva' where email = 'pedagogia@boralasemed.com.br';
```

Repita para cada conta cujo nome você quiser corrigir (inclusive admins). Depois disso, a Agenda e as demais telas
de validação/listagem passam a mostrar o nome completo dessa pessoa automaticamente, sem precisar mexer em nenhum
código.

---

## 4. Estrutura do projeto

```
bora-la-excursoes/
├── index.html            → página de login (separada do sistema) - todos os perfis
├── motorista.html          → mesma página de login, "com a casca" (nome/ícone/manifest) do app só do Motorista
├── app.html              → página do sistema (dashboard, agenda, wizard, veículos, motoristas, relatórios)
├── app.js               → toda a lógica (login, perfis, agenda, wizard, PDF...) — compartilhada por todas as páginas
├── manifest.json         → configuração do PWA do sistema inteiro (instalar como app)
├── manifest-motorista.json → configuração do PWA só do Motorista (nome/ícone diferentes, ver seção 7)
├── sw.js                 → não usado atualmente (cache offline do app inteiro - desativado, ver seção 7)
├── sw-motorista.js        → Service Worker mínimo, só do app do Motorista (sem cache de HTML/JS, ver seção 7)
├── assets/
│   ├── logo_bora-la.png  → logo original
│   ├── icon-192.png       → ícone do app (gerado a partir da logo)
│   └── icon-512.png       → ícone do app (gerado a partir da logo)
├── supabase/
│   ├── schema.sql                        → script que cria todo o banco de dados (projeto novo)
│   ├── migration_002_agenda_avancada.sql  → migração incremental (projeto já em uso) com as novidades da Agenda
│   ├── migration_003_telas_admin.sql      → migração incremental com as telas do Admin (Unidades, recorrência etc.)
│   ├── migration_004_cooperativas_email.sql → migração incremental com Cooperativas/e-mail de ATF e PCD
│   ├── migration_005_validacoes.sql       → migração incremental com Validações pedagógicas por documento
│   ├── migration_006_motorista_km.sql     → migração incremental com o registro de KM (odômetro) dos motoristas
│   ├── migration_007_listagem_por_veiculo.sql → migração incremental com a listagem de passageiros por veículo
│   └── functions/
│       ├── admin-create-user/index.ts    → Edge Function que cria login + perfil pela tela Usuários
│       └── send-cooperativa-email/index.ts → Edge Function que manda o e-mail automático pra cooperativa (Resend)
├── google-apps-script/
│   ├── Code.gs             → script que salva os documentos da tela Validações no Google Drive
│   └── README.md           → passo a passo de como publicar esse script
└── README.md              → este guia
```

> A partir desta versão, login e sistema são duas páginas separadas de verdade: fazer login em `index.html` navega para `app.html` (URL diferente), e o botão "Sair" navega de volta para `index.html`.

## 5. Instalar como aplicativo (PWA)

**No celular (Android/iOS):** acesse a URL do GitHub Pages pelo Chrome/Safari → menu → "Adicionar à tela inicial".

**No computador (Chrome/Edge):** acesse a URL → clique no ícone de instalação que aparece na barra de endereço.

Isso instala o **sistema inteiro** (todos os perfis), com o nome/ícone "Bora Lá". Se você quer um atalho separado
só pro Motorista (com nome/ícone próprios, ou até um `.apk` de verdade pra distribuir por link), veja a seção 7.

## 7. App instalável do Motorista (baixar por link, sem loja de aplicativos)

Você pediu pra eu pensar em como transformar só o menu do Motorista num "app" que dá pra baixar por um link, sem
passar por loja de aplicativo (Play Store/App Store) e sem você precisar saber escolher entre as opções técnicas -
então aqui vai o resumo de que a Bora Lá já entrega **as duas coisas**, prontas:

**Opção A - Atalho instalável (PWA), pronto pra usar hoje, Android e iPhone:**
Existe agora um arquivo `motorista.html` - é a mesma tela de login de sempre, só que com nome ("Bora Lá -
Motorista") e ícone próprios, e seu próprio "manifesto" (`manifest-motorista.json`). Manda esse link
(`https://SEU-USUARIO.github.io/bora-la-excursoes/motorista.html`) pros motoristas: no Android (Chrome), ao abrir
o link aparece um aviso pra "Instalar app" ou "Adicionar à tela inicial"; no iPhone (Safari), é pelo botão de
Compartilhar → "Adicionar à Tela de Início". Depois de instalado vira um ícone próprio na tela do celular, abre em
tela cheia (sem barra de endereço do navegador) e continua puxando os dados de sempre (mesmo login, mesmo banco).
Não depende de loja de aplicativo, não tem taxa, não tem conta de desenvolvedor pra criar - é a opção mais simples
e já está pronta. Único requisito técnico (também já resolvido): pra o Android considerar o site "instalável de
verdade" e mostrar aquele aviso, precisa de um Service Worker ativo - por isso criei o `sw-motorista.js`,
propositalmente **sem cache nenhum de HTML/JS** (só guarda os ícones), pra nunca reproduzir o problema que fez a
gente desligar o Service Worker do app inteiro (motoristas ficarem presos numa versão antiga do sistema sem
perceber). Esse Service Worker só é usado por quem entra via `motorista.html` - o resto do sistema continua
exatamente como está, sem nenhum cache.

**Opção B - Arquivo `.apk` de verdade pra baixar e instalar no Android (além da Opção A):**
Se além do atalho você quiser um arquivo `.apk` "de verdade" pra mandar por link (sensação mais parecida com
baixar um app de loja), dá pra gerar um usando a ferramenta gratuita **PWABuilder** (`https://www.pwabuilder.com`,
mantida pelo time do Bing/Microsoft, usa o mesmo empacotador de código aberto do Google - o Bubblewrap). Passo a
passo, depois que o site já estiver publicado no GitHub Pages:

1. Acesse `https://www.pwabuilder.com`, cole a URL `https://SEU-USUARIO.github.io/bora-la-excursoes/motorista.html`
   e clique em analisar.
2. A ferramenta confere o `manifest-motorista.json` e o `sw-motorista.js` (os dois já estão prontos no projeto) e
   mostra um placar - normalmente já vem "pronto" ou perto disso, sem precisar editar nada.
3. Clique em "Package for Stores" → escolha **Android** → baixe o pacote gerado.
4. Dentro do pacote vem um arquivo `.apk` (ou `.aab`, converta pra `.apk` se precisar - a própria ferramenta indica
   como) - **guarde a chave de assinatura (`signing key`) que ela gera num lugar seguro**: é ela que garante que
   uma futura atualização do app é reconhecida como "a mesma", sem os motoristas precisarem desinstalar e
   reinstalar. Perder essa chave significa ter que distribuir o app de novo do zero pra todo mundo.
5. Suba esse `.apk` num link de download (Google Drive, seu próprio site, etc.) e mande pros motoristas. No
   Android, pra instalar por fora da Play Store, a pessoa precisa aceitar uma vez a permissão "Instalar apps de
   fontes desconhecidas" (o próprio celular pede isso na hora de abrir o arquivo baixado) - não precisa de conta
   de desenvolvedor nem de publicar na Play Store pra esse tipo de distribuição direta.

**Sobre o iPhone:** não existe hoje um jeito equivalente de instalar um app "de verdade" (tipo `.apk`) fora da App
Store - a Apple não libera isso (mesmo a obrigação que a Europa criou pra isso só vale lá, não se aplica ao
Brasil). A Opção A (atalho instalável, "Adicionar à Tela de Início") funciona igual no iPhone e continua sendo
gratuita e sem loja - só não tem a sensação de "instalar um `.apk`" que o Android permite.

**Resumindo o que já está pronto no projeto**, sem você precisar decidir nada:

| | O que é | Onde já está pronto | Custo/esforço |
|---|---|---|---|
| Opção A | Atalho instalável (PWA) | `motorista.html` + `manifest-motorista.json` + `sw-motorista.js` (prontos) | R$ 0 - já funciona hoje, Android e iPhone |
| Opção B | `.apk` Android de verdade | Gerado pelo PWABuilder a partir do mesmo `motorista.html` (passo a passo acima) | R$ 0 - só o cuidado de guardar a chave de assinatura; só Android |

## 8. Próximos passos sugeridos

- Cadastrar as escolas reais de Nova Lima na tabela `schools` (substituindo os exemplos)
- Cadastrar a frota e os motoristas reais nas telas Veículos/Motoristas
- Cadastrar as cooperativas reais (com o e-mail certo de cada uma) na tela Cooperativas, e o nome/e-mail do setor
  de excursão nas Configurações de envio, logo acima
- Criar um domínio próprio (ex: `excursoes.novalima.mg.gov.br`) apontando para o GitHub Pages, se desejar
- Rodar a [`migration_007_listagem_por_veiculo.sql`](supabase/migration_007_listagem_por_veiculo.sql) (ver seção
  3) pra habilitar a listagem de passageiros por veículo nas viagens fora de Nova Lima/com PCD
- Publicar a Edge Function `send-cooperativa-email` (veja a seção 3) se quiser que o e-mail pra cooperativa saia
  automaticamente ao aceitar a listagem, em vez de cair sempre pro rascunho manual
- Publicar o script do Google Apps Script (veja [`google-apps-script/README.md`](google-apps-script/README.md))
  e colar a URL em Cooperativas → Configurações, pra os documentos da tela Validações irem de fato pro Drive
- Publicar a Edge Function `admin-create-user` (veja a seção 3 acima) se quiser criar logins novos direto pela
  tela Usuários, sem depender do painel do Supabase
- Definir o **setor pedagógico** de cada pessoa da Pedagogia na tela Usuários, pra tela Validações já abrir
  filtrada no setor de cada uma
- Rodar a [`migration_006_motorista_km.sql`](supabase/migration_006_motorista_km.sql) (ver seção 3) pra habilitar
  o registro de KM dos motoristas
- Pedir pros motoristas registrarem o odômetro todo dia (início e fim) - é isso que alimenta o dashboard de km
  rodado e os relatórios do Admin
- Se quiser, mandar o link de `motorista.html` pros motoristas pra eles instalarem o atalho na tela inicial do
  celular (ou gerar o `.apk` pelo PWABuilder) - veja a seção 7
