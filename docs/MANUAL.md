# Manual de uso: Pauta de Jogos

Para quem trabalha na produção e usa a pauta no dia a dia. Nada aqui exige mexer no n8n nem em código: tudo se ajusta no Airtable.

## O que chega todo dia

Às 7h o bot manda no Telegram os jogos selecionados do dia, separados em **Brasil**, **Copas** e **Europa**:

- 🔥 **jogão** (nota 5): clássico, confronto direto no topo, decisão ou time brasileiro decidindo algo.
- ⭐ **bom jogo** (nota 4): pelo menos um time gigante ou dois times da parte de cima da tabela.
- ▫️ demais jogos de campeonatos em que entram todos (Brasileirão e Libertadores).

Abaixo de cada jogo vem um briefing de até duas frases escrito pelo LLM a partir da tabela de classificação. **Confira antes de usar no ar**: o modelo é instruído a não inventar lesões, escalações ou resultados, mas ainda é um texto gerado.

Se aparecer o aviso ⚠️ *"O Gemini não respondeu hoje"*, as notas foram calculadas só pelo peso dos times e não há briefing. Se aparecer ⚠️ *"A ESPN não respondeu"*, a Europa League pode estar faltando.

## Onde ver todos os jogos

Na base **Pauta de Jogos** do Airtable, tabela **Jogos**, view **Jogos do Dia**. Lá ficam todos os jogos selecionados, com:

| Coluna | O que é |
|---|---|
| Nota | 1 a 5, dada pelo LLM |
| Por que a nota | Justificativa em uma frase |
| Briefing | O mesmo texto da mensagem |
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
- **Bloco**: em qual parte da mensagem ele aparece (Brasil, Copas ou Europa).

### Dizer que um time importa mais
Tabela **Times**:

- **Peso**: 3 = gigante, 2 = forte. Time que não está na lista conta como 0. O peso entra no prompt do LLM e é a nota de reserva se o LLM falhar.
- **Nomes nas APIs**: todas as grafias do time nas fontes, separadas por vírgula (ex.: `FC Bayern München, Bayern, Bayern Munich`). Se um time importante aparece sem peso, provavelmente falta uma grafia aqui.

## Estrutura do Airtable

**Campeonatos**

| Campo | Tipo |
|---|---|
| Nome | Texto |
| Código | Texto (código da API: `BSA`, `CLI`, `CL`, `PL`, `PD`, `SA`, `BL1`, `FL1`, `uefa.europa`) |
| Fonte | Seleção: `football-data`, `ESPN` |
| Bloco | Seleção: `Brasil`, `Copas`, `Europa` |
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

## Quando algo dá errado

| Sintoma | Causa provável |
|---|---|
| Não chegou mensagem às 7h | O computador com o n8n estava desligado, ou o fluxo foi desativado. |
| "Hoje não tem jogos dos campeonatos acompanhados" | Dia sem jogos nos campeonatos ativos (comum em data FIFA). |
| Jogo importante ficou de fora | Nota abaixo do corte. Veja o *Por que a nota* no Airtable e, se for o caso, aumente o *Limite nota 4* ou o peso do time. |
| Time grande tratado como pequeno | Falta a grafia dele em *Nomes nas APIs*. |
