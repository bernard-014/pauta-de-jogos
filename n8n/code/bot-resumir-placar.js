// Nó Code "Resumir placar" do subfluxo "Bot - placar ESPN" (modo: Run Once for All Items)
// O placar da ESPN chega com centenas de KB (só a rodada da NFL passa de 200 KB).
// Aqui ele vira uma lista curta, para não estourar o limite de tokens do Gemini.

const pedido = $('Montar URL').first().json;
if (pedido.erro) return [{ json: { erro: pedido.erro } }];

const resposta = $('Placar ESPN').first().json;
if (resposta.error || !Array.isArray(resposta.events)) {
  return [{ json: { erro: 'A ESPN não respondeu agora. Avise que não deu para consultar o placar.' } }];
}

const situacao = { pre: 'agendado', in: 'ao vivo', post: 'encerrado' };

const jogos = resposta.events.map((e) => {
  const c = e.competitions[0];
  const casa = c.competitors.find((t) => t.homeAway === 'home') ?? c.competitors[0];
  const fora = c.competitors.find((t) => t.homeAway === 'away') ?? c.competitors[1];
  const estado = c.status.type.state;
  const campanha = (t) => t.records?.[0]?.summary;
  return {
    horario: DateTime.fromISO(e.date).setZone('America/Sao_Paulo').toFormat('dd/MM HH:mm'),
    jogo: `${casa.team.displayName} x ${fora.team.displayName}`,
    situacao: situacao[estado] ?? c.status.type.description,
    placar: estado === 'pre' ? undefined : `${casa.score} x ${fora.score}`,
    detalhe: estado === 'in' ? c.status.type.shortDetail : undefined, // tempo ou quarto em andamento
    campanhas: campanha(casa) && campanha(fora) ? `${campanha(casa)} x ${campanha(fora)}` : undefined,
    local: c.venue?.fullName,
  };
});

return [{
  json: {
    liga: resposta.leagues?.[0]?.name ?? pedido.liga,
    total: jogos.length,
    jogos,
    observacao: 'Horários de Brasília. Campanhas e placares da ESPN; a TV listada pela ESPN é a dos EUA, por isso não vem aqui.',
  },
}];
