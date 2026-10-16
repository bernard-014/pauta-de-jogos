// Nó Code "Selecionar jogos" (modo: Run Once for All Items)
// Lê as notas do Gemini e aplica as regras do resumo:
// - campeonatos com "Todos os jogos" marcado: entram todos;
// - nos outros: nota 5 entra sempre, nota 4 entra até o "Limite nota 4" do campeonato.
// Se o Gemini falhar, a nota sai do peso dos times e o resumo é enviado mesmo assim.

const { data, jogos } = $('Montar jogos do dia').first().json;

let avaliacoes = [];
let llmFalhou = false;
try {
  const resposta = $('Gemini').first().json;
  const texto = resposta.candidates[0].content.parts.map((p) => p.text ?? '').join('');
  avaliacoes = JSON.parse(texto).jogos;
} catch (e) {
  llmFalhou = jogos.length > 0;
}
const porId = new Map(avaliacoes.map((a) => [a.id, a]));

const notaPeloPeso = (j) => {
  if (j.pesoTotal >= 5) return 5;
  if (j.pesoTotal >= 4 || Math.max(j.pesoMandante, j.pesoVisitante) === 3) return 4;
  if (j.pesoTotal >= 2) return 3;
  return 2;
};

const avaliados = jogos.map((j) => {
  const a = porId.get(j.id);
  const nota = Number.isInteger(a?.nota) ? Math.min(5, Math.max(1, a.nota)) : notaPeloPeso(j);
  return {
    ...j,
    nota,
    motivo: a?.motivo ?? 'Nota calculada pelo peso dos times (sem LLM).',
    briefing: a?.briefing ?? '',
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
    totalAnalisados: jogos.length,
    totalEscolhidos: escolhidos.length,
    jogos: escolhidos,
  },
}];
