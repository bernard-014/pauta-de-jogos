// Nó Code "Montar resultados" do workflow "Como foram os jogos" (modo: Run Once for All Items)
// Para cada jogo da pauta, junta o placar e os fatos do jogo: gols com minuto, expulsões, virada,
// gol decisivo no fim, prorrogação, placar por quarto, destaques. Os fatos são calculados aqui, no código,
// e não pelo Gemini: conta de placar e de minuto o modelo pode errar; o código, não.
// Jogos da football-data são achados na ESPN pelo horário (±15 min) e pelo nome dos times, a mesma regra
// usada com a API-Football e a 365Scores. Se não achar, o jogo fica só com o placar da football-data.

const TOLERANCIA = 15 * 60 * 1000;
const { data, jogos, fd, espn, falhas } = $('Buscar placares').first().json;

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
const parecido = (nomesApi, nomes) => {
  let melhor = 0;
  for (const nomeApi of nomesApi) {
    const canonico = times.get(semAcento(nomeApi));
    if (canonico && nomes.some((n) => times.get(semAcento(n)) === canonico || n === canonico)) return 1;
    const a = palavras(nomeApi);
    for (const n of nomes) {
      const b = palavras(n);
      if (!a.length || !b.length) continue;
      const comuns = a.filter((p) => b.some((q) => p === q || (Math.min(p.length, q.length) >= 3 && (p.startsWith(q) || q.startsWith(p)))));
      melhor = Math.max(melhor, comuns.length / Math.min(a.length, b.length));
    }
  }
  return melhor;
};

// Acha o jogo na ESPN e devolve [mandante, visitante] já na ordem da pauta
const acharNaESPN = (j, nomesMandante, nomesVisitante) => {
  if (j.id.startsWith('espn-')) {
    const ev = espn.find((e) => `espn-${e.id}` === j.id);
    if (!ev) return null;
    return { ev, casa: ev.lados.find((l) => l.homeAway === 'home'), fora: ev.lados.find((l) => l.homeAway === 'away') };
  }
  const inicio = DateTime.fromISO(j.horario).toMillis();
  let melhor = null;
  let pontos = 0;
  for (const ev of espn) {
    if (ev.caminho !== j.caminhoEspn) continue;
    if (Math.abs(DateTime.fromISO(ev.utc).toMillis() - inicio) > TOLERANCIA) continue;
    const [a, b] = ev.lados;
    // Testa também invertido, caso uma fonte troque mandante e visitante
    const direto = parecido(a.nomes, nomesMandante) + parecido(b.nomes, nomesVisitante);
    const invertido = parecido(a.nomes, nomesVisitante) + parecido(b.nomes, nomesMandante);
    if (Math.max(direto, invertido) > pontos) {
      pontos = Math.max(direto, invertido);
      melhor = direto >= invertido ? { ev, casa: a, fora: b } : { ev, casa: b, fora: a };
    }
  }
  // Pelo menos um time inteiro reconhecido (o horário já filtrou quase tudo)
  return pontos >= 1 ? melhor : null;
};

const statusFD = {
  FINISHED: 'Encerrado', AWARDED: 'Encerrado', IN_PLAY: 'Ao vivo', PAUSED: 'Ao vivo',
  POSTPONED: 'Adiado', SUSPENDED: 'Adiado', CANCELLED: 'Cancelado', SCHEDULED: 'Agendado', TIMED: 'Agendado',
};
const statusESPN = (ev) => {
  if (ev.statusNome === 'STATUS_POSTPONED') return 'Adiado';
  if (ev.statusNome === 'STATUS_CANCELED') return 'Cancelado';
  return { pre: 'Agendado', in: 'Ao vivo', post: 'Encerrado' }[ev.estado] ?? ev.statusNome;
};

