// Nó Code "Pedidos 365Scores" (modo: Run Once for All Items)
// Gera um pedido à lista de jogos da 365Scores para cada esporte que tem jogo selecionado na pauta.
// A 365Scores separa por esporte: 1 = futebol, 2 = basquete, 6 = futebol americano.
// A pauta vai de hoje às 6h até amanhã às 6h, então a busca cobre os dois dias.
// Ligue "Always Output Data" nas Settings: assim o fluxo segue até a mensagem mesmo sem jogo selecionado.

const { data, jogos } = $('Selecionar jogos').first().json;
const ESPORTE_365 = { nfl: 6, nba: 2 }; // os demais campeonatos são de futebol

const dia = DateTime.fromISO(data);
const esportes = new Set(jogos.map((j) => ESPORTE_365[j.codigo] ?? 1));

return [...esportes].map((esporte) => ({
  json: {
    esporte,
    inicio: dia.toFormat('dd/MM/yyyy'),
    fim: dia.plus({ days: 1 }).toFormat('dd/MM/yyyy'),
  },
}));
