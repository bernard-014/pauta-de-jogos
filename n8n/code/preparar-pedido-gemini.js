// Nó Code "Preparar pedido ao Gemini" (modo: Run Once for All Items)
// Junta cada jogo com a posição dos times na tabela e monta o corpo da chamada ao Gemini,
// pedindo a resposta em JSON com formato fixo (responseSchema).

const { data, jogos } = $('Montar jogos do dia').first().json;

// Posição de cada time por campeonato (o Bayern tem uma posição na Bundesliga e outra na Champions)
const tabela = new Map();
for (const item of $('Classificação').all()) {
  const codigo = item.json.competition?.code;
  for (const s of item.json.standings ?? []) {
    if (s.type !== 'TOTAL') continue;
    for (const linha of s.table) {
      tabela.set(`${codigo}:${linha.team.id}`, `${linha.position}º de ${s.table.length}, ${linha.points} pts em ${linha.playedGames} jogos`);
    }
  }
}

const lista = jogos.map((j) => ({
  id: j.id,
  campeonato: j.campeonato,
  fase: j.fase ?? undefined,
  rodada: j.rodada ?? undefined,
  horario: j.horario,
  mandante: j.mandante,
  visitante: j.visitante,
  tabelaMandante: tabela.get(`${j.codigo}:${j.idMandante}`),
  tabelaVisitante: tabela.get(`${j.codigo}:${j.idVisitante}`),
  pesoMandante: j.pesoMandante,
  pesoVisitante: j.pesoVisitante,
}));

const instrucoes = `Você é editor de pauta de um canal de esportes brasileiro.
Para cada jogo, dê uma nota de relevância de 1 a 5 para o público brasileiro e escreva um briefing.

Critérios da nota:
5 = jogão: clássico ou rivalidade histórica, confronto direto entre times do topo da tabela, decisão (mata-mata, final) ou time brasileiro decidindo título ou vaga.
4 = jogo bom: pelo menos um time gigante (peso 3) ou confronto entre times da parte de cima da tabela.
3 = interessante só para quem acompanha o campeonato.
2 = jogo comum.
1 = pouco relevante.

O peso dos times vem de uma lista mantida pela produção: 3 = gigante, 2 = forte, 0 = sem destaque.

Regras:
- Use os dados de tabela fornecidos. Não invente resultados recentes, lesões, artilheiros, técnicos ou escalações.
- Brasileirão e Libertadores interessam mais ao público: na dúvida, suba a nota.
- "motivo": uma frase curta explicando a nota.
- "briefing": no máximo 2 frases, em português do Brasil, dizendo o que está em jogo. Tom de jornalista esportivo, sem exagero.
- Avalie todos os jogos recebidos e devolva cada um com o mesmo id.`;

const body = {
  systemInstruction: { parts: [{ text: instrucoes }] },
  contents: [{ role: 'user', parts: [{ text: `Jogos de ${data}:\n${JSON.stringify(lista, null, 1)}` }] }],
  generationConfig: {
    temperature: 0.4,
    responseMimeType: 'application/json',
    responseSchema: {
      type: 'OBJECT',
      properties: {
        jogos: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              id: { type: 'STRING' },
              nota: { type: 'INTEGER' },
              motivo: { type: 'STRING' },
              briefing: { type: 'STRING' },
            },
            required: ['id', 'nota', 'motivo', 'briefing'],
          },
        },
      },
      required: ['jogos'],
    },
  },
};

return [{ json: { totalJogos: jogos.length, body } }];
