# Roadmap – Pauta de Jogos

Ideias e próximos passos para o resumo diário no Telegram. Tudo aqui é ideia anotada, nada foi implementado ainda.

## Novas ligas e esportes

### NFL (futebol americano)
- [x] Adicionar jogos da NFL ao resumo (nó **ESPN NFL**, bloco 🏈 na mensagem, 32 times na tabela Times, limite de 3 jogos nota 4 por dia).
- [ ] Na pauta de segunda, incluir os resultados do domingo.
- Status: temporada 2026 em andamento (começou em setembro).
- Fonte de dados (grátis): endpoint público da ESPN, que o projeto já usa para a Europa League.
  `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard`
- Pontos a decidir:
  - Quais jogos entram: todos ou só os horários nobres (Sunday Night, Monday Night, Thursday Night) e os jogos de times populares no Brasil?
  - Os jogos se concentram no domingo. Na pauta de segunda, vale incluir resultados do fim de semana?
  - Os horários chegam em UTC; converter para o horário de Brasília.

### NBA (basquete)
- [x] Adicionar jogos da NBA ao resumo (nó **ESPN NBA**, bloco 🏀 na mensagem, 30 times na tabela Times, limite de 3 jogos nota 4 por dia). Testado com os jogos de pré-temporada.
- [x] Jogos depois da meia-noite: a pauta passou a cobrir de hoje às 6h até amanhã às 6h.
- [ ] Revisar os pesos dos times quando a temporada regular começar (força atual muda rápido na NBA).
- Status: temporada 2026-27 começa no fim de outubro.
- Fonte de dados (grátis): endpoint público da ESPN.
  `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard`
- Pontos a decidir:
  - Tem jogo quase todo dia, às vezes mais de 10. Precisa de filtro (nota/limite por campeonato, como já existe no Airtable).
  - Os jogos são à noite ou de madrugada no horário de Brasília. Como o resumo sai às 7h, pode fazer mais sentido mostrar os jogos da noite seguinte.

### Como encaixar no fluxo atual
- Cadastrar NFL e NBA na tabela **Campeonatos** do Airtable com "Limite nota 4" próprio.
- Reaproveitar o nó que já busca dados da ESPN, só trocando o caminho `sport/league`.
- Ajustar o prompt do Gemini para dar nota a jogos de outros esportes (rivalidade, playoff, times de destaque).
- Separar por esporte no texto do Telegram (⚽ / 🏈 / 🏀).

## Desfalques
- [x] Restaurar **ESPN NFL lesões** e **ESPN NBA lesões** separados, com respostas completas (~10 MB por execução), conforme pedido em 16/10/2026. Aplicado e confirmado no n8n publicado, validação sem erros e teste local com lesões reais em jogos simulados aprovado.
- [ ] Conferir uma execução completa da pauta após a reversão, verificando os desfalques da NBA na mensagem.
- [x] Lesionados e suspensos de cada time: ESPN para NFL e NBA, API-Football para futebol. O Gemini escolhe até 3 que importam, e eles aparecem na linha 🚑 e na coluna *Desfalques* do Airtable.
- [ ] Conferir com a chave real se o plano grátis da API-Football cobre a temporada atual de todas as ligas da pauta (o endpoint `/leagues` traz `coverage.injuries`).

## Modelo de reserva (LLM)
- [x] Nemotron via OpenRouter quando o Gemini falha na pauta (nós **Gemini respondeu?** e **Nemotron (reserva)**, 17/10/2026). Fila grátis: Super 120B → Ultra 550B → 3.5 Super VL, raciocínio desligado. Testado direto na API e localmente nos três cenários (Gemini OK, só reserva, os dois falhando).
- [ ] Conferir numa execução real em que o Gemini falhe (dá para simular trocando o modelo do nó Gemini por um nome inválido e rodando à mão).
- [ ] Se o Gemini continuar instável, avaliar inverter a ordem (Nemotron primeiro).

