// Nó Code "Comparar notas" do workflow "Como foram os jogos" (modo: Run Once for All Items)
// Junta a nota de depois do jogo (Gemini) com a nota prevista na pauta e classifica cada jogo:
// "Na mosca" (mesma nota), "Perto" (1 ponto de diferença), "Superou" ou "Decepcionou" (2 pontos ou mais).
// Se o Gemini falhar, os placares seguem sem a nota de depois do jogo.

const { data, jogos, falhas } = $('Montar resultados').first().json;
const resposta = $('Gemini').first().json;

let avaliacoes = new Map();
let llmFalhou = false;
try {
  const texto = resposta.candidates[0].content.parts.map((p) => p.text ?? '').join('');
  avaliacoes = new Map(JSON.parse(texto).jogos.map((a) => [a.id, a]));
} catch (e) {
  llmFalhou = jogos.some((j) => j.placar);
}

const acerto = (diferenca) => {
  if (diferenca === 0) return 'Na mosca';
  if (Math.abs(diferenca) === 1) return 'Perto';
  return diferenca > 0 ? 'Superou' : 'Decepcionou';
};

const resultado = jogos.map((j) => {
  const a = avaliacoes.get(j.id);
  const notaJogo = a && Number.isInteger(a.nota) ? Math.min(5, Math.max(1, a.nota)) : null;
  const comparavel = j.placar && notaJogo != null && Number.isInteger(j.nota);
  return {
    ...j,
    notaJogo,
    comoFoi: a?.comoFoi ?? null,
    diferenca: comparavel ? notaJogo - j.nota : null,
    acerto: comparavel ? acerto(notaJogo - j.nota) : null,
  };
});

const avaliados = resultado.filter((j) => j.acerto);
const contar = (nome) => avaliados.filter((j) => j.acerto === nome).length;
const resumo = {
  total: resultado.length,
  avaliados: avaliados.length,
  naMosca: contar('Na mosca'),
  perto: contar('Perto'),
  superou: contar('Superou'),
  decepcionou: contar('Decepcionou'),
};

return [{ json: { data, jogos: resultado, resumo, llmFalhou, falhas } }];
