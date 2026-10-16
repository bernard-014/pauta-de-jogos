// Nó Code "Casar transmissões" (modo: Run Once for All Items)
// Acha cada jogo selecionado na lista da 365Scores. Os ids não batem com os da football-data/ESPN,
// então o jogo é achado pelo esporte, pelo horário de início (±15 min) e pelo nome dos times
// (grafias da tabela Times ou palavras em comum, a mesma regra usada com a API-Football).
// Só sai um item por jogo que a 365Scores marca com transmissão (hasTVNetworks): os canais vêm no nó seguinte.
// Ligue "Always Output Data" nas Settings: sem nenhum jogo casado, o fluxo segue até a mensagem.

const { jogos } = $('Selecionar jogos').first().json;
const ESPORTE_365 = { nfl: 6, nba: 2 };
const TOLERANCIA = 15 * 60 * 1000;

const campos = (item) => ({ id: item.json.id, ...(item.json.fields ?? item.json) });
const semAcento = (s) => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const times = new Map();
for (const t of $('Times').all().map(campos)) {
  for (const nome of (t['Nomes nas APIs'] ?? '').split(',')) {
    if (nome.trim()) times.set(semAcento(nome), t.Nome);
  }
}

const GENERICAS = new Set(['fc', 'cf', 'ac', 'sc', 'afc', 'cd', 'ca', 'ec', 'se', 'rc', 'ssc', 'as', 'club', 'clube', 'de', 'da', 'do', 'the', 'calcio', 'futebol', 'football', 'esporte']);
const palavras = (s) => semAcento(s).replace(/[^a-z0-9]+/g, ' ').split(' ').filter((p) => p.length > 1 && !GENERICAS.has(p));
const parecido = (nomeApi, nomes) => {
  const canonico = times.get(semAcento(nomeApi));
  if (canonico && nomes.includes(canonico)) return 1;
  const a = palavras(nomeApi);
  let melhor = 0;
  for (const n of nomes) {
    const b = palavras(n);
    if (!a.length || !b.length) continue;
    const comuns = a.filter((p) => b.some((q) => p === q || (Math.min(p.length, q.length) >= 3 && (p.startsWith(q) || q.startsWith(p)))));
    melhor = Math.max(melhor, comuns.length / Math.min(a.length, b.length));
  }
  return melhor;
};

const lista = $('365Scores jogos').all().flatMap((i) => i.json.games ?? []);

const casados = [];
for (const j of jogos) {
  const esporte = ESPORTE_365[j.codigo] ?? 1;
  const inicio = DateTime.fromISO(j.utc).toMillis();
  let melhor = null;
  let pontos = 0;
  for (const g of lista) {
    if (g.sportId !== esporte) continue;
    if (Math.abs(DateTime.fromISO(g.startTime).toMillis() - inicio) > TOLERANCIA) continue;
    const casa = g.homeCompetitor?.name;
    const fora = g.awayCompetitor?.name;
    // Soma dos dois times; testa também invertido, caso uma fonte troque mandante e visitante
    const p = Math.max(
      parecido(casa, j.nomesMandante) + parecido(fora, j.nomesVisitante),
      parecido(casa, j.nomesVisitante) + parecido(fora, j.nomesMandante),
    );
    if (p > pontos) { melhor = g; pontos = p; }
  }
  // Pelo menos um time inteiro reconhecido (o horário já filtrou quase tudo)
  if (melhor && pontos >= 1 && melhor.hasTVNetworks) {
    casados.push({ json: { jogoId: j.id, gameId: melhor.id } });
  }
}

return casados;
