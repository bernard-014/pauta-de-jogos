// Nó Code "Montar jogos do dia" (modo: Run Once for All Items)
// Junta os jogos da football-data e da ESPN (Europa League, NFL e NBA), converte para o horário de Brasília,
// fica só com os jogos da pauta de hoje e marca o peso de cada time a partir da tabela Times.
// No fim, pendura em cada jogo os desfalques (lesionados e suspensos) de cada time:
// NFL e NBA pela ESPN, futebol pela API-Football.

const TZ = 'America/Sao_Paulo';
const agora = $now.setZone(TZ);
const hoje = agora.toFormat('yyyy-MM-dd');
// A pauta cobre de hoje às 6h até amanhã às 6h: jogo da NBA às 00h30 de Brasília ainda é "de hoje".
const inicioPauta = agora.startOf('day').plus({ hours: 6 });
const fimPauta = inicioPauta.plus({ days: 1 });

// O nó do Airtable devolve os campos soltos no item; este helper aceita os dois formatos.
const campos = (item) => ({ id: item.json.id, ...(item.json.fields ?? item.json) });

// Campeonatos ativos, indexados pelo código usado na API
const campeonatos = {};
for (const c of $('Campeonatos').all().map(campos)) {
  if (c.Ativo) campeonatos[c['Código']] = c;
}

// Peso dos times: cada grafia em "Nomes nas APIs" aponta para o time
const semAcento = (s) => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const times = new Map();
for (const t of $('Times').all().map(campos)) {
  for (const nome of (t['Nomes nas APIs'] ?? '').split(',')) {
    if (nome.trim()) times.set(semAcento(nome), { nome: t.Nome, peso: t.Peso ?? 1 });
  }
}
const acharTime = (...nomes) => {
  for (const n of nomes) {
    const t = times.get(semAcento(n));
    if (t) return t;
  }
  return null;
};

const jogos = [];
const adicionar = (codigo, jogo) => {
  const c = campeonatos[codigo];
  if (!c) return;
  const inicio = DateTime.fromISO(jogo.utc, { zone: 'utc' }).setZone(TZ);
  if (inicio < inicioPauta || inicio >= fimPauta) return;
  const pesoMandante = jogo.timeMandante?.peso ?? 0;
  const pesoVisitante = jogo.timeVisitante?.peso ?? 0;
  jogos.push({
    id: jogo.id,
    campeonato: c.Nome,
    campeonatoId: c.id,
    codigo,
    bloco: c.Bloco,
    ordem: c.Ordem ?? 99,
    todosOsJogos: !!c['Todos os jogos'],
    limiteNota4: c['Limite nota 4'] ?? 0,
    horario: inicio.toFormat('HH:mm'),
    horarioISO: inicio.toISO(),
    utc: jogo.utc,
    mandante: jogo.mandante,
    visitante: jogo.visitante,
    // Todas as grafias conhecidas de cada time, para casar com os nomes da API-Football
    nomesMandante: [...new Set([jogo.mandante, ...(jogo.nomesMandante ?? []), jogo.timeMandante?.nome].filter(Boolean))],
    nomesVisitante: [...new Set([jogo.visitante, ...(jogo.nomesVisitante ?? []), jogo.timeVisitante?.nome].filter(Boolean))],
    idMandante: jogo.idMandante ?? null,
    idVisitante: jogo.idVisitante ?? null,
    pesoMandante,
    pesoVisitante,
    pesoTotal: pesoMandante + pesoVisitante,
    status: jogo.status,
    fase: jogo.fase ?? null,
    rodada: jogo.rodada ?? null,
    campanhaMandante: jogo.campanhaMandante ?? null,
    campanhaVisitante: jogo.campanhaVisitante ?? null,
    extras: jogo.extras ?? null,
  });
};

// football-data.org
const statusFD = {
  SCHEDULED: 'Agendado', TIMED: 'Agendado', IN_PLAY: 'Ao vivo', PAUSED: 'Ao vivo',
  FINISHED: 'Encerrado', AWARDED: 'Encerrado', POSTPONED: 'Adiado', SUSPENDED: 'Adiado', CANCELLED: 'Cancelado',
};
for (const m of $('football-data').first().json.matches ?? []) {
  adicionar(m.competition.code, {
    id: `fd-${m.id}`,
    utc: m.utcDate,
    mandante: m.homeTeam.shortName ?? m.homeTeam.name,
    visitante: m.awayTeam.shortName ?? m.awayTeam.name,
    idMandante: m.homeTeam.id,
    idVisitante: m.awayTeam.id,
    nomesMandante: [m.homeTeam.name, m.homeTeam.shortName],
    nomesVisitante: [m.awayTeam.name, m.awayTeam.shortName],
    timeMandante: acharTime(m.homeTeam.name, m.homeTeam.shortName),
    timeVisitante: acharTime(m.awayTeam.name, m.awayTeam.shortName),
    status: statusFD[m.status] ?? m.status,
    fase: m.stage,
    rodada: m.matchday,
  });
}

