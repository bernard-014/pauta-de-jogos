// Nó Code "Preparar pedido ao Gemini" (modo: Run Once for All Items)
// Junta cada jogo com a posição dos times na tabela e os desfalques, e monta o corpo da chamada ao Gemini,
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
  campanhaMandante: j.campanhaMandante ?? undefined,
  campanhaVisitante: j.campanhaVisitante ?? undefined,
  extras: j.extras ?? undefined,
  desfalquesMandante: j.desfalquesMandante?.map((d) => d.texto),
  desfalquesVisitante: j.desfalquesVisitante?.map((d) => d.texto),
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

Jogos da NFL (futebol americano) usam os mesmos números, com estes critérios:
5 = horário nobre (Sunday Night, Monday Night ou Thursday Night, pelo horário de Brasília à noite), jogo no Brasil ou fora dos EUA, playoff/Super Bowl, ou confronto entre duas campanhas fortes.
4 = time popular no Brasil (peso 3) ou duelo de divisão com as duas equipes brigando por vaga.
3 ou menos = jogo comum da rodada de domingo.
Na NFL, "campanha" é vitórias-derrotas(-empates) na temporada e "rodada" é a semana (week). Nada de tabela de classificação.

Jogos da NBA (basquete) também usam os mesmos números:
5 = clássico (Lakers x Celtics, Knicks x Celtics, Lakers x Warriors etc.), jogo fora dos EUA, playoff/play-in/finais, ou confronto entre duas campanhas fortes.
4 = pelo menos um time popular no Brasil (peso 3), jogo de abertura da temporada ou de Natal, ou duelo direto entre times do topo da conferência.
3 ou menos = jogo comum da rodada (tem jogo quase todo dia).
Pré-temporada (fase "Preseason") vale menos: no máximo 4, e só com time peso 3 ou clássico. Na NBA, "campanha" é vitórias-derrotas na fase indicada.

Regras:
- Use os dados de tabela e campanha fornecidos. Não invente resultados recentes, artilheiros, técnicos ou escalações.
- "desfalquesMandante" e "desfalquesVisitante" listam lesionados e suspensos informados pelas fontes ("Nome (posição): situação, motivo"). Use só esses: não cite nenhum outro jogador como desfalque. Se o jogo não tiver essa lista, não fale de desfalques.
- A ausência de uma estrela ou titular importante pode mudar a nota e merece entrar no briefing. Reserva, jogador de rotação ou quem está fora há meses não muda nada.
- "desfalques": os até 3 desfalques que importam para o jogo, no formato "Nome (Time, situação em português)", separados por "; ". Ex.: "Patrick Mahomes (Chiefs, dúvida); Travis Kelce (Chiefs, fora)". Jogador conhecido do público (estrela, All-Star, titular de time grande) entra mesmo que seja só dúvida ou descanso: "descanso" (poupado) é desfalque de verdade, principalmente na pré-temporada da NBA, e deve aparecer como "poupado". Devolva "" só se a lista estiver vazia ou tiver apenas reservas desconhecidos.
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
              desfalques: { type: 'STRING' },
            },
            required: ['id', 'nota', 'motivo', 'briefing', 'desfalques'],
          },
        },
      },
      required: ['jogos'],
    },
  },
};

return [{ json: { totalJogos: jogos.length, body } }];
