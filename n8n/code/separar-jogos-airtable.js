// Nó Code "Separar jogos" (modo: Run Once for All Items)
// Transforma a lista de jogos escolhidos em um item por jogo,
// com as chaves iguais aos nomes das colunas da tabela Jogos no Airtable.

const { jogos } = $('Selecionar jogos').first().json;

return jogos.map((j) => ({
  json: {
    ID: j.id,
    Data: j.horarioISO.slice(0, 10),
    'Horário': j.horarioISO,
    Campeonato: [j.campeonatoId],
    Mandante: j.mandante,
    Visitante: j.visitante,
    Status: j.status,
    Nota: j.nota,
    'Por que a nota': j.motivo,
    Briefing: j.briefing,
  },
}));
