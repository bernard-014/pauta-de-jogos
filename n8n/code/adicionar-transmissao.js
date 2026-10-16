// Nó Code "Adicionar transmissão" (modo: Run Once for All Items)
// Devolve a seleção do nó "Selecionar jogos" com o campo "transmissao" em cada jogo:
// os canais brasileiros (userCountryId=21) que a 365Scores lista para a partida, separados por vírgula.
// Se a 365Scores falhar, os jogos seguem sem transmissão e a mensagem avisa.

const selecao = $('Selecionar jogos').first().json;

const respostasLista = $('365Scores jogos').all().map((i) => i.json);
const casados = $('Casar transmissões').all().map((i) => i.json).filter((c) => c.gameId);
const detalhes = casados.length ? $('365Scores transmissão').all().map((i) => i.json) : [];

const canais = new Map();
for (const d of detalhes) {
  if (!d.game?.id) continue;
  const nomes = (d.game.tvNetworks ?? []).map((t) => String(t.name ?? '').trim()).filter(Boolean);
  canais.set(d.game.id, [...new Set(nomes)].join(', '));
}
const gamePorJogo = new Map(casados.map((c) => [c.jogoId, c.gameId]));

const transmissaoFalhou = selecao.jogos.length > 0 && (
  respostasLista.some((r) => r.error || !r.games) || detalhes.some((d) => d.error)
);

return [{
  json: {
    ...selecao,
    transmissaoFalhou,
    jogos: selecao.jogos.map((j) => ({ ...j, transmissao: canais.get(gamePorJogo.get(j.id)) ?? '' })),
  },
}];
