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
- [x] Lesionados e suspensos de cada time: ESPN para NFL e NBA, API-Football para futebol. O Gemini escolhe até 3 que importam, e eles aparecem na linha 🚑 e na coluna *Desfalques* do Airtable.
- [ ] Conferir com a chave real se o plano grátis da API-Football cobre a temporada atual de todas as ligas da pauta (o endpoint `/leagues` traz `coverage.injuries`).

## Outras ideias
- [ ] Formulário do Airtable para a equipe marcar "quero cobertura deste jogo", com aviso automático no Telegram.
- [ ] Rodar o n8n em um servidor gratuito para o gatilho das 7h não depender do PC ligado.

_(adicionar aqui conforme surgirem)_
