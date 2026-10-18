// Nó Code "Resumir pauta" do subfluxo "Bot - pauta do dia" (modo: Run Once for All Items)
// Junta os jogos gravados na tabela Jogos com o nome do campeonato (o campo Campeonato é um link,
// que chega só com o id do registro) e devolve uma lista enxuta para o AI Agent.

const campos = (item) => ({ id: item.json.id, ...(item.json.fields ?? item.json) });
const data = $('Quando o bot pedir').first().json.data;

const nomeDoCampeonato = new Map($('Campeonatos').all().map(campos).map((c) => [c.id, c.Nome]));

const jogos = $('Buscar jogos').all()
  .map(campos)
  .filter((j) => j.ID) // sem jogo, o Airtable devolve um item vazio
  .sort((a, b) => String(a['Horário']).localeCompare(String(b['Horário'])))
  .map((j) => ({
    horario: j['Horário'] ? DateTime.fromISO(j['Horário']).setZone('America/Sao_Paulo').toFormat('dd/MM HH:mm') : undefined,
    campeonato: (j.Campeonato ?? []).map((id) => nomeDoCampeonato.get(id) ?? id).join(', '),
    jogo: `${j.Mandante} x ${j.Visitante}`,
    nota: j.Nota,
    porQueANota: j['Por que a nota'],
    briefing: j.Briefing || undefined,
    desfalques: j.Desfalques || undefined,
    transmissao: j['Transmissão'] || undefined,
    status: j.Status,
  }));

return [{
  json: {
    data,
    total: jogos.length,
    jogos,
    observacao: jogos.length
      ? 'Só os jogos selecionados para a pauta. Status e nota são do momento da coleta (7h).'
      : 'Nenhum jogo gravado na pauta deste dia (a pauta só existe a partir das 7h do próprio dia).',
  },
}];
