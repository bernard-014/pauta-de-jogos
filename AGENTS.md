# AGENTS.md: handoff do projeto Pauta de Jogos

Este arquivo é a memória compartilhada entre os agentes que trabalham neste projeto (Claude Code, Codex ou qualquer outro). O usuário alterna entre eles quando acaba o limite de um, então **quem chegar aqui precisa conseguir continuar o trabalho só com este arquivo e o repositório**.

---

## ⚠️ Regra nº 1: mantenha este arquivo atualizado

**Toda vez que você terminar uma tarefa que mudou alguma coisa, atualize este arquivo antes de encerrar.** Isso vale para mudanças no código, no n8n, no Airtable, no ambiente (instalações, configs, MCPs, credenciais), nas decisões de projeto e nos pedidos novos do usuário.

Como fazer:
1. Ajuste as seções que ficaram desatualizadas (estado atual, nós do n8n, tabelas, pendências etc.). Este arquivo descreve **como as coisas estão agora**, não como estavam.
2. Acrescente uma entrada no [Registro de mudanças](#registro-de-mudanças) no fim: data, agente (ex.: "Claude Code", "Codex"), o que foi feito, o que ficou pendente e onde (commit, branch, n8n publicado ou não).
3. Se a mudança foi commitada, inclua a atualização deste arquivo **no mesmo commit**.
4. Se você parar no meio (limite, erro, usuário mudou de assunto), registre o que ficou pela metade em [Trabalho em andamento](#trabalho-em-andamento) para o próximo agente continuar.
5. Antes de começar qualquer tarefa, leia este arquivo inteiro e rode `git status`, `git log --oneline -5` e `git fetch`. Pode haver trabalho de outro agente que ainda não foi registrado aqui, inclusive de uma sessão na nuvem numa branch do GitHub (ver [Trabalho na nuvem](#trabalho-na-nuvem-sessões-pelo-celular)).

O próximo agente pode ser outro modelo, sem acesso à sua conversa nem à sua memória. Se não estiver escrito aqui ou no repositório, ele não sabe.

---

## Quem é o usuário e como trabalhar com ele

- **Bernard**, brasileiro. Escreva **sempre em português do Brasil**, de forma clara e direta.
- O projeto é de **portfólio** para uma vaga que pede n8n, Airtable, LLM, fluxo agêntico e documentação (contexto: CazéTV / 365Scores). O usuário quer **entender cada etapa para explicar na entrevista**: explique o porquê das decisões, não só o que foi feito.
- **Tudo tem que ser gratuito.** Não proponha serviço pago.
- Ele gosta de ir **uma etapa por vez**. Teste com **dados reais** antes de dizer que funciona.
- **Nunca leia nem cole segredos** (`.env`, tokens, chaves) no chat. Para escrever no Airtable ou chamar APIs com chave, use as **credenciais que já estão no n8n** (ver [Como escrever no Airtable](#como-escrever-no-airtable)).
- **Commit e push só quando ele pedir.** Na `main`, crie uma branch antes de commitar e pergunte se pode juntar e fazer push. Ele já autorizou `merge --ff-only` na `main` seguido de push quando pede para "juntar e fazer push".
- Ideias novas que ele trouxer e que não forem feitas na hora vão para o [`ROADMAP.md`](ROADMAP.md).
- Ações com efeito externo, como rodar o fluxo inteiro (manda mensagem real no Telegram e grava no Airtable), **só com o OK dele**. Em geral ele mesmo clica em "Execute workflow" no n8n.

---

## O projeto em uma frase

Todo dia às 7h, um fluxo no **n8n** busca os jogos do dia (futebol, NFL, NBA) e os desfalques de cada time, pede ao **Gemini** uma nota de 1 a 5, um briefing e os desfalques relevantes de cada jogo, aplica regras de corte configuradas no **Airtable**, grava tudo na tabela Jogos do Airtable e manda a pauta numa mensagem do **Telegram**.

Documentação para humanos: [`README.md`](README.md) (arquitetura, decisões, como rodar) e [`docs/MANUAL.md`](docs/MANUAL.md) (manual para a produção, estrutura do Airtable). Este arquivo complementa os dois com o que um agente precisa para operar.

---

## Estado atual (atualize sempre)

_Última atualização: 2026-10-18, Claude Code (workflow "Como foram os jogos")._

| O quê | Situação |
|---|---|
| Fluxo principal no n8n | Ativo e publicado. Agenda às 7h (horário de Brasília). |
| Futebol (football-data + ESPN Europa League) | Pronto, commitado. |
| NFL (ESPN) | Pronto, commitado (`69c64a4`), aplicado no n8n e no Airtable. |
| NBA (ESPN) | Pronto, commitado (`69c64a4`), aplicado no n8n e no Airtable. Testado com jogos de pré-temporada. |
| Fontes em paralelo + Merge "Juntar fontes" | Pronto, commitado. |
| Mensagem única no Telegram | Pronto, commitado. Só divide acima de 4096 caracteres. |
| Janela da pauta 6h–6h | Pronto, commitado. |
| Desfalques (lesões/suspensões) | Restaurados `ESPN NFL lesões` e `ESPN NBA lesões` (HTTP), Merge com 7 entradas e leitura das respostas completas. **Aplicado e confirmado na versão publicada do n8n** em 16/10/2026. Validação sem erros; teste local com lesões reais e jogos simulados aprovado. Falta conferir uma execução completa pelo usuário. Usuário prefere manter ~10 MB por execução. Coluna `Desfalques` já existe no Airtable; futebol ainda depende da credencial `API-Football` e de teste real. |
| Transmissão (365Scores) | Implementada em 16/10/2026: 5 nós depois de `Selecionar jogos`, linha 📺 na mensagem e coluna `Transmissão` no Airtable (criada). **Aplicado e publicado no n8n**, validação sem erros. **Confirmado pelo usuário na execução 31** (linha 📺 apareceu). Commitado e enviado para a `main`. |
| Bot que responde perguntas (AI Agent) | Criado em 17/10/2026: workflow `Bot da Pauta` (ativo) + subfluxos `Bot - pauta do dia` e `Bot - placar ESPN` (publicados). Texto e áudio testados de verdade (execuções 36, 38 e 49: transcrição correta, resposta com 🎤). Commitado (`91c97ed`) e enviado para a `main`. |
| Modelo de reserva (Nemotron via OpenRouter) | Implementado em 17/10/2026: IF `Gemini respondeu?` + HTTP `Nemotron (reserva)` entre `Gemini` e `Selecionar jogos`. **Aplicado e publicado no n8n**, validação sem erros. Testado direto na API e localmente (3 cenários). Commitado na `main` com push. Falta uma execução real em que o Gemini falhe. |
| Como foram os jogos (resultado × nota) | Criado em 18/10/2026: workflow `Como foram os jogos` (`rkBpz5jBl3ncIfdX`), **ativo** (gatilho das 6h30 ligado em 18/10/2026, a pedido do usuário). Colunas `Placar`, `Nota do jogo`, `Como foi` e `Acerto da nota` criadas na tabela Jogos. Testado localmente (16/10 e 17/10, Gemini falhando, dia sem pauta) e **rodado de verdade pelo usuário na execução 108**: mensagem enviada, 15 jogos gravados no Airtable sem apagar as colunas da pauta. Commitado na branch `como-foram-os-jogos` (falta juntar na `main` e fazer push). |
| Repositório GitHub | `bernard-014/pauta-de-jogos`, **privado**, `main` sincronizada com o GitHub (confira com `git log --oneline -3`; correção dos desfalques da NBA e novo `start-n8n.ps1` já enviados). |

### Trabalho em andamento

- Reversão aplicada e publicada em `Fb91kahwaHwrAQwV`. **Causa de "NBA sem lesões" achada em 2026-10-16**: o nó `ESPN NBA lesões` funcionava (4 a 9 desfalques por time chegavam ao Gemini), mas o `gemini-flash-lite-latest` devolvia `desfalques` vazio em todos os jogos, porque quase tudo na pré-temporada é "Rest" (poupado) e o prompt mandava ignorar quem não é relevante. Corrigido (prompt mais inclusivo + "Rest" traduzido para "poupado (descanso)" + dedupe dos desfalques repetidos da API-Football), aplicado e publicado no n8n. **Confirmado pelo usuário na execução 29: a linha 🚑 aparece nos jogos da NBA** (estrelas "poupado"). A execução 28 caiu em erro 503 do Gemini (alta demanda) mesmo com retry e saiu só com nota pelo peso; ideia: mais tentativas ou modelo de reserva.
- Ideia pendente: buscar lesões só dos times dos jogos selecionados. Medido: `.../injuries?team=<id>` funciona na ESPN (~45 KB por time na NBA, ~270 KB na NFL; formato = lista plana `injuries`, sem agrupar por time), mas buscar os times de todos os jogos do dia dá o mesmo volume da chamada única. Só economiza se for feito depois da seleção, o que exige uma segunda chamada ao Gemini só para desfalques (a nota hoje depende deles). Não implementado.

---

## Ambiente

- **Windows 11**, pasta do projeto `D:\Bernard\projetos\telegram-daily-games-resume`. Shell principal: PowerShell 5.1 (também há Git Bash).
- **n8n local** instalado em `D:\n8n`, rodando com o **Node 24 portátil** em `D:\n8n\runtime\node-v24.22.0-win-x64`. O Node 26 do sistema não é suportado pelo n8n.
  - Subir: `.\start-n8n.ps1` na raiz do projeto, que abre em http://localhost:5678.
  - O script carrega o `.env`, usa `.\.n8n` como pasta de dados (workflows, credenciais, SQLite; ignorada pelo git), define `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` (libera `{{ $env.X }}` nos nós) e fixa o fuso `America/Sao_Paulo`.
  - O script também liga a limpeza do histórico: `EXECUTIONS_DATA_PRUNE=true`, `EXECUTIONS_DATA_MAX_AGE=168` (7 dias) e `DB_SQLITE_VACUUM_ON_STARTUP=true`. Só valem depois de reiniciar o n8n pelo script.
  - O gatilho das 7h só dispara com o PC ligado e o n8n rodando.
- **`.env`** (nunca leia, nunca commite): `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `FOOTBALL_DATA_TOKEN`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, `AIRTABLE_TOKEN`, `AIRTABLE_BASE_ID`. O nó `Nemotron (reserva)` lê `OPENROUTER_API_KEY` por `$env` (não há credencial no n8n), então o n8n precisa ter sido iniciado pelo `start-n8n.ps1` depois de a chave entrar no `.env`. Para testar a chave fora do n8n sem exibi-la, um script Node que lê o `.env` e chama a API funciona. O modelo está em `.env.example`.
- **MCP do n8n (Claude Code)**: servidor `n8n-mcp` configurado em `~/.claude.json`, com `N8N_API_URL=http://localhost:5678`, a API key do n8n e `WEBHOOK_SECURITY_MODE=moderate`. Sem esse último, o n8n-mcp bloqueia webhooks em localhost. A variável só vale para processos novos: reconectar o MCP na mesma sessão não basta, e se o `n8n_health_check` falar em "strict mode", o processo é antigo.
- **MCP do n8n (Codex)**: configurado em `C:\Users\Bernard\.codex\config.toml`, seção `mcp_servers.n8n-mcp`, usando o pacote global já instalado **n8n-mcp 2.94.0**. Comando `cmd`, argumentos `["/c", "n8n-mcp"]` e as seis variáveis copiados da configuração do Claude para este projeto, incluindo `WEBHOOK_SECURITY_MODE=moderate`. Igualdade de comando, argumentos e ambiente verificada pelo `codex.cmd mcp get n8n-mcp --json`, sem exibir segredos. O processo atual não recarregou seu catálogo de ferramentas; nesta sessão o mesmo servidor foi acionado por cliente MCP stdio usando o SDK já instalado no pacote. Conexão e API do n8n testadas. Sessões novas devem carregar o MCP pela configuração; o shell isolado pode não enxergar a configuração pessoal que foi escrita fora dele.
- **GitHub**: o `gh` está logado como `bernard-014`. Remoto `origin` = `https://github.com/bernard-014/pauta-de-jogos.git`.

---

## Trabalho na nuvem (sessões pelo celular)

O usuário às vezes abre uma sessão do Claude Code **na nuvem** para mexer no projeto pelo celular. As duas sessões não conversam entre si: a da nuvem não avisa a local, e a local não lê a conversa da nuvem. **O único canal é o GitHub**: a nuvem commita numa branch e faz push; a local busca a branch e lê este arquivo.

**Se você está na nuvem** (sem `D:\`, sem n8n em localhost, sem `.env`, sem MCP do n8n):
- Você só mexe em código e documentação. O n8n, o Airtable e as credenciais ficam no PC do usuário, fora do seu alcance.
- Não diga que algo "funciona": diga "não testado no n8n". Teste local com a ESPN pública pode valer se a rede deixar, mas sem chaves.
- Commite na sua branch, com este arquivo atualizado no mesmo commit, e faça push. Não junte na `main`: isso é feito no PC, depois de aplicar e testar.
- No [Registro de mudanças](#registro-de-mudanças), identifique-se como **"Claude Code (nuvem)"**, diga o nome da branch e acrescente uma linha **"Pendente aplicar no n8n local:"** com cada arquivo de `n8n/code/` que mudou, o workflow e o nó onde ele entra. Se nada precisar ir para o n8n, escreva "nada a aplicar no n8n".

**Se você está no PC** (sessão local):
- No começo de cada tarefa, rode `git fetch` e `git branch -r --no-merged main`. Se houver branch `claude/*` ou outra que não foi juntada, leia o registro de mudanças dela (`git show origin/<branch>:AGENTS.md`) e conte ao usuário o que encontrou antes de seguir.
- Para incorporar: com o OK do usuário, junte a branch, aplique no n8n o que estiver "pendente aplicar" (procedimento padrão, por diferença), valide, peça ao usuário para testar e troque a linha por "aplicado no n8n em <data>".
- Se a `main` local tiver trabalho sem commit, avise o usuário antes de ele abrir uma sessão na nuvem: ela parte do GitHub e não verá esse trabalho, e os dois `AGENTS.md` vão conflitar.

---

## n8n

### Workflows

| Nome | ID | Observação |
|---|---|---|
| Pauta de Jogos | `Fb91kahwaHwrAQwV` | Fluxo principal, ativo. |
| smoke-test-pauta | `smokeTestPauta01` | Testa as APIs. Inativo. |
| Bot da Pauta | `Odzi5fJPjPehzrDK` | Bot do Telegram com AI Agent. Ativo, roda a cada minuto. |
| Bot - pauta do dia | `cw7aVcN4GxUye4pS` | Subfluxo-ferramenta do bot (Airtable). Publicado. |
| Bot - placar ESPN | `FYRpySMCGqCRLS1t` | Subfluxo-ferramenta do bot (ESPN). Publicado. |
| Como foram os jogos | `rkBpz5jBl3ncIfdX` | Resultado da pauta de ontem × nota prevista. Ativo, roda às 6h30. |

O n8n tem modelo rascunho/publicado. Em workflow ativo, as atualizações via `n8n_update_partial_workflow` foram publicadas na hora (confira com `n8n_get_workflow` no modo `active`).

### Nós do fluxo principal (ordem lógica)

1. `Schedule Trigger` (7h) e `When clicking 'Execute workflow'` (manual) → `Campeonatos`
2. `Campeonatos` (Airtable search, filtro `{Ativo}`) → `Times` (Airtable search, `executeOnce`)
3. `Times` → em paralelo, todos com `executeOnce`:
   - `football-data` (HTTP, `api.football-data.org/v4/matches`, competições vindas da tabela Campeonatos com `Fonte = football-data`, de hoje até +2 dias)
   - `ESPN` (Europa League: `site.api.espn.com/apis/site/v2/sports/soccer/uefa.europa/scoreboard?dates=yyyyMMdd`)
   - `ESPN NFL` (`.../football/nfl/scoreboard`)
   - `ESPN NBA` (`.../basketball/nba/scoreboard`)
   - `ESPN NFL lesões` (HTTP, `.../football/nfl/injuries`) e `ESPN NBA lesões` (HTTP, `.../basketball/nba/injuries`): respostas completas, ~10 MB por execução, por escolha do usuário. **Restaurados no repositório e no n8n publicado**. O usuário relatou que deixou de ver lesões da NBA após a unificação e pediu a reversão; o nó Code `Lesões ESPN` foi removido.
   - `API-Football lesões` (`v3.football.api-sports.io/injuries?date=hoje&timezone=America/Sao_Paulo`, credencial `API-Football`)
   - Os nós ESPN e de lesões têm `onError: continueRegularOutput`: se falharem, o fluxo segue e a mensagem avisa.
4. Todos → `Juntar fontes` (Merge v3.2, modo Append, `numberInputs` = número de fontes). **Toda fonte nova precisa entrar aqui, com `numberInputs` aumentado.** Sem o Merge, o nó seguinte rodaria uma vez por fonte e a pauta sairia repetida.
5. `Montar jogos do dia` (Code) → `Ligas com classificação` (Code, `alwaysOutputData`) → `Classificação` (HTTP football-data standings, `onError: continue`) → `Preparar pedido ao Gemini` (Code) → `Gemini` (HTTP, retry a cada 5 s, `onError: continue`) → `Gemini respondeu?` (IF: há `candidates[0].content.parts[0].text`?) → sim: `Selecionar jogos` (Code); não: `Nemotron (reserva)` (HTTP OpenRouter, header `Authorization: Bearer {{ $env.OPENROUTER_API_KEY }}`, corpo `bodyOpenRouter` montado pelo `Preparar pedido ao Gemini`, timeout 180 s, 2 tentativas, `onError: continue`) → `Selecionar jogos`
6. `Selecionar jogos` → `Pedidos 365Scores` (Code, `alwaysOutputData`, um item por esporte selecionado) → `365Scores jogos` (HTTP lista do dia, `onError: continue`) → `Casar transmissões` (Code, `alwaysOutputData`, casa por horário ±15 min + nome) → `365Scores transmissão` (HTTP detalhe por jogo, `onError: continue`) → `Adicionar transmissão` (Code: devolve a seleção com `transmissao` em cada jogo e `transmissaoFalhou`)
7. `Adicionar transmissão` → `Separar jogos` (Code) → `Salvar no Airtable` (upsert na tabela Jogos pela coluna `ID`, `typecast: true`, auto-map)
8. `Adicionar transmissão` → `Montar mensagem` (Code) → `Send a text message` (Telegram, `parse_mode: HTML`)

O código de cada nó Code está em `n8n/code/` e é **a fonte da verdade**:

| Nó | Arquivo |
|---|---|
| Montar jogos do dia | `n8n/code/montar-jogos-do-dia.js` |
| Ligas com classificação | `n8n/code/ligas-com-classificacao.js` |
| Preparar pedido ao Gemini | `n8n/code/preparar-pedido-gemini.js` |
| Selecionar jogos | `n8n/code/selecionar-jogos.js` |
| Separar jogos | `n8n/code/separar-jogos-airtable.js` |
| Pedidos 365Scores | `n8n/code/pedidos-365scores.js` |
| Casar transmissões | `n8n/code/casar-transmissoes.js` |
| Adicionar transmissão | `n8n/code/adicionar-transmissao.js` |
| Montar mensagem | `n8n/code/montar-mensagem.js` |

### Bot da Pauta (AI Agent)

`A cada minuto` (Schedule) → `Ler mensagens` (Code: long polling `getUpdates` com `timeout=30`, confirma a leitura com offset antes de responder, só aceita o chat do `TELEGRAM_CHAT_ID`, texto ou áudio) → `Transcrever áudios` (Code: `getFile` + download + Gemini `generateContent` com o áudio em base64, usa `$env.GEMINI_API_KEY`, limite de 180 s) → `AI Agent` (v3.1, retry 3×, `onError: continue`) → `Responder` (Telegram, prefixo 🎤 com a transcrição). Sub-nós do agente: `Gemini` (`lmChatGoogleGemini`, `gemini-flash-lite-latest`, credencial `Gemini` do tipo googlePalmApi), `Memória da conversa` (Simple Memory, 6 trocas, chave = chatId), `pauta_do_dia` e `placar_espn` (toolWorkflow 2.2 → subfluxos acima). Prompt do agente em `n8n/code/bot-instrucoes-agente.txt`.

- As chamadas ao Telegram e ao Gemini do bot ficam em nós Code com `this.helpers.httpRequest` (o task runner do n8n 2.x expõe esse helper) **de propósito**: o nó HTTP grava a URL inteira no log de erro, e no Telegram o token vai na URL. Os Code tratam o erro e tiram token e chave da mensagem. Não volte para nó HTTP.
- Subfluxos chamados por ferramenta precisam estar **publicados** (o n8n 2.x usa a versão publicada).
- Exportações do repositório: `n8n/workflow-bot-*.json`, geradas a partir de `n8n/code/bot-*.js` (o `workflowId` das ferramentas fica vazio no repositório).

| Nó | Arquivo |
|---|---|
| Ler mensagens | `n8n/code/bot-ler-mensagens.js` |
| Transcrever áudios | `n8n/code/bot-transcrever-audios.js` |
| AI Agent (system message) | `n8n/code/bot-instrucoes-agente.txt` |
| Resumir pauta (subfluxo) | `n8n/code/bot-resumir-pauta.js` |
| Montar URL (subfluxo) | `n8n/code/bot-montar-url-espn.js` |
| Resumir placar (subfluxo) | `n8n/code/bot-resumir-placar.js` |

### Como foram os jogos

`Todo dia às 6h30` (Schedule) e manual → `Dia da pauta` (Set: ontem; troque por uma data fixa para revisar outro dia) → `Jogos da pauta` (Airtable search pela `Data`, `alwaysOutputData`) → `Campeonatos` e `Times` (Airtable, `executeOnce`) → `Buscar placares` (Code) → `Montar resultados` (Code) → `Preparar avaliação` (Code) → `Gemini` (HTTP, credencial `Gemini (header)`, retry, `onError: continue`) → `Comparar notas` (Code) → `Separar resultados` → `Salvar resultados` (Airtable upsert pelo `ID`, só as colunas do resultado) e `Montar mensagem` → `Enviar no Telegram`.

- Neste workflow, base do Airtable e chat do Telegram vêm do `$env` também no n8n vivo, então o JSON do repositório só difere nos IDs de credencial. Ele é gerado a partir dos arquivos `n8n/code/resultados-*.js` (script descartável que lê os arquivos, grava o JSON e troca o `jsCode` pela API do n8n).
- `Buscar placares` chama a football-data (`/v4/matches?ids=...`, token `$env.FOOTBALL_DATA_TOKEN`, tirado das mensagens de erro) e o scoreboard da ESPN (uma chamada por liga e por dia dos EUA; **a ESPN não aceita intervalo de datas**, dá 400) dentro do Code, para evitar IF + Merge com ramos vazios.
- O plano grátis da football-data só traz placar final e do intervalo, sem gols. Os gols, expulsões e estatísticas vêm do `competitions[0].details` e `statistics` da ESPN; NBA/NFL trazem `linescores` por quarto, `leaders` (o `rating` resume "24 PTS, 7 REB") e `headlines`.
- O Gemini não recebe a nota prevista (avaliação cega). Virada, gol decisivo (≥85' mudando o resultado), empate arrancado e goleada são calculados no código.
- Sem jogo na pauta de ontem, não sai mensagem nem gravação.

| Nó | Arquivo |
|---|---|
| Buscar placares | `n8n/code/resultados-buscar-placares.js` |
| Montar resultados | `n8n/code/resultados-montar.js` |
| Preparar avaliação | `n8n/code/resultados-preparar-avaliacao.js` |
| Comparar notas | `n8n/code/resultados-comparar-notas.js` |
| Separar resultados | `n8n/code/resultados-separar-airtable.js` |
| Montar mensagem | `n8n/code/resultados-montar-mensagem.js` |

Os nós Code se referem uns aos outros pelo nome (`$('Montar jogos do dia')`, `$('ESPN NBA')`...). **Renomear um nó quebra o código.**

### Credenciais no n8n (nomes)

- `Airtable - Pauta de Jogos` (Airtable Personal Access Token)
- `football-data.org` (Header Auth `X-Auth-Token`)
- `Gemini (header)` (Header Auth `x-goog-api-key`)
- `Telegram - Resumo de Jogos` (Telegram API)
- `API-Football` (Header Auth `x-apisports-key`): já existe no n8n (vista em 17/10/2026). Falta confirmar se está selecionada no nó `API-Football lesões` e se o plano grátis cobre a temporada.
- `Gemini` (googlePalmApi): usada pelo sub-nó `Gemini` do bot.

Para obter os IDs, leia um nó que usa a credencial (`n8n_get_workflow`, modo `filtered`).

### n8n vivo × JSON do repositório

`n8n/workflow-pauta-de-jogos.json` é uma exportação **higienizada**, feita para alguém importar:
- no repositório, o Telegram usa `chatId = {{ $env.TELEGRAM_CHAT_ID }}`; no n8n vivo o chat está fixo no nó;
- no repositório, o Airtable aponta a base por variável; no n8n vivo a base está selecionada na lista.

Por isso, **nunca substitua o workflow vivo pelo JSON do repositório** (`n8n_update_full_workflow` com o arquivo). Aplique mudanças por diferença (`n8n_update_partial_workflow`: `addNode`, `updateNode` com `parameters.jsCode`, `addConnection` com `targetIndex` etc.) e mantenha o JSON do repositório sincronizado com os mesmos nós, conexões, posições e o `jsCode` dos arquivos em `n8n/code/`.

### Procedimento padrão para mudar o fluxo

1. Edite o arquivo em `n8n/code/` (ou o nó HTTP correspondente).
2. Copie o código para o `jsCode` do nó em `n8n/workflow-pauta-de-jogos.json`. Um script Node que lê o JSON, troca o `jsCode` e grava com `JSON.stringify(wf, null, 2)` funciona bem.
3. **Teste local** com dados reais (ver abaixo).
4. Aplique no n8n com `n8n_update_partial_workflow` e rode `n8n_validate_workflow`. Os avisos de `executeOnce` são esperados.
5. Atualize README, MANUAL, ROADMAP e **este arquivo**.
6. Peça ao usuário para rodar o fluxo no n8n (manda mensagem real) e, depois, ofereça o commit.

### Teste local dos nós Code

Não há suíte de testes no repositório. O que funciona é um script descartável, fora do repositório (na pasta temporária do agente):
- instale `luxon` (o n8n expõe `DateTime` do luxon);
- simule `$` como `(nome) => ({ first: () => itens[nome][0], all: () => itens[nome] })`, alimentando `Campeonatos` e `Times` com os CSVs de `airtable/` e as fontes HTTP com respostas reais da ESPN (`curl` nas URLs acima, sem chave);
- execute cada arquivo com `new Function('$', '$now', 'DateTime', codigo)($, DateTime.now(), DateTime)`, na mesma ordem do fluxo;
- para o Gemini, simule uma falha (`{ error: ... }`): o fluxo cai na nota pelo peso, o que já testa o resto.

### Lições aprendidas (n8n e ambiente)

- Para apagar um workflow publicado, **despublique antes** (`deactivateWorkflow`).
- `n8n_test_workflow` só dispara workflows com Webhook, Form ou Chat Trigger. O principal não tem, então quem roda é o usuário, pela interface.
- O regex `/[̀-ͯ]/g` dos códigos usa caracteres combinantes literais (U+0300–U+036F). Ao mandar `jsCode` por JSON, pode usar `\u0300-\u036f`: o resultado é o mesmo.
- No PowerShell 5.1, aspas dentro de here-string quebram o `git commit -m`. Grave a mensagem num arquivo e use `git commit -F arquivo`.
- O n8n executa os ramos **um de cada vez** (`executionOrder: v1`). Ramos paralelos deixam o fluxo mais legível, não mais rápido.

---

## Airtable

Base **Pauta de Jogos** (o ID não fica no repositório: está no `.env` e nos nós Airtable do n8n). Campos completos em [`docs/MANUAL.md#estrutura-do-airtable`](docs/MANUAL.md#estrutura-do-airtable).

- **Campeonatos**: `Nome`, `Código` (código na API: `BSA`, `CLI`, `CL`, `PL`, `PD`, `SA`, `BL1`, `FL1`, `uefa.europa`, `nfl`, `nba`), `Fonte` (`football-data` | `ESPN`), `Bloco` (`Brasil` | `Copas` | `Europa` | `NFL` | `NBA`), `Todos os jogos`, `Limite nota 4`, `Ordem`, `Ativo`.
- **Times**: `Nome`, `Peso` (3 gigante, 2 forte, 0 ou ausente = sem destaque), `Nomes nas APIs` (grafias separadas por vírgula). Futebol, NFL e NBA ficam **na mesma tabela**.
- **Jogos**: `ID` (`fd-<id>` ou `espn-<id>`, chave do upsert), `Data` (dia da pauta), `Horário`, `Campeonato` (link), `Mandante`, `Visitante`, `Status`, `Nota`, `Por que a nota`, `Briefing`, `Desfalques` (texto longo, criado em 2026-10-16), `Transmissão` (texto curto, criado em 2026-10-16), `Placar` (texto curto), `Nota do jogo` (número inteiro), `Como foi` (texto longo) e `Acerto da nota` (seleção: Na mosca, Perto, Superou, Decepcionou), as quatro criadas em 2026-10-18 e preenchidas pelo workflow `Como foram os jogos`.

Os CSVs em `airtable/` espelham o que foi carregado: `campeonatos.csv`, `times.csv` (45 de futebol), `times-nfl.csv` (32), `times-nba.csv` (30).

### Como escrever no Airtable

Sem ler o `.env`: crie um **workflow temporário** no n8n (`Webhook` → `Code` que gera os registros → `Airtable` com operação **upsert**, `typecast: true`, `matchingColumns` = `Código` ou `Nome`, usando a credencial `Airtable - Pauta de Jogos` e os IDs de base e tabela lidos dos nós do fluxo principal). Depois: ative, dispare com `n8n_test_workflow`, confira a execução com `n8n_executions`, desative e apague. Como é upsert, rodar duas vezes não duplica. O `typecast: true` cria opções novas em campos de seleção (foi assim que `NFL` e `NBA` entraram no `Bloco`). **Campos novos** (colunas): no mesmo workflow temporário, troque o nó Airtable por um HTTP `POST https://api.airtable.com/v0/meta/bases/<base>/tables/<tabela>/fields` com `authentication: predefinedCredentialType`, `nodeCredentialType: airtableTokenApi` e corpo `{"name": ..., "type": "singleLineText"}`. Funcionou para `Desfalques` e `Transmissão`.

---

## Fontes de dados

| Fonte | Uso | Observações |
|---|---|---|
| football-data.org (free) | Jogos e classificação do futebol | Cobre BSA, CLI, CL, PL, PD, SA, BL1, FL1. **Não cobre Europa League** no plano grátis. Limite de 10 req/min. |
| ESPN (pública, sem chave) | Europa League, NFL, NBA, lesões NFL/NBA | `site.api.espn.com/apis/site/v2/sports/<esporte>/<liga>/scoreboard?dates=yyyyMMdd`. O código do campeonato no Airtable é o slug da liga (`uefa.europa`, `nfl`, `nba`). O placar já traz campanha (`records`), semana (NFL), fase (`leagues[0].season.type.name`: Preseason, Regular Season...), TV e local. |
| API-Football (free, 100 req/dia) | Lesões do futebol | `v3.football.api-sports.io/injuries?date=...`, header `x-apisports-key`. Uma chamada por dia traz todos os jogos do mundo. Os ids não batem com football-data/ESPN: o jogo é casado pelo horário (±15 min) e o time pelo nome. **Não confirmado** se o plano grátis cobre a temporada atual (erro vem em `errors.plan`). |
| 365Scores (API do site, sem chave, não oficial) | Canais de transmissão no Brasil | Lista: `webws.365scores.com/web/games/allscores/?appTypeId=5&langId=31&timezoneName=America/Sao_Paulo&userCountryId=21&sports=<1, 2 ou 6>&startDate=dd/MM/yyyy&endDate=...` (só traz `hasTVNetworks`). Detalhe: `.../web/game/?...&gameId=<id>` → `game.tvNetworks[].name`. Esportes: 1 futebol, 2 basquete, 6 futebol americano. Pode mudar sem aviso. |
| Gemini | Nota, motivo, briefing, desfalques | Modelo `gemini-flash-lite-latest`: os `flash` maiores deram erro 503 de alta demanda em 2026-10-16. Uma chamada por dia com todos os jogos, resposta em JSON com `responseSchema`. |
| OpenRouter (grátis, 50 pedidos/dia sem créditos) | Reserva do Gemini | `POST openrouter.ai/api/v1/chat/completions`, formato OpenAI. `models` = fila `nvidia/nemotron-3-super-120b-a12b:free` → `nvidia/nemotron-3-ultra-550b-a55b:free` → `nvidia/nemotron-3.5-super-vl:free` (o OpenRouter pula para o próximo se um estiver sobrecarregado), `reasoning: {enabled: false}` (com raciocínio o Super levava ~150 s; sem, ~30 s), `response_format` json_schema. Testes de 17/10: Ultra deu 503 "overloaded" todas as vezes, `3.5-lightning:free` travou > 4 min, `nano-omni` deu 502. A resposta diz qual modelo respondeu em `model`. |
| Telegram Bot API | Envio da pauta | HTML, limite de 4096 caracteres por mensagem (o código corta em 3900). |

---

## Regras de negócio

- **Janela da pauta**: de **hoje às 6h até amanhã às 6h** (horário de Brasília), para que jogos da NBA depois da meia-noite entrem na pauta certa. A `Data` gravada no Airtable é o dia da pauta.
- **Seleção** (`selecionar-jogos.js`): campeonato com `Todos os jogos` marcado (Brasileirão, Libertadores) → entra tudo. Nos demais, nota 5 entra sempre e nota 4 entra até o `Limite nota 4` (CL 4, PL 3, NFL 3, NBA 3, demais 2), desempatando pelo peso total e pelo horário.
- **Notas** (prompt em `preparar-pedido-gemini.js`): critérios explícitos para futebol, NFL (horário nobre, jogo fora dos EUA, playoff, campanhas fortes) e NBA (clássicos, jogo fora dos EUA, playoff; **pré-temporada vale no máximo 4**). O modelo não pode inventar escalações nem resultados.
- **Desfalques**: `Montar jogos do dia` pendura até 12 por time (prioridade: fora/suspenso, depois dúvida, por último lista de lesionados). O Gemini devolve até 3 relevantes no campo `desfalques`, e `Selecionar jogos` descarta nomes que não estão na lista da fonte. Se o Gemini falhar, sai sem desfalques. Na mensagem, uma linha 🚑 por jogador (quebra no `;`) abaixo do briefing.
- **Se o Gemini falhar**: o Nemotron (reserva) faz a avaliação com o mesmo prompt e a mensagem ganha o aviso ℹ️ com o modelo usado (`llmReserva`). **Se os dois falharem**: nota pelo peso dos times (`pesoTotal >= 5` → 5; `>= 4` ou um time peso 3 → 4; `>= 2` → 3; senão 2), sem briefing, com aviso na mensagem.
- **Pesos dos times**: no futebol, gigantes = 3 e fortes = 2. Na NFL, 3 para Cowboys, Packers, Chiefs, Patriots, Steelers e 49ers. Na NBA, os pesos misturam história, popularidade no Brasil e força até 2025-26: 3 para Lakers, Celtics, Warriors, Bulls, Knicks, Heat, Spurs e Thunder. **Revisar a NBA no início da temporada regular.**
- **Nomes repetidos entre esportes**: as grafias da tabela Times formam um mapa único. `Spurs` fica só no **Tottenham**; o San Antonio usa só `San Antonio Spurs` (o código tenta o nome completo primeiro). Antes de cadastrar um apelido curto, confira se ele já existe em outro esporte.
- **Transmissão**: só para os jogos selecionados; linha 📺 logo abaixo do jogo. Se a 365Scores falhar, aviso ⚠️ e pauta sem 📺.
- **Mensagem**: uma só, com blocos na ordem Brasil, Copas, Europa, NFL, NBA (🇧🇷 🏆 🌍 🏈 🏀). O subtítulo do campeonato some quando repete o nome do bloco. Selos: 🔥 nota 5, ⭐ nota 4, ▫️ demais.

---

## Pendências (fora do código)

- Decidir a conta do GitHub: o currículo linka `bernardfrajblat365`, mas o repositório está em `bernard-014` (transferir?). Depois, tornar o repositório **público**.
- Gravar um vídeo de 2 minutos (Loom ou OBS) e pôr o link no README.
- Prints do n8n e do Telegram para o README.
- Testar a importação do JSON exportado num n8n limpo.
- Adicionar o projeto ao currículo.
- Itens abertos do [`ROADMAP.md`](ROADMAP.md).

---

## Registro de mudanças

Mais recente no topo. Uma entrada por tarefa: **data, agente, o que mudou, onde está (commit/branch/n8n/Airtable), o que ficou pendente.**

- **2026-10-18, Claude Code**: ativado, a pedido do usuário, o gatilho das 6h30 do `Como foram os jogos` (`rkBpz5jBl3ncIfdX`). Conferido que a versão publicada tem a correção do minuto no prompt. Primeira execução automática: 18/10 às 6h30, com a pauta de 17/10 (os mesmos 15 jogos da execução 108). Só AGENTS.md e ROADMAP mudaram, sem commit, na branch `como-foram-os-jogos`.

- **2026-10-18, Claude Code**: nova seção [Trabalho na nuvem](#trabalho-na-nuvem-sessões-pelo-celular), a pedido do usuário, que vai abrir sessões na nuvem pelo celular. O GitHub é o único canal: na nuvem, o agente commita numa branch e registra o que ficou "pendente aplicar no n8n local"; no PC, o agente roda `git fetch`, procura branches não juntadas e aplica no n8n. Regra nº 1, passo 5, agora inclui `git fetch`. Commitado junto com o "Como foram os jogos" na branch `como-foram-os-jogos`.

- **2026-10-18, Claude Code**: primeira execução real do `Como foram os jogos` (execução 108, rodada pelo usuário; antes ele tinha rodado por engano o `Pauta de Jogos`, execução 105, que regravou a pauta de 18/10). Mensagem e Airtable OK. Achado: o Gemini converteu "89'" em "aos 49 minutos do segundo tempo" (Espanyol x Atleti). Corrigido no prompt (`resultados-preparar-avaliacao.js`: citar o minuto como veio), aplicado no n8n (`jsCode` pela API) e no JSON do repositório; reteste local OK ("aos 89 minutos"). A linha desse jogo no Airtable ainda tem a frase antiga até a próxima execução. **Sem commit.** Pendente: ativar o gatilho das 6h30 (perguntar ao usuário).

- **2026-10-18, Claude Code**: "como foram os jogos de ontem", a ideia escolhida pelo usuário numa lista de sugestões. Workflow novo `Como foram os jogos` (`rkBpz5jBl3ncIfdX`, criado pela API do n8n e **inativo**), 6 arquivos `n8n/code/resultados-*.js`, exportação `n8n/workflow-como-foram-os-jogos.json`, 4 colunas novas na tabela Jogos (workflow temporário com a API de metadados, já apagado). Testes locais com dados reais: 17/10 (15 jogos, todos achados na ESPN; frases do Gemini conferidas contra os fatos, sem invenção), 16/10 (6 NBA + 1 Brasileirão; NBA de pré-temporada superavaliada: 3 jogos 4 → 2), Gemini falhando (só placares, com aviso) e dia sem pauta (sem mensagem). Validação no n8n: zero erros. README, MANUAL e ROADMAP atualizados. **Sem commit.** Pendente: o usuário rodar o workflow à mão (manda mensagem e grava no Airtable) e, se aprovar, ativar o gatilho das 6h30.

- **2026-10-17, Claude Code**: apagada no n8n, com o OK do usuário, a execução 40 do `Bot da Pauta`, a que guardava o token do bot no log de erro. Conferidos os outros erros do bot (56 e 66): são timeouts de rede ao conectar no Telegram por IPv6 e não mostram o token, o que confirma que a limpeza de erros dos nós Code funciona. Gerar um token novo no BotFather continua opcional. Sem commit.

- **2026-10-17, Claude Code**: modelo de reserva quando o Gemini falha, com os Nemotron grátis do OpenRouter (chave `OPENROUTER_API_KEY` adicionada ao `.env` pelo usuário). Testados com o prompt real (21 jogos de NFL, Premier League e Brasileirão): Super 120B sem raciocínio ficou mais perto do Gemini (13 notas iguais, 8 a 1 ponto); Ultra sobrecarregado; Lightning travou; Super VL rápido, mas notas mais baixas na NFL. Mudanças: `preparar-pedido-gemini.js` monta `bodyOpenRouter`; `selecionar-jogos.js` lê Gemini ou reserva e devolve `llmReserva`; `montar-mensagem.js` avisa (ℹ️/⚠️). Nós novos `Gemini respondeu?` (IF) e `Nemotron (reserva)` (HTTP); nós de `Selecionar jogos` em diante andaram 224 px para a direita. Aplicado e publicado no n8n (20 operações parciais), validação sem erros. JSON do repositório sincronizado, inclusive as posições do n8n vivo (estavam diferentes). README, MANUAL, ROADMAP e `.env.example` atualizados. Commitado na `main` com push. Pendente: execução real com o Gemini falhando; reserva também no AI Agent do bot (`Bot da Pauta`, item aberto no ROADMAP).

- **2026-10-17, Claude Code**: bot do Telegram que responde perguntas com AI Agent (workflow `Bot da Pauta` + subfluxos `Bot - pauta do dia` e `Bot - placar ESPN`), escolhas do usuário: polling (sem túnel) e ferramentas Airtable + ESPN ao vivo. Depois, perguntas por áudio (transcrição pelo Gemini). Código em `n8n/code/bot-*.js`, exportações em `n8n/workflow-bot-*.json`, README/MANUAL/ROADMAP atualizados. Testes locais com ESPN real e mocks de Telegram/Gemini; conversa real por texto OK (execuções 36 e 38); prompt corrigido para sempre chamar ferramenta (a 1ª resposta a "onde vai passar" veio sem consultar nada). Achado: a execução 40 (versão antiga, nó HTTP) gravou no log de erro a URL do Telegram **com o token do bot**; corrigido movendo as chamadas para nós Code. Áudio real confirmado na execução 49. Commitado (`91c97ed`), na `main` com push. **Pendente**: ~~apagar a execução 40~~ (apagada, ver entrada acima); modelo de reserva (Nemotron via OpenRouter, chave sendo criada em outra sessão). Também movida para cá uma entrada de 16/10 (desfalques um por linha, commit `0f84392`) que estava fora do lugar.
- **2026-10-16, Claude Code**: desfalques na mensagem agora saem um por linha (🚑 + jogador), em vez de tudo corrido; `montar-mensagem.js` divide o campo `desfalques` por `;`. Aplicado e publicado no n8n e no JSON do repositório. Commitado em `0f84392`.

- **2026-10-16, Claude Code**: transmissão dos jogos via API pública do site da 365Scores. 3 arquivos novos em `n8n/code/` (pedidos, casar, adicionar), `montar-mensagem.js` (linha 📺 + aviso) e `separar-jogos-airtable.js` (coluna `Transmissão`) agora leem `Adicionar transmissão`. Coluna `Transmissão` criada no Airtable pela API de metadados (workflow temporário, já apagado). Teste local: pauta real de 16/10 (execução 29) e 30 jogos de 18/10 (NFL, PL, La Liga, Serie A, Bundesliga, Brasileirão), 100% casados; queda da 365Scores e dia sem jogos testados. Aplicado e publicado no n8n (20 operações parciais), validação sem erros. JSON do repositório, README, MANUAL e ROADMAP atualizados. Usuário rodou o fluxo (execução 31, sucesso) e confirmou a linha 📺. Commitado na `main` com push.

- **2026-10-16, Claude Code**: `start-n8n.ps1` agora fecha qualquer n8n já aberto (processos `node.exe` cuja linha de comando contém `D:\n8n`, incluindo o task runner) antes de subir, só quando o comando é `start`. O atalho da área de trabalho `n8n resumo de jogos.lnk` chama esse script (`powershell -NoExit -ExecutionPolicy Bypass -File ...start-n8n.ps1`), então não precisou mudar. Respondido ao usuário: a limpeza de 7 dias do histórico já é nativa (`EXECUTIONS_DATA_PRUNE`), vale após reiniciar. Sem commit. Depois: o script também mostra uma barra de progresso estimada (90 s, linha a cada 5 s, "PRONTO" quando a porta 5678 abre), porque a primeira subida com limpeza/VACUUM leva ~2 min sem nenhuma saída do n8n.

- **2026-10-16, Claude Code**: investigada a "NBA sem lesões" (execução 27: dados chegam, Gemini devolve vazio). Ajustados `preparar-pedido-gemini.js` (regra de `desfalques` inclui estrela em dúvida/descanso) e `montar-jogos-do-dia.js` ("Rest" → "poupado (descanso)", "Undisclosed" → "não divulgado", dedupe de desfalques repetidos da API-Football). Testado localmente com a ESPN real; JSON do repositório sincronizado; aplicado e publicado no n8n por `patchNodeField` (o código vivo usa CRLF: inclua `\r\n` nos `find`). **Sem commit/push.** Pendente: o usuário rodar o fluxo; filtro de lesões por time (ver Trabalho em andamento).

- **2026-10-16, Codex**: configurado no Codex o mesmo MCP n8n do Claude (pacote global 2.94.0, comando/argumentos/seis variáveis idênticos, sem expor chave). Conexão MCP stdio e health check aprovados. Aplicadas 11 operações parciais em `Fb91kahwaHwrAQwV` para restaurar lesões NFL/NBA separadas, Merge com 7 entradas e parser anterior. Confirmados rascunho e versão publicada, parâmetros e credenciais dos demais nós preservados. Validação: zero erros, oito avisos esperados de `executeOnce`. AGENTS, MANUAL e ROADMAP atualizados. Sem execução completa, commit ou push; falta o usuário conferir a mensagem real. Novas sessões devem carregar o MCP salvo.

- **2026-10-16, Codex**: revertida localmente a unificação das lesões ESPN a pedido do usuário: restaurados os dois nós HTTP, Merge com 7 entradas e parser anterior; removido `n8n/code/lesoes-espn.js`. Mantida a limpeza automática. README, MANUAL e ROADMAP atualizados. Teste com respostas reais da ESPN (NFL ~8,8 MB; NBA ~1,5 MB) e jogos simulados associou lesões aos dois times; falha isolada da NBA preservou NFL. **Sem commit/push e sem alteração no n8n vivo**: falta acesso MCP/aba conectada. Causa do problema relatado ainda não diagnosticada; execução completa pendente.

- **2026-10-16, Claude Code (sessão "APIs gratuitas de lesões de jogadores")**: os nós HTTP `ESPN NFL lesões` e `ESPN NBA lesões` viraram o nó Code `Lesões ESPN`, que devolve ~45 KB em vez de ~10 MB (`Juntar fontes` com 6 entradas). Limpeza automática de execuções no `start-n8n.ps1`. Aplicado no n8n, na `main` com push (`ae22887`). Pendente: o usuário reiniciar o n8n pelo script para a limpeza valer.
- **2026-10-16, Claude Code (sessão "APIs gratuitas de lesões de jogadores")**: desfalques commitados (`e04a032`, na `main` com push). Coluna `Desfalques` criada na tabela Jogos pela API de metadados do Airtable. Pendente: credencial `API-Football` e teste do usuário no n8n.
- **2026-10-16, Claude Code**: criados este `AGENTS.md` e o `CLAUDE.md` (que importa este arquivo), com a regra de mantê-lo atualizado a cada tarefa. Registrado o trabalho de desfalques, que outra sessão deixou em andamento sem commit.
- **2026-10-16, Claude Code**: commit `69c64a4` na `main` (push feito): NFL e NBA (nós ESPN, 32 + 30 times, linhas em Campeonatos), fontes em paralelo com o Merge `Juntar fontes`, janela da pauta 6h–6h, mensagem única no Telegram, `Data` = dia da pauta. Tudo aplicado no n8n e no Airtable. Teste do usuário no n8n: OK (antes da mensagem única, que só foi testada localmente).
- **2026-10-16, Claude Code (sessão "APIs gratuitas de lesões de jogadores")**: desfalques via ESPN e API-Football. Publicado no n8n, **não commitado** (ver Trabalho em andamento).
- **2026-10-16, Claude Code**: commit `3fd1a48`: primeira versão (futebol, Airtable, Gemini, Telegram), repositório criado no GitHub.
- **2026-10-15**: início do projeto.
