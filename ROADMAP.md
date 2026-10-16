# Roadmap – Pauta de Jogos

Ideias e próximos passos para o resumo diário no Telegram. Tudo aqui é ideia anotada, nada foi implementado ainda.

## Novas ligas e esportes

### NFL (futebol americano)
- [ ] Adicionar jogos da NFL ao resumo.
- Status: temporada 2026 em andamento (começou em setembro).
- Fonte de dados (grátis): endpoint público da ESPN, que o projeto já usa para a Europa League.
  `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard`
- Pontos a decidir:
  - Quais jogos entram: todos ou só os horários nobres (Sunday Night, Monday Night, Thursday Night) e os jogos de times populares no Brasil?
  - Os jogos se concentram no domingo. Na pauta de segunda, vale incluir resultados do fim de semana?
  - Os horários chegam em UTC; converter para o horário de Brasília.

### NBA (basquete)
- [ ] Adicionar jogos da NBA ao resumo.
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

## Outras ideias
- [ ] Formulário do Airtable para a equipe marcar "quero cobertura deste jogo", com aviso automático no Telegram.
- [ ] Rodar o n8n em um servidor gratuito para o gatilho das 7h não depender do PC ligado.

_(adicionar aqui conforme surgirem)_
