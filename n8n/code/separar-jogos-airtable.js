// Nó Code "Separar jogos" (modo: Run Once for All Items)
// Transforma a lista de jogos escolhidos em um item por jogo,
// com as chaves iguais aos nomes das colunas da tabela Jogos no Airtable.

const { data, jogos } = $('Adicionar transmissão').first().json;

return jogos.map((j) => ({
  json: {
    ID: j.id,
    Data: data, // dia da pauta (um jogo às 00h30 continua na pauta de ontem)
    'Horário': j.horarioISO,
    Campeonato: [j.campeonatoId],
    Mandante: j.mandante,
    Visitante: j.visitante,
    Status: j.status,
    Nota: j.nota,
    'Por que a nota': j.motivo,
    Briefing: j.briefing,
    Desfalques: j.desfalques,
    'Transmissão': j.transmissao,
  },
}));
