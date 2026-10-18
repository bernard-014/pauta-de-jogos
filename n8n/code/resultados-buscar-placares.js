// Nó Code "Buscar placares" do workflow "Como foram os jogos" (modo: Run Once for All Items)
// Busca o resultado dos jogos que entraram na pauta do dia anterior (tabela Jogos do Airtable).
// - football-data: o placar oficial dos jogos "fd-<id>", numa chamada só, pelos ids.
// - ESPN: para todos os jogos, porque o placar dela traz o "como foi": minuto e autor dos gols, expulsões,
//   posse de bola, placar por quarto e destaques da NBA/NFL. A ESPN não aceita intervalo de datas, então é
//   uma chamada por liga e por dia (o dia é o dos EUA: um jogo da NBA às 0h30 de Brasília ainda é "ontem" lá).
// As respostas da ESPN (40 a 200 KB por liga) são enxugadas aqui, para a execução não guardar o que não usa.
// As chamadas ficam neste Code, e não em nós HTTP, porque as duas fontes nem sempre são usadas: com nós HTTP
// seria preciso IF + Merge, e o Merge trava quando um dos lados não tem item. O token sai das mensagens de erro.

const TZ = 'America/Sao_Paulo';
const token = $env.FOOTBALL_DATA_TOKEN;
const semSegredo = (e) => String(e?.message ?? e).split(token).join('***');
const campos = (item) => ({ id: item.json.id, ...(item.json.fields ?? item.json) });

const { data } = $('Dia da pauta').first().json;

// Caminho de cada campeonato na ESPN (o código é o da tabela Campeonatos)
const CAMINHO_ESPN = {
  BSA: 'soccer/bra.1',
  CLI: 'soccer/conmebol.libertadores',
  CL: 'soccer/uefa.champions',
  PL: 'soccer/eng.1',
  PD: 'soccer/esp.1',
  SA: 'soccer/ita.1',
  BL1: 'soccer/ger.1',
  FL1: 'soccer/fra.1',
  'uefa.europa': 'soccer/uefa.europa',
  nfl: 'football/nfl',
  nba: 'basketball/nba',
};

const campeonatos = new Map($('Campeonatos').all().map(campos).map((c) => [c.id, c]));

// Sem jogo no dia, o Airtable devolve um item vazio (Always Output Data): ele fica de fora aqui
const jogos = $('Jogos da pauta').all().map(campos).filter((j) => j.ID).map((j) => {
  const c = campeonatos.get((j.Campeonato ?? [])[0]) ?? {};
  return {
    id: j.ID,
    campeonato: c.Nome ?? '',
    codigo: c['Código'] ?? '',
    caminhoEspn: CAMINHO_ESPN[c['Código']] ?? null,
    horario: j['Horário'],
    mandante: j.Mandante,
    visitante: j.Visitante,
    nota: j.Nota,
    porQueANota: j['Por que a nota'] ?? '',
    briefing: j.Briefing ?? '',
  };
});

const falhas = [];

// ---------- football-data ----------
const idsFD = jogos.filter((j) => j.id.startsWith('fd-')).map((j) => j.id.slice(3));
let fd = [];
if (idsFD.length) {
  try {
    const r = await this.helpers.httpRequest({
      url: 'https://api.football-data.org/v4/matches',
      qs: { ids: idsFD.join(',') },
      headers: { 'X-Auth-Token': token },
      json: true,
      timeout: 30000,
    });
    fd = (r.matches ?? []).map((m) => ({
      id: `fd-${m.id}`,
      status: m.status,
      nomesMandante: [m.homeTeam.name, m.homeTeam.shortName].filter(Boolean),
      nomesVisitante: [m.awayTeam.name, m.awayTeam.shortName].filter(Boolean),
      final: m.score.fullTime,
      intervalo: m.score.halfTime,
      duracao: m.score.duration,
      penaltis: m.score.penalties ?? null,
    }));
  } catch (e) {
    falhas.push(`football-data: ${semSegredo(e).slice(0, 200)}`);
  }
}

// ---------- ESPN ----------
const lado = (t) => {
  const nota = (t.leaders ?? []).find((l) => l.name === 'rating')?.leaders?.[0];
  return {
    id: String(t.team.id),
    nomes: [t.team.displayName, t.team.shortDisplayName, t.team.name].filter(Boolean),
    homeAway: t.homeAway,
    placar: t.score,
    parciais: (t.linescores ?? []).map((l) => l.value),
    // NBA: "P. Banchero 24 PTS, 7 REB". Na NFL o destaque vem na manchete do jogo.
    destaque: nota ? `${nota.athlete?.shortName ?? nota.athlete?.displayName}: ${nota.displayValue}` : null,
    estatisticas: Object.fromEntries((t.statistics ?? [])
      .filter((s) => ['possessionPct', 'shotsOnTarget', 'totalShots'].includes(s.name))
      .map((s) => [s.name, s.displayValue])),
  };
};
const enxugar = (caminho, ev) => {
  const c = ev.competitions[0];
  return {
    id: String(ev.id),
    caminho,
    utc: ev.date,
    estado: ev.status.type.state, // pre, in, post
    statusNome: ev.status.type.name, // STATUS_FINAL, STATUS_POSTPONED...
    detalhe: ev.status.type.detail, // "Final/OT", "FT", "AET"...
    lados: c.competitors.map(lado),
    lances: (c.details ?? [])
      .filter((d) => d.scoringPlay || d.redCard)
      .map((d) => ({
        minuto: d.clock?.displayValue ?? '',
        gol: !!d.scoringPlay,
        vermelho: !!d.redCard,
        penalti: !!d.penaltyKick,
        contra: !!d.ownGoal,
        jogador: d.athletesInvolved?.[0]?.displayName ?? '',
        timeId: String(d.team?.id ?? ''),
      })),
    manchete: c.headlines?.[0]?.description ?? c.headlines?.[0]?.shortLinkText ?? null,
  };
};

const pedidosESPN = new Set();
for (const j of jogos) {
  if (!j.caminhoEspn || !j.horario) continue;
  const diaEUA = DateTime.fromISO(j.horario).setZone('America/New_York').toFormat('yyyyMMdd');
  pedidosESPN.add(`${j.caminhoEspn}|${diaEUA}`);
}

const espn = [];
for (const pedido of pedidosESPN) {
  const [caminho, dia] = pedido.split('|');
  try {
    const r = await this.helpers.httpRequest({
      url: `https://site.api.espn.com/apis/site/v2/sports/${caminho}/scoreboard`,
      qs: { dates: dia },
      json: true,
      timeout: 30000,
    });
    for (const ev of r.events ?? []) espn.push(enxugar(caminho, ev));
  } catch (e) {
    falhas.push(`ESPN ${caminho} ${dia}: ${semSegredo(e).slice(0, 200)}`);
  }
}

return [{ json: { data, jogos, fd, espn, falhas } }];
