// Nó Code "Separar resultados" do workflow "Como foram os jogos" (modo: Run Once for All Items)
// Um item por jogo, só com as colunas do resultado. O nó Airtable seguinte faz upsert pela coluna ID:
// como só vão estas colunas, a nota, o briefing e os outros campos gravados pela pauta ficam como estão.

const { jogos } = $('Comparar notas').first().json;

return jogos
  .filter((j) => j.situacao !== 'Sem dados')
  .map((j) => {
    const campos = { ID: j.id, Status: j.situacao };
    if (j.placar) campos['Placar'] = j.placar;
    if (j.notaJogo != null) campos['Nota do jogo'] = j.notaJogo;
    if (j.comoFoi) campos['Como foi'] = j.comoFoi;
    if (j.acerto) campos['Acerto da nota'] = j.acerto;
    return { json: campos };
  });
