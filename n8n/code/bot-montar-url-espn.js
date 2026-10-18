// Nó Code "Montar URL" do subfluxo "Bot - placar ESPN" (modo: Run Once for All Items)
// Traduz a liga pedida pelo AI Agent para o caminho da ESPN e confere a data.
// Liga fora da lista vira erro com as opções válidas, para o agente tentar de novo.

const ligas = {
  nfl: 'football/nfl',
  nba: 'basketball/nba',
  'bra.1': 'soccer/bra.1',
  'conmebol.libertadores': 'soccer/conmebol.libertadores',
  'uefa.champions': 'soccer/uefa.champions',
  'uefa.europa': 'soccer/uefa.europa',
  'eng.1': 'soccer/eng.1',
  'esp.1': 'soccer/esp.1',
  'ita.1': 'soccer/ita.1',
  'ger.1': 'soccer/ger.1',
  'fra.1': 'soccer/fra.1',
};

const liga = String($json.liga ?? '').toLowerCase().trim();
const caminho = ligas[liga];
if (!caminho) {
  return [{ json: { erro: `Liga desconhecida: "${$json.liga}". Use uma destas: ${Object.keys(ligas).join(', ')}.` } }];
}

const dia = DateTime.fromISO(String($json.data ?? ''), { zone: 'America/Sao_Paulo' });
if (!dia.isValid) {
  return [{ json: { erro: `Data inválida: "${$json.data}". Use o formato AAAA-MM-DD.` } }];
}

return [{
  json: {
    liga,
    url: `https://site.api.espn.com/apis/site/v2/sports/${caminho}/scoreboard?dates=${dia.toFormat('yyyyMMdd')}`,
  },
}];