// ESPN: Europa League (nó "ESPN"), NFL (nó "ESPN NFL") e NBA (nó "ESPN NBA"). O código do campeonato
// é o slug da liga na ESPN (uefa.europa, nfl, nba). Se uma chamada falhar, o fluxo segue sem esses jogos.
const statusESPN = (s) => {
  if (s.name === 'STATUS_POSTPONED') return 'Adiado';
  if (s.name === 'STATUS_CANCELED') return 'Cancelado';
  return { pre: 'Agendado', in: 'Ao vivo', post: 'Encerrado' }[s.state] ?? s.name;
};
const lerESPN = (no, slugPadrao) => {
  const espn = $(no).first().json;
  for (const ev of espn.events ?? []) {
    const comp = ev.competitions[0];
    const lados = comp.competitors;
    const casa = lados.find((l) => l.homeAway === 'home');
    const fora = lados.find((l) => l.homeAway === 'away');
    // Contexto extra que a ESPN já entrega no placar (útil para o Gemini na NFL)
    const tv = (comp.broadcasts ?? []).flatMap((b) => b.names ?? []).join(', ');
    const local = comp.venue?.address;
    const extras = [
      ...(comp.notes ?? []).map((n) => n.headline),
      comp.neutralSite && local?.country ? `Campo neutro: ${[local.city, local.country].filter(Boolean).join(', ')}` : null,
      tv ? `TV nos EUA: ${tv}` : null,
    ].filter(Boolean);
    adicionar(espn.leagues?.[0]?.slug ?? slugPadrao, {
      id: `espn-${ev.id}`,
      utc: ev.date,
      mandante: casa.team.shortDisplayName ?? casa.team.displayName,
      visitante: fora.team.shortDisplayName ?? fora.team.displayName,
      idMandante: casa.team.id,
      idVisitante: fora.team.id,
      nomesMandante: [casa.team.displayName, casa.team.shortDisplayName],
      nomesVisitante: [fora.team.displayName, fora.team.shortDisplayName],
      timeMandante: acharTime(casa.team.displayName, casa.team.shortDisplayName),
      timeVisitante: acharTime(fora.team.displayName, fora.team.shortDisplayName),
      campanhaMandante: casa.records?.[0]?.summary,
      campanhaVisitante: fora.records?.[0]?.summary,
      status: statusESPN(ev.status.type),
      fase: espn.leagues?.[0]?.season?.type?.name ?? null,
      rodada: espn.week?.number ?? null,
      extras: extras.join(' · ') || null,
    });
  }
  return !!espn.error;
};
const espnFalhou = lerESPN('ESPN', 'uefa.europa');
const nflFalhou = lerESPN('ESPN NFL', 'nfl');
const nbaFalhou = lerESPN('ESPN NBA', 'nba');

// ---------- Desfalques ----------
// Cada desfalque vira { nome, texto, fora }: "texto" é o que vai para o Gemini e "fora" separa quem
// certamente não joga (fora, lista de lesionados, suspenso) de quem é dúvida.
const MAX_POR_TIME = 12;
const statusEmPortugues = {
  'Out': 'fora',
  'Injured Reserve': 'fora (lista de lesionados)',
  'Out For Season': 'fora da temporada',
  'Suspension': 'suspenso',
  'Doubtful': 'dúvida, improvável',
  'Questionable': 'dúvida',
  'Day-To-Day': 'dia a dia',
  'Missing Fixture': 'fora',
};
const estaFora = (status) => /^fora|suspenso/.test(status);
const desfalque = (nome, posicao, status, motivo) => ({
  nome,
  texto: `${nome}${posicao ? ` (${posicao})` : ''}: ${[status, motivo].filter(Boolean).join(', ')}`,
  fora: estaFora(status),
});
// Primeiro quem é notícia nesta rodada (fora, suspenso, dúvida); quem está fora há tempo (lista de lesionados) vai por último
const prioridade = (d) => (/lesionados|temporada/.test(d.texto) ? 2 : d.fora ? 0 : 1);
const ordenar = (lista) => [...lista].sort((a, b) => prioridade(a) - prioridade(b)).slice(0, MAX_POR_TIME);

