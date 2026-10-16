// Nó Code "Montar mensagem" (modo: Run Once for All Items)
// Monta o resumo do dia em HTML do Telegram: uma mensagem só, separada por blocos (Brasil, Copas, Europa, NFL, NBA).
// O Telegram aceita até 4096 caracteres por mensagem; só se passar disso o texto é dividido em mais de uma.

const LIMITE = 3900;
const { data, jogos, llmFalhou, totalAnalisados } = $('Selecionar jogos').first().json;
const { espnFalhou, nflFalhou, nbaFalhou, nflLesoesFalhou, nbaLesoesFalhou, erroFutebol } = $('Montar jogos do dia').first().json;

const html = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const selo = (nota) => (nota === 5 ? '🔥' : nota === 4 ? '⭐' : '▫️');
const dia = DateTime.fromISO(data).setLocale('pt-BR').toFormat("cccc, dd/MM");

const blocos = [
  { nome: 'Brasil', titulo: '🇧🇷 <b>BRASIL</b>' },
  { nome: 'Copas', titulo: '🏆 <b>COPAS</b>' },
  { nome: 'Europa', titulo: '🌍 <b>EUROPA</b>' },
  { nome: 'NFL', titulo: '🏈 <b>NFL</b>' },
  { nome: 'NBA', titulo: '🏀 <b>NBA</b>' },
];

const cabecalho = jogos.length
  ? `📅 <b>Pauta de hoje: ${html(dia)}</b>\n${jogos.length} de ${totalAnalisados} jogos selecionados · 🔥 jogão · ⭐ bom jogo`
  : `📅 <b>Pauta de hoje: ${html(dia)}</b>\nHoje não tem jogos dos campeonatos acompanhados.`;

const avisos = [];
if (llmFalhou) avisos.push('⚠️ O Gemini não respondeu hoje: notas calculadas pelo peso dos times, sem briefing.');
if (espnFalhou) avisos.push('⚠️ A ESPN não respondeu: a Europa League pode estar faltando.');
if (nflFalhou) avisos.push('⚠️ A ESPN não respondeu: os jogos da NFL podem estar faltando.');
if (nbaFalhou) avisos.push('⚠️ A ESPN não respondeu: os jogos da NBA podem estar faltando.');
if (nflLesoesFalhou) avisos.push('⚠️ A ESPN não mandou as lesões da NFL: desfalques ficaram de fora.');
if (nbaLesoesFalhou) avisos.push('⚠️ A ESPN não mandou as lesões da NBA: desfalques ficaram de fora.');
if (erroFutebol) avisos.push(`⚠️ API-Football falhou (${html(erroFutebol.slice(0, 150))}): desfalques do futebol ficaram de fora.`);

const mensagens = [];
let atual = cabecalho;
const fechar = () => { if (atual.trim()) mensagens.push(atual); atual = ''; };
const adicionar = (trecho) => {
  if (atual && (atual + '\n\n' + trecho).length > LIMITE) fechar();
  atual = atual ? `${atual}\n\n${trecho}` : trecho;
};

for (const bloco of blocos) {
  const doBloco = jogos.filter((j) => j.bloco === bloco.nome);
  if (!doBloco.length) continue;
  adicionar(bloco.titulo);
  let campeonatoAtual = null;
  for (const j of doBloco) {
    const linhas = [];
    // Subtítulo do campeonato, menos quando repete o nome do bloco (NFL, NBA)
    if (j.campeonato !== campeonatoAtual) {
      if (j.campeonato !== bloco.nome) linhas.push(`<u>${html(j.campeonato)}</u>`);
      campeonatoAtual = j.campeonato;
    }
    linhas.push(`${selo(j.nota)} <b>${j.horario}</b> · ${html(j.mandante)} x ${html(j.visitante)}`);
    if (j.briefing) linhas.push(`<i>${html(j.briefing)}</i>`);
    if (j.desfalques) linhas.push(`🚑 ${html(j.desfalques)}`);
    adicionar(linhas.join('\n'));
  }
}
if (avisos.length) adicionar(avisos.join('\n'));
fechar();

return mensagens.map((texto) => ({ json: { texto } }));
