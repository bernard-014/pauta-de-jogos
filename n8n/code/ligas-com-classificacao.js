// Nó Code "Ligas com classificação" (modo: Run Once for All Items)
// Gera um item por campeonato que tem jogo hoje e tem tabela de classificação.
// Mata-mata (ex.: Libertadores na fase final) não tem tabela, então fica de fora.
// Ligue "Always Output Data" nas Settings: assim o fluxo segue mesmo sem nenhuma liga.

const { jogos } = $('Montar jogos do dia').first().json;
const fasesComTabela = ['REGULAR_SEASON', 'LEAGUE_STAGE', 'GROUP_STAGE'];

const codigos = new Set(
  jogos
    .filter((j) => j.id.startsWith('fd-') && fasesComTabela.includes(j.fase))
    .map((j) => j.codigo),
);

return [...codigos].map((codigo) => ({ json: { codigo } }));
