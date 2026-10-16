// Nó Code "Lesões ESPN" (modo: Run Once for All Items)
// Busca as lesões da NFL e da NBA na ESPN e devolve só o que o fluxo usa.
// A resposta da NFL tem ~9 MB (textos longos, links, logos). Se viesse de um nó HTTP, o n8n guardaria
// tudo no histórico de execuções todo dia. Aqui o arquivo grande passa só pela memória e sai com poucos KB.
// Se uma liga falhar, ela sai como null e a mensagem avisa; a outra segue normal.

const URL = 'https://site.api.espn.com/apis/site/v2/sports';
const ligas = { nfl: 'football/nfl', nba: 'basketball/nba' };

const enxugar = (resposta) => (resposta.injuries ?? []).map((time) => ({
  id: time.id,
  injuries: (time.injuries ?? [])
    .filter((l) => l.status && l.status !== 'Active')
    .map((l) => ({
      status: l.status,
      nome: l.athlete?.displayName,
      posicao: l.athlete?.position?.abbreviation ?? null,
      tipo: l.details?.type ?? null,
      detalhe: l.details?.detail ?? null,
    })),
}));

const saida = {};
for (const [liga, caminho] of Object.entries(ligas)) {
  try {
    const resposta = await this.helpers.httpRequest({ url: `${URL}/${caminho}/injuries`, json: true, timeout: 30000 });
    saida[liga] = enxugar(resposta);
  } catch (e) {
    saida[liga] = null;
  }
}

return [{ json: saida }];
