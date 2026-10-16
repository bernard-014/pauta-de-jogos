// Nó Code "Montar jogos do dia" (modo: Run Once for All Items)
// Junta os jogos da football-data e da ESPN (Europa League, NFL e NBA), converte para o horário de Brasília,
// fica só com os jogos da pauta de hoje e marca o peso de cada time a partir da tabela Times.

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

jogos.sort((a, b) => a.ordem - b.ordem || a.horarioISO.localeCompare(b.horarioISO));

return [{ json: { data: hoje, total: jogos.length, jogos, espnFalhou, nflFalhou, nbaFalhou } }];
