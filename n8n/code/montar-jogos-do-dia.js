// Nó Code "Montar jogos do dia" (modo: Run Once for All Items)
// Junta os jogos da football-data e da ESPN, converte para o horário de Brasília,
// fica só com os jogos de hoje e marca o peso de cada time a partir da tabela Times.

const TZ = 'America/Sao_Paulo';
const hoje = $now.setZone(TZ).toFormat('yyyy-MM-dd');

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
  if (inicio.toFormat('yyyy-MM-dd') !== hoje) return;
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
    mandante: jogo.mandante,
    visitante: jogo.visitante,
    idMandante: jogo.idMandante ?? null,
    idVisitante: jogo.idVisitante ?? null,
    pesoMandante,
    pesoVisitante,
    pesoTotal: pesoMandante + pesoVisitante,
    status: jogo.status,
    fase: jogo.fase ?? null,
    rodada: jogo.rodada ?? null,
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
    timeMandante: acharTime(m.homeTeam.name, m.homeTeam.shortName),
    timeVisitante: acharTime(m.awayTeam.name, m.awayTeam.shortName),
    status: statusFD[m.status] ?? m.status,
    fase: m.stage,
    rodada: m.matchday,
  });
}

// ESPN (só Europa League). Se a ESPN falhar, o nó segue sem esses jogos.
const statusESPN = (s) => {
  if (s.name === 'STATUS_POSTPONED') return 'Adiado';
  if (s.name === 'STATUS_CANCELED') return 'Cancelado';
  return { pre: 'Agendado', in: 'Ao vivo', post: 'Encerrado' }[s.state] ?? s.name;
};
const espn = $('ESPN').first().json;
for (const ev of espn.events ?? []) {
  const lados = ev.competitions[0].competitors;
  const casa = lados.find((l) => l.homeAway === 'home').team;
  const fora = lados.find((l) => l.homeAway === 'away').team;
  adicionar(espn.leagues?.[0]?.slug ?? 'uefa.europa', {
    id: `espn-${ev.id}`,
    utc: ev.date,
    mandante: casa.shortDisplayName ?? casa.displayName,
    visitante: fora.shortDisplayName ?? fora.displayName,
    timeMandante: acharTime(casa.displayName, casa.shortDisplayName),
    timeVisitante: acharTime(fora.displayName, fora.shortDisplayName),
    status: statusESPN(ev.status.type),
  });
}

jogos.sort((a, b) => a.ordem - b.ordem || a.horarioISO.localeCompare(b.horarioISO));

return [{ json: { data: hoje, total: jogos.length, jogos, espnFalhou: !!espn.error } }];