// ESPN (NFL e NBA): uma chamada traz a liga inteira, agrupada por time. O id do time é o mesmo do placar.
const lesoesESPN = (no, liga) => {
  const resposta = $(no).first().json;
  for (const time of resposta.injuries ?? []) {
    const lista = (time.injuries ?? [])
      .filter((l) => l.status && l.status !== 'Active')
      .map((l) => {
        const status = statusEmPortugues[l.status] ?? l.status.toLowerCase();
        const motivo = [l.details?.type, l.details?.detail].filter((d) => d && d !== 'Not Specified').join(' ');
        return desfalque(l.athlete?.displayName, l.athlete?.position?.abbreviation, status, motivo);
      });
    for (const j of jogos.filter((x) => x.codigo === liga)) {
      if (String(j.idMandante) === String(time.id)) j.desfalquesMandante = ordenar(lista);
      if (String(j.idVisitante) === String(time.id)) j.desfalquesVisitante = ordenar(lista);
    }
  }
  return !resposta.injuries;
};
const nflLesoesFalhou = jogos.some((j) => j.codigo === 'nfl') && lesoesESPN('ESPN NFL lesões', 'nfl');
const nbaLesoesFalhou = jogos.some((j) => j.codigo === 'nba') && lesoesESPN('ESPN NBA lesões', 'nba');

// API-Football (futebol): a chamada traz os desfalques de todos os jogos do dia, no mundo inteiro.
// Os ids não batem com os da football-data/ESPN, então o jogo é achado pelo horário de início
// e o time pelo nome (grafias da tabela Times ou palavras em comum: "Man United" ~ "Manchester United").
const GENERICAS = new Set(['fc', 'cf', 'ac', 'sc', 'afc', 'cd', 'ca', 'ec', 'se', 'rc', 'ssc', 'as', 'club', 'clube', 'de', 'da', 'do', 'the', 'calcio', 'futebol', 'football', 'esporte']);
const palavras = (s) => semAcento(s).replace(/[^a-z0-9]+/g, ' ').split(' ').filter((p) => p.length > 1 && !GENERICAS.has(p));
const parecido = (nomeApi, nomes) => {
  const canonico = acharTime(nomeApi)?.nome;
  if (canonico && nomes.includes(canonico)) return 1;
  const a = palavras(nomeApi);
  let melhor = 0;
  for (const n of nomes) {
    const b = palavras(n);
    if (!a.length || !b.length) continue;
    // "Man" casa com "Manchester": conta prefixos com pelo menos 3 letras
    const comuns = a.filter((p) => b.some((q) => p === q || (Math.min(p.length, q.length) >= 3 && (p.startsWith(q) || q.startsWith(p)))));
    melhor = Math.max(melhor, comuns.length / Math.min(a.length, b.length));
  }
  return melhor;
};

const futebol = jogos.filter((j) => !['nfl', 'nba'].includes(j.codigo));
const apiFootball = $('API-Football lesões').first().json;
const errosApi = apiFootball.errors && !Array.isArray(apiFootball.errors) ? Object.values(apiFootball.errors) : [];
const erroFutebol = !futebol.length ? null
  : apiFootball.error ? (apiFootball.error.message ?? String(apiFootball.error))
  : errosApi.length ? errosApi.join(' ')
  : null;
for (const l of apiFootball.response ?? []) {
  const inicio = (l.fixture?.timestamp ?? 0) * 1000;
  for (const j of futebol) {
    if (Math.abs(DateTime.fromISO(j.utc).toMillis() - inicio) > 15 * 60 * 1000) continue;
    const casa = parecido(l.team.name, j.nomesMandante);
    const fora = parecido(l.team.name, j.nomesVisitante);
    if (Math.max(casa, fora) < 0.5) continue;
    const lado = casa >= fora ? 'desfalquesMandante' : 'desfalquesVisitante';
    const status = statusEmPortugues[l.player.type] ?? String(l.player.type ?? '').toLowerCase();
    (j[lado] ??= []).push(desfalque(l.player.name, null, status, l.player.reason));
    break;
  }
}
for (const j of futebol) {
  if (j.desfalquesMandante) j.desfalquesMandante = ordenar(j.desfalquesMandante);
  if (j.desfalquesVisitante) j.desfalquesVisitante = ordenar(j.desfalquesVisitante);
}

jogos.sort((a, b) => a.ordem - b.ordem || a.horarioISO.localeCompare(b.horarioISO));

return [{
  json: {
    data: hoje, total: jogos.length, jogos, espnFalhou, nflFalhou, nbaFalhou,
    nflLesoesFalhou, nbaLesoesFalhou, erroFutebol,
  },
}];