## Transmissão (onde passa o jogo)
- [x] Mostrar os canais brasileiros de cada jogo selecionado (linha 📺 na mensagem e coluna *Transmissão* no Airtable). Feito em 16/10/2026: nós **Pedidos 365Scores**, **365Scores jogos**, **Casar transmissões**, **365Scores transmissão** e **Adicionar transmissão**.
- [x] Conferido na execução real 31 do n8n (testado localmente com a pauta de 16/10 e com 30 jogos de domingo, 18/10: todos casaram).
- [ ] Revisar a NBA na temporada regular (na pré-temporada quase nenhum jogo tem canal).
- Fonte testada em 16/10/2026: API pública (não documentada) do site da 365Scores, sem chave.
  - Lista do dia: `webws.365scores.com/web/games/allscores/?appTypeId=5&langId=31&timezoneName=America/Sao_Paulo&userCountryId=21&sports=<1 futebol | 2 basquete | 6 futebol americano>&startDate=dd/MM/yyyy&endDate=dd/MM/yyyy` (~660 KB no futebol). Cada jogo traz `hasTVNetworks`, mas não os canais.
  - Detalhe do jogo: `webws.365scores.com/web/game/?appTypeId=5&langId=31&timezoneName=America/Sao_Paulo&userCountryId=21&gameId=<id>` (~46 KB), com `game.tvNetworks[].name` (ex.: Premiere, SporTV, DAZN, GETV). `userCountryId=21` = Brasil.
  - Matching: ids não batem com football-data/ESPN; casar por horário (±15 min) + nome dos times, como já é feito com a API-Football.
  - Encaixe: depois de `Selecionar jogos`, só para os selecionados (1 chamada de lista por esporte + 1 de detalhe por jogo com `hasTVNetworks`). Não depende do Gemini.
  - Risco: API não oficial, pode mudar sem aviso. Se falhar, a pauta sai sem a linha 📺.
  - NBA na pré-temporada veio sem transmissão; NFL e futebol vieram com canais.

## Bot que responde perguntas
- [x] AI Agent no Telegram (workflow **Bot da Pauta**) com ferramentas `pauta_do_dia` (Airtable) e `placar_espn` (ESPN), memória da conversa e long polling. Feito em 17/10/2026.
- [x] Perguntas por áudio, transcritas pelo Gemini antes de chegar ao agente.
- [ ] Modelo de reserva no AI Agent (opção *fallback model*) para quando o Gemini der 503. Candidato: Nemotron via OpenRouter; a chave já está no `.env` e a fila testada na pauta (Super 120B → Ultra → 3.5 Super VL) pode ser reaproveitada.
- [ ] Memória que sobrevive ao reinício do n8n (hoje é a Simple Memory, que fica na RAM).
- [ ] Ferramenta de desfalques ao vivo (ESPN `injuries`) para jogos fora da pauta.
- [ ] Avaliação do agente: um conjunto fixo de perguntas com resposta esperada, rodado depois de cada mudança de prompt (n8n Evaluations).

## Como foram os jogos (avaliação das notas)
- [x] Workflow **Como foram os jogos** (6h30): resultado dos jogos da pauta de ontem (football-data + ESPN), nota de depois do jogo pelo Gemini sem ver a nota prevista, comparação (Na mosca / Perto / Superou / Decepcionou), colunas novas no Airtable e mensagem no Telegram. Feito em 18/10/2026, testado localmente com as pautas reais de 16/10 e 17/10.
- [x] Primeira execução real no n8n (execução 108, 18/10/2026): mensagem e Airtable OK. Ajustado o prompt para citar o minuto do gol como veio (o modelo tinha trocado 89' por "49 do segundo tempo").
- [x] Gatilho das 6h30 ativado (18/10/2026).
- [ ] Resumo da semana (segunda-feira): acerto acumulado por campeonato e por esporte, a partir das colunas *Acerto da nota* e *Nota do jogo*.
- [ ] Gabarito humano: a produção corrige *Nota do jogo* quando discordar, e o acerto passa a ser medido contra a nota humana.
- [ ] Usar os erros recorrentes para ajustar o prompt da pauta. Primeiro sinal: a pré-temporada da NBA está superavaliada (4 → 2 em três de seis jogos de 16/10).
- [ ] Modelo de reserva (Nemotron) também nesta avaliação, como na pauta.

## Outras ideias
- [ ] Formulário do Airtable para a equipe marcar "quero cobertura deste jogo", com aviso automático no Telegram.
- [ ] Rodar o n8n em um servidor gratuito para o gatilho das 7h não depender do PC ligado.

_(adicionar aqui conforme surgirem)_

- [ ] Lesões só dos times selecionados: `injuries?team=<id>` da ESPN funciona (~45 KB/time na NBA), mas só economiza se buscar depois da seleção, com uma segunda chamada ao Gemini só para desfalques.
