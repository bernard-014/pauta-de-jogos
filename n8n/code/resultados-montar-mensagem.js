// Nó Code "Montar mensagem" do workflow "Como foram os jogos" (modo: Run Once for All Items)
// Mensagem do Telegram (HTML) com o resultado dos jogos da pauta de ontem e o acerto das notas.
// Os jogos vêm separados em: os que surpreenderam, os que decepcionaram e os que saíram como previsto.
// Sem jogo na pauta de ontem, não sai mensagem (nada para comparar).

const LIMITE = 3900;
const { data, jogos, resumo, llmFalhou, falhas } = $('Comparar notas').first().json;
if (!jogos.length) return [];

const html = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const selo = (nota) => (nota === 5 ? '🔥' : nota === 4 ? '⭐' : '▫️');
const dia = DateTime.fromISO(data).setLocale('pt-BR').toFormat('cccc, dd/MM');

const cabecalho = [`📊 <b>Como foram os jogos: ${html(dia)}</b>`];
if (resumo.avaliados) {
  cabecalho.push('Nota da pauta → nota depois do jogo (1 a 5)');
  const errou = resumo.superou + resumo.decepcionou;
  cabecalho.push(`🎯 ${resumo.naMosca} de ${resumo.avaliados} na mosca · ${resumo.perto} por 1 ponto · ${errou} ${errou === 1 ? 'errou' : 'erraram'} por 2 ou mais`);
}

const linhasDoJogo = (j) => {
  const linhas = [`${selo(j.nota)} <b>${html(j.mandante)} ${html(j.placar)} ${html(j.visitante)}</b> · ${html(j.campeonato)}`];
  if (j.notaJogo != null) linhas.push(`Nota ${j.nota} → ${j.notaJogo}`);
  else linhas.push(`Nota da pauta: ${j.nota}`);
  if (j.comoFoi) linhas.push(`<i>${html(j.comoFoi)}</i>`);
  return linhas.join('\n');
};

// Maior diferença primeiro dentro de cada grupo; empate pelo horário
const ordenar = (lista) => lista.sort((a, b) => Math.abs(b.diferenca ?? 0) - Math.abs(a.diferenca ?? 0) || String(a.horario).localeCompare(String(b.horario)));
const comPlacar = jogos.filter((j) => j.placar);
const grupos = [
  { titulo: '📈 <b>SURPREENDERAM</b>', jogos: ordenar(comPlacar.filter((j) => j.acerto === 'Superou')) },
  { titulo: '📉 <b>DECEPCIONARAM</b>', jogos: ordenar(comPlacar.filter((j) => j.acerto === 'Decepcionou')) },
  { titulo: '🎯 <b>COMO PREVISTO</b>', jogos: ordenar(comPlacar.filter((j) => ['Na mosca', 'Perto'].includes(j.acerto))) },
  { titulo: '📋 <b>RESULTADOS</b>', jogos: ordenar(comPlacar.filter((j) => !j.acerto)) },
];
const semResultado = jogos.filter((j) => !j.placar);

const avisos = [];
if (llmFalhou) avisos.push('⚠️ O Gemini não respondeu: placares sem a nota de depois do jogo.');
if (falhas.length) avisos.push(`⚠️ Fonte fora do ar (${html(falhas.map((f) => f.split(':')[0]).join(', '))}): alguns jogos podem estar sem placar ou sem detalhes.`);

const mensagens = [];
let atual = cabecalho.join('\n');
const fechar = () => { if (atual.trim()) mensagens.push(atual); atual = ''; };
const adicionar = (trecho) => {
  if (atual && (atual + '\n\n' + trecho).length > LIMITE) fechar();
  atual = atual ? `${atual}\n\n${trecho}` : trecho;
};

for (const g of grupos) {
  if (!g.jogos.length) continue;
  adicionar(g.titulo);
  for (const j of g.jogos) adicionar(linhasDoJogo(j));
}
if (semResultado.length) {
  adicionar(['⏸️ <b>SEM RESULTADO</b>', ...semResultado.map((j) => `${html(j.mandante)} x ${html(j.visitante)}: ${html(j.situacao.toLowerCase())}`)].join('\n'));
}
if (avisos.length) adicionar(avisos.join('\n'));
fechar();

return mensagens.map((texto) => ({ json: { texto } }));
