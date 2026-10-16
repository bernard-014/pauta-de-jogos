# Manual de uso: Pauta de Jogos

Para quem trabalha na produção e usa a pauta no dia a dia. Nada aqui exige mexer no n8n nem em código: tudo se ajusta no Airtable.

## O que chega todo dia

Às 7h o bot manda no Telegram os jogos selecionados do dia, separados em **Brasil**, **Copas** e **Europa**:

- 🔥 **jogão** (nota 5): clássico, confronto direto no topo, decisão ou time brasileiro decidindo algo.
- ⭐ **bom jogo** (nota 4): pelo menos um time gigante ou dois times da parte de cima da tabela.
- ▫️ demais jogos de campeonatos em que entram todos (Brasileirão e Libertadores).

Abaixo de cada jogo vem um briefing de até duas frases escrito pelo LLM a partir da tabela de classificação. **Confira antes de usar no ar**: o modelo é instruído a não inventar escalações ou resultados, mas ainda é um texto gerado.

Quando a 365Scores lista onde o jogo passa, vem uma linha 📺 com os canais no Brasil, por exemplo *📺 SporTV 2, DAZN*. Jogo sem essa linha é jogo sem transmissão informada (comum na pré-temporada da NBA).

Quando há desfalque que importa, vem uma linha 🚑 com até 3 nomes, por exemplo *🚑 Jalen Hurts (Eagles, fora); Baker Mayfield (Buccaneers, dúvida)*. A lista de lesionados e suspensos vem das fontes (ESPN para NFL e NBA, API-Football para futebol). O LLM só escolhe quais importam, e qualquer nome que não esteja na lista da fonte é descartado antes de ir para a mensagem. Mesmo assim, a situação do jogador pode mudar até a hora do jogo.

Se aparecer o aviso ⚠️ *"O Gemini não respondeu hoje"*, as notas foram calculadas só pelo peso dos times e não há briefing. Se aparecer ⚠️ *"A ESPN não respondeu"*, a Europa League (ou a NFL ou a NBA, conforme o aviso) pode estar faltando. Os avisos *"não mandou as lesões"* e *"API-Football falhou"* querem dizer que a pauta saiu normal, só sem a linha de desfalques daquele esporte. O aviso *"A 365Scores não respondeu"* quer dizer que a pauta saiu sem a linha 📺.

## Onde ver todos os jogos

Na base **Pauta de Jogos** do Airtable, tabela **Jogos**, view **Jogos do Dia**. Lá ficam todos os jogos selecionados, com:

| Coluna | O que é |
|---|---|
| Nota | 1 a 5, dada pelo LLM |
| Por que a nota | Justificativa em uma frase |
| Briefing | O mesmo texto da mensagem |
| Desfalques | Até 3 lesionados ou suspensos relevantes (vazio quando não há) |
| Transmissão | Canais que passam o jogo no Brasil, segundo a 365Scores (vazio quando não há) |
| Status | Agendado, Ao vivo, Encerrado, Adiado ou Cancelado (no momento da coleta) |

## Como mudar o que entra na pauta

### Acompanhar ou parar de acompanhar um campeonato
Tabela **Campeonatos**, coluna **Ativo**. Desmarque para tirar da pauta a partir do dia seguinte.

> Para incluir um campeonato **novo**, é preciso que ele exista na fonte de dados (football-data.org ou ESPN) e cadastrar o **Código** exato dela. Peça para quem cuida do fluxo.

### Mudar quantos jogos entram
Tabela **Campeonatos**:

- **Todos os jogos** marcado: entram todos os jogos daquele campeonato, sem filtro.
- **Limite nota 4**: quantos jogos "bons" (nota 4) entram por dia. Jogos nota 5 entram sempre.
- **Ordem**: posição do campeonato dentro da mensagem.
- **Bloco**: em qual parte da mensagem ele aparece (Brasil, Copas, Europa, NFL ou NBA).

### Dizer que um time importa mais
Tabela **Times**:

- **Peso**: 3 = gigante, 2 = forte. Time que não está na lista conta como 0. O peso entra no prompt do LLM e é a nota de reserva se o LLM falhar.
- **Nomes nas APIs**: todas as grafias do time nas fontes, separadas por vírgula (ex.: `FC Bayern München, Bayern, Bayern Munich`). Se um time importante aparece sem peso, provavelmente falta uma grafia aqui.

## Estrutura do Airtable

**Campeonatos**

| Campo | Tipo |
|---|---|
| Nome | Texto |
| Código | Texto (código da API: `BSA`, `CLI`, `CL`, `PL`, `PD`, `SA`, `BL1`, `FL1`, `uefa.europa`, `nfl`) |
| Fonte | Seleção: `football-data`, `ESPN` |
| Bloco | Seleção: `Brasil`, `Copas`, `Europa`, `NFL`, `NBA` |
| Todos os jogos | Checkbox |
| Limite nota 4 | Número inteiro |
| Ordem | Número inteiro |
| Ativo | Checkbox |
| Jogos | Link para Jogos |

**Times**

| Campo | Tipo |
|---|---|
| Nome | Texto |
| Peso | Número inteiro |
| Nomes nas APIs | Texto longo |

**Jogos**

| Campo | Tipo |
|---|---|
| ID | Texto (`fd-<id>` ou `espn-<id>`, chave do upsert) |
| Data | Data |
| Horário | Data e hora |
| Campeonato | Link para Campeonatos |
| Mandante / Visitante | Texto |
| Status | Seleção: `Agendado`, `Ao vivo`, `Encerrado`, `Adiado`, `Cancelado` |
| Nota | Avaliação (1–5) |
| Por que a nota | Texto longo |
| Briefing | Texto longo |
| Desfalques | Texto longo |
| Transmissão | Texto curto |

## Quando algo dá errado

Manutenção: os nós HTTP separados **ESPN NFL lesões** e **ESPN NBA lesões** mantêm as respostas completas (~10 MB por execução). A reversão foi aplicada e confirmada no n8n publicado em 16/10/2026, com validação sem erros. Falta conferir uma execução completa. A limpeza automática do histórico continua configurada no script de inicialização.

| Sintoma | Causa provável |
|---|---|
| Não chegou mensagem às 7h | O computador com o n8n estava desligado, ou o fluxo foi desativado. |
| "Hoje não tem jogos dos campeonatos acompanhados" | Dia sem jogos nos campeonatos ativos (comum em data FIFA). |
| Jogo importante ficou de fora | Nota abaixo do corte. Veja o *Por que a nota* no Airtable e, se for o caso, aumente o *Limite nota 4* ou o peso do time. |
| Time grande tratado como pequeno | Falta a grafia dele em *Nomes nas APIs*. |
| Jogo de futebol sem desfalques que deveriam aparecer | A API-Football escreve o nome do time de outro jeito. Acrescente essa grafia em *Nomes nas APIs* (ex.: `Bayern München`). Também pode ser que o campeonato não tenha cobertura de lesões na API-Football. |
| Jogo sem linha 📺 que deveria ter | A 365Scores não informou canal, ou o jogo não foi reconhecido lá (horário diferente em mais de 15 min ou nome do time muito diferente: acrescente a grafia da 365Scores em *Nomes nas APIs*). |
| Aviso "A 365Scores não respondeu" | A API do site da 365Scores caiu ou mudou. A pauta sai normal, só sem a transmissão. |
| Aviso "API-Football falhou" | Chave errada ou vencida, cota diária de 100 chamadas estourada, ou o plano grátis não cobre a temporada atual. O texto entre parênteses é a mensagem da própria API. |
