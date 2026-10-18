// Nó Code "Preparar avaliação" do workflow "Como foram os jogos" (modo: Run Once for All Items)
// Monta o pedido ao Gemini para dar a nota de DEPOIS do jogo, na mesma escala de 1 a 5 da pauta.
// O modelo recebe o contexto de antes do jogo (o briefing), mas NÃO recebe a nota prevista: assim ele
// avalia o que aconteceu sem se ancorar no número da manhã, e a comparação entre as duas notas vale alguma coisa.

const { data, jogos } = $('Montar resultados').first().json;

const lista = jogos
  .filter((j) => j.placar)
  .map((j) => ({
    id: j.id,
    campeonato: j.campeonato,
    jogo: `${j.mandante} x ${j.visitante}`,
    antesDoJogo: [j.porQueANota, j.briefing].filter(Boolean).join(' '),
    ...j.fatos,
  }));

const instrucoes = `Você é editor de pauta de um canal de esportes brasileiro e revisa os jogos de ontem.
Todos os jogos abaixo já terminaram. Para cada um, dê a nota que ele mereceu depois de jogado, de 1 a 5,
pensando no público brasileiro: o quanto valeu ter dado destaque a esse jogo.

A nota junta a importância do jogo ("antesDoJogo" diz o que estava em jogo) com o que aconteceu em campo:
5 = jogo para lembrar: virada, gol decisivo no fim, prorrogação ou overtime disputados, zebra grande, goleada de ou sobre time grande, jogo de muitos gols com placar apertado, ou jogo decisivo que cumpriu o que prometia.
4 = bom jogo: disputado, resultado que mexe na tabela ou atuação de destaque de uma estrela.
3 = jogo normal, resultado dentro do esperado.
2 = jogo morno: favorito venceu sem sustos ou empate sem graça.
1 = jogo muito fraco: 0 x 0 sem chances ou decidido cedo, sem nenhum interesse.

Na NBA e na NFL, jogo decidido por poucos pontos ou na prorrogação vale mais; vitória folgada (mais de 15 pontos na NBA, mais de 14 na NFL) vale menos.

Regras:
- Use só os fatos fornecidos (placar, gols, expulsões, virada, parciais, destaques, manchete). Não invente lances, jogadores nem estatísticas.
- Minuto de gol ou expulsão vai exatamente como nos fatos ("aos 89 minutos", "nos acréscimos" para 90'+): não converta para "X do segundo tempo".
- "comoFoi": 1 ou 2 frases curtas em português do Brasil, em tom de jornalista esportivo, com o fato principal do jogo (quem decidiu, virada, goleada, zebra). Cite jogadores só se aparecerem nos fatos.
- Avalie todos os jogos recebidos e devolva cada um com o mesmo id.`;

const body = {
  systemInstruction: { parts: [{ text: instrucoes }] },
  contents: [{ role: 'user', parts: [{ text: `Jogos da pauta de ${data}:\n${JSON.stringify(lista, null, 1)}` }] }],
  generationConfig: {
    temperature: 0.3,
    responseMimeType: 'application/json',
    responseSchema: {
      type: 'OBJECT',
      properties: {
        jogos: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              id: { type: 'STRING' },
              nota: { type: 'INTEGER' },
              comoFoi: { type: 'STRING' },
            },
            required: ['id', 'nota', 'comoFoi'],
          },
        },
      },
      required: ['jogos'],
    },
  },
};

return [{ json: { totalAvaliados: lista.length, body } }];