// "90'+3'" -> 93
const minutoEmNumero = (s) => {
  const m = String(s).match(/(\d+)'?(?:\s*\+\s*(\d+))?/);
  return m ? Number(m[1]) + Number(m[2] ?? 0) : 0;
};

const resultados = jogos.map((j) => {
  const m = fd.find((x) => x.id === j.id);
  const nomesMandante = [j.mandante, ...(m?.nomesMandante ?? [])];
  const nomesVisitante = [j.visitante, ...(m?.nomesVisitante ?? [])];
  const achado = acharNaESPN(j, nomesMandante, nomesVisitante);
  const ev = achado?.ev;

  const situacao = m ? (statusFD[m.status] ?? m.status) : ev ? statusESPN(ev) : 'Sem dados';
  const golsCasa = m?.final?.home ?? (achado ? Number(achado.casa.placar) : null);
  const golsFora = m?.final?.away ?? (achado ? Number(achado.fora.placar) : null);
  const temPlacar = situacao === 'Encerrado' && golsCasa != null && golsFora != null;

  const r = {
    ...j,
    situacao,
    placar: temPlacar ? `${golsCasa} x ${golsFora}` : null,
    detalhesDaESPN: !!ev,
    fatos: {},
  };
  if (!temPlacar) return r;

  const f = r.fatos;
  const futebol = !['nfl', 'nba'].includes(j.codigo);
  f.placar = `${j.mandante} ${golsCasa} x ${golsFora} ${j.visitante}`;
  const margem = Math.abs(golsCasa - golsFora);

  if (futebol) {
    if (m?.intervalo?.home != null) f.intervalo = `${m.intervalo.home} x ${m.intervalo.away}`;
    if (m?.duracao === 'EXTRA_TIME') f.prorrogacao = 'decidido na prorrogação';
    if (m?.duracao === 'PENALTY_SHOOTOUT') f.prorrogacao = `decidido nos pênaltis (${m.penaltis?.home} x ${m.penaltis?.away})`;
    if (margem >= 3) f.goleada = true;

    if (ev) {
      const nomeDoTime = (id) => (id === achado.casa.id ? j.mandante : id === achado.fora.id ? j.visitante : '?');
      const gols = ev.lances.filter((l) => l.gol).sort((a, b) => minutoEmNumero(a.minuto) - minutoEmNumero(b.minuto));
      f.gols = gols.map((g) => `${g.minuto} ${g.jogador}${g.penalti ? ' (pênalti)' : ''}${g.contra ? ' (contra)' : ''} - ${nomeDoTime(g.timeId)}`);
      const expulsoes = ev.lances.filter((l) => l.vermelho);
      if (expulsoes.length) f.expulsoes = expulsoes.map((l) => `${l.minuto} ${l.jogador} - ${nomeDoTime(l.timeId)}`);

      // Virada, empate arrancado e gol decisivo no fim, refazendo o placar gol a gol.
      // Só confia na linha do tempo se a soma dos gols bater com o placar final.
      if (gols.length === golsCasa + golsFora) {
        let c = 0;
        let v = 0;
        let casaPerdeu = false;
        let foraPerdeu = false;
        let decisivo = null;
        for (const g of gols) {
          const antes = Math.sign(c - v);
          if (g.timeId === achado.casa.id) c++; else v++;
          if (c < v) casaPerdeu = true;
          if (v < c) foraPerdeu = true;
          // Gol que mudou o resultado (empate virou vitória ou derrota virou empate) a partir dos 85'
          if (minutoEmNumero(g.minuto) >= 85 && Math.sign(c - v) !== antes) decisivo = `${g.minuto} ${g.jogador} (${nomeDoTime(g.timeId)})`;
        }
        if (golsCasa > golsFora && casaPerdeu) f.virada = `${j.mandante} virou o jogo`;
        if (golsFora > golsCasa && foraPerdeu) f.virada = `${j.visitante} virou o jogo`;
        if (golsCasa === golsFora && (casaPerdeu || foraPerdeu)) f.empateArrancado = true;
        if (decisivo) f.golDecisivoNoFim = decisivo;
      }

      const est = (l) => l.estatisticas;
      if (est(achado.casa).possessionPct) f.posseDeBola = `${est(achado.casa).possessionPct}% x ${est(achado.fora).possessionPct}%`;
      if (est(achado.casa).shotsOnTarget) f.chutesNoGol = `${est(achado.casa).shotsOnTarget} x ${est(achado.fora).shotsOnTarget}`;
    } else if (m?.intervalo?.home != null) {
      // Sem a linha do tempo da ESPN, o intervalo ainda mostra se houve virada no segundo tempo
      const int = Math.sign(m.intervalo.home - m.intervalo.away);
      const fim = Math.sign(golsCasa - golsFora);
      if (int !== 0 && fim !== 0 && int !== fim) f.virada = `${fim > 0 ? j.mandante : j.visitante} virou no segundo tempo`;
    }
  } else if (ev) {
    // NFL e NBA: placar por quarto, prorrogação (mais de 4 parciais), destaques e manchete
    const pc = achado.casa.parciais;
    const pf = achado.fora.parciais;
    f.parciais = pc.map((p, i) => `${i < 4 ? `${i + 1}º` : 'prorrogação'}: ${p} x ${pf[i]}`).join('; ');
    if (pc.length > 4) f.prorrogacao = pc.length > 5 ? `${pc.length - 4} prorrogações` : 'decidido na prorrogação';
    f.margemFinal = `${margem} pontos`;
    const destaques = [achado.casa.destaque && `${j.mandante}: ${achado.casa.destaque}`, achado.fora.destaque && `${j.visitante}: ${achado.fora.destaque}`].filter(Boolean);
    if (destaques.length) f.destaques = destaques;
    if (ev.manchete) f.manchete = ev.manchete;
  }
  return r;
});

return [{ json: { data, jogos: resultados, falhas } }];
