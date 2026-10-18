// Nó Code "Selecionar jogos" (modo: Run Once for All Items)
// Lê as notas do Gemini (ou, se ele falhou, do Nemotron via OpenRouter) e aplica as regras do resumo:
// - campeonatos com "Todos os jogos" marcado: entram todos;
// - nos outros: nota 5 entra sempre, nota 4 entra até o "Limite nota 4" do campeonato.
// Se os dois falharem, a nota sai do peso dos times e o resumo é enviado mesmo assim (sem briefing nem desfalques).

const { data, jogos } = $('Montar jogos do dia').first().json;

// O nó "Nemotron (reserva)" só roda quando o Gemini não respondeu; se ele não rodou, $('Nemotron (reserva)') dá erro.
const lerGemini = () => {
  const resposta = $('Gemini').first().json;
  return JSON.parse(resposta.candidates[0].content.parts.map((p) => p.text ?? '').join('')).jogos;
};
const lerReserva = () => {
  const resposta = $('Nemotron (reserva)').first().json;
  const texto = resposta.choices[0].message.content.replace(/^\s*```(json)?|```\s*$/g, '');
  return { jogos: JSON.parse(texto).jogos, modelo: resposta.model };
};

let avaliacoes = [];
let llmFalhou = false;
let llmReserva = '';
try {
  avaliacoes = lerGemini();
} catch (e) {
  try {
    const reserva = lerReserva();
    avaliacoes = reserva.jogos;
    llmReserva = reserva.modelo;
  } catch (e2) {
    llmFalhou = jogos.length > 0;
  }
}
if (!Array.isArray(avaliacoes)) avaliacoes = [];
const porId = new Map(avaliacoes.map((a) => [a.id, a]));

const notaPeloPeso = (j) => {
  if (j.pesoTotal >= 5) return 5;
  if (j.pesoTotal >= 4 || Math.max(j.pesoMandante, j.pesoVisitante) === 3) return 4;
  if (j.pesoTotal >= 2) return 3;
  return 2;
};

// Só aceita desfalque que veio das fontes: se o Gemini citar alguém fora da lista do jogo, o nome cai.
const semAcento = (s) => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const conferirDesfalques = (texto, j) => {
  const conhecidos = [...(j.desfalquesMandante ?? []), ...(j.desfalquesVisitante ?? [])].map((d) => semAcento(d.nome));
  return String(texto ?? '')
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s && conhecidos.includes(semAcento(s.split('(')[0])))
    .join('; ');
};

const avaliados = jogos.map((j) => {
  const a = porId.get(j.id);
  const nota = Number.isInteger(a?.nota) ? Math.min(5, Math.max(1, a.nota)) : notaPeloPeso(j);
  return {
    ...j,
    nota,
    motivo: a?.motivo ?? 'Nota calculada pelo peso dos times (sem LLM).',
    briefing: a?.briefing ?? '',
    desfalques: conferirDesfalques(a?.desfalques, j),
  };
});

const porCampeonato = new Map();
for (const j of avaliados) {
  if (!porCampeonato.has(j.codigo)) porCampeonato.set(j.codigo, []);
  porCampeonato.get(j.codigo).push(j);
}

const escolhidos = [];
for (const lista of porCampeonato.values()) {
  if (lista[0].todosOsJogos) {
    escolhidos.push(...lista);
    continue;
  }
  escolhidos.push(...lista.filter((j) => j.nota === 5));
  const nota4 = lista
    .filter((j) => j.nota === 4)
    .sort((a, b) => b.pesoTotal - a.pesoTotal || a.horarioISO.localeCompare(b.horarioISO));
  escolhidos.push(...nota4.slice(0, lista[0].limiteNota4));
}

escolhidos.sort((a, b) => a.ordem - b.ordem || a.horarioISO.localeCompare(b.horarioISO));

return [{
  json: {
    data,
    llmFalhou,
    llmReserva,
    totalAnalisados: jogos.length,
    totalEscolhidos: escolhidos.length,
    jogos: escolhidos,
  },
}];
