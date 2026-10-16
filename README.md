# Pauta de Jogos ⚽

Fluxo agêntico no **n8n** que, todo dia às 7h, levanta os jogos de futebol, da NFL e da NBA do dia, usa um **LLM (Gemini)** para dar uma nota de relevância e escrever um briefing de cada jogo, guarda tudo no **Airtable** e manda a pauta pronta num bot do **Telegram**.

Feito para resolver uma dor real de quem trabalha com esporte: toda manhã alguém da produção precisa descobrir quais jogos acontecem, quais importam para o público brasileiro e o que dizer sobre cada um. Aqui isso chega pronto no celular antes do expediente.

**Custo: R$ 0.** Tudo roda em planos gratuitos (n8n self-hosted, Airtable Free, Gemini free tier, football-data.org free, ESPN pública, Telegram).

> 🎥 **Vídeo de demonstração (2 min):** _em breve_

---

## Como fica no Telegram

Mensagem real enviada pelo fluxo em 16/10/2026 (17 jogos analisados, 4 selecionados):

```
📅 Pauta de hoje: sexta-feira, 16/10
4 de 17 jogos selecionados · 🔥 jogão · ⭐ bom jogo

🇧🇷 BRASIL

Brasileirão Série A
⭐ 20:00 · Mirassol x Internacional
Internacional busca pontos fora de casa contra o Mirassol para se afastar da
zona de rebaixamento. O confronto é direto na parte inferior da classificação
da Série A.

🏀 NBA

⭐ 20:00 · 76ers x Celtics
76ers e Celtics fazem clássico de conferência na pré-temporada da NBA. É mais
um importante teste de ajustes para a temporada regular.

⭐ 21:00 · Bulls x Timberwolves
Bulls e Timberwolves duelam na pré-temporada da NBA. A equipe de Chicago busca
consolidar sua rotatividade de atletas.

⭐ 23:30 · Lakers x Nuggets
Lakers e Nuggets fazem um dos grandes jogos da rodada de pré-temporada da NBA.
O duelo coloca frente a frente duas potências da Conferência Oeste.
```

Os outros 13 jogos daquele dia (ligas europeias e o resto da rodada de pré-temporada da NBA) foram avaliados pelo LLM, ficaram abaixo da nota de corte ou do limite por campeonato e não entraram. Todos continuam registrados no Airtable com a nota e o motivo.

---

## Arquitetura

```mermaid
flowchart LR
    T["⏰ Schedule Trigger<br/>todo dia às 7h"] --> C[("Airtable<br/>Campeonatos")]
    C --> TM[("Airtable<br/>Times")]
    TM --> FD["football-data.org<br/>jogos do dia"]
    TM --> ES["ESPN<br/>Europa League"]
    TM --> NF["ESPN<br/>NFL"]
    TM --> NB["ESPN<br/>NBA"]
    FD --> JF["Juntar fontes<br/>(Merge)"]
    ES --> JF
    NF --> JF
    NB --> JF
    JF --> MJ["Montar jogos do dia<br/>(fuso, filtro, peso dos times)"]
    MJ --> LC["Ligas com classificação"]
    LC --> CL["football-data.org<br/>tabela de classificação"]
    CL --> PG["Preparar pedido ao Gemini"]
    PG --> G["🤖 Gemini<br/>nota 1–5 + briefing<br/>(JSON estruturado)"]
    G --> SJ["Selecionar jogos<br/>(regras de corte)"]
    SJ --> SA["Separar jogos"] --> AT[("Airtable<br/>Jogos (upsert)")]
    SJ --> MM["Montar mensagem<br/>(HTML, ≤ 4096 caracteres)"] --> TG["📲 Telegram"]
```

| Etapa | Nó no n8n | O que faz |
|---|---|---|
| 1 | **Schedule Trigger** | Dispara às 7h (fuso `America/Sao_Paulo`). |
| 2 | **Campeonatos** / **Times** (Airtable) | Lê a configuração mantida pela produção: quais campeonatos acompanhar, limites por campeonato e o peso de cada time. |
| 3 | **football-data** / **ESPN** / **ESPN NFL** / **ESPN NBA** (HTTP) | Busca os jogos. A football-data cobre Brasileirão, Libertadores, Champions e as 5 grandes ligas; a Europa League não está no plano grátis, então vem do endpoint público da ESPN, assim como a NFL (`football/nfl/scoreboard`, que já traz a campanha dos times, a semana e a TV) e a NBA (`basketball/nba/scoreboard`, que também marca pré-temporada, temporada regular e playoffs). As quatro são independentes, então saem lado a lado do nó Times e se encontram no **Juntar fontes** (Merge, modo Append), que espera todas terminarem. Sem ele, o nó seguinte rodaria uma vez por fonte e a pauta sairia triplicada. O n8n executa ramos um de cada vez, então isso deixa o fluxo mais legível, não mais rápido. |
| 4 | **Montar jogos do dia** (Code) | Junta as quatro fontes num formato único, converte UTC para o horário de Brasília, mantém só os jogos da pauta (de hoje às 6h até amanhã às 6h, para não perder jogo da NBA que começa depois da meia-noite) e casa os nomes dos times com a tabela Times. |
| 5 | **Ligas com classificação** + **Classificação** | Para cada liga com jogo hoje (e que tenha tabela), busca a classificação, que vira contexto para o LLM. |
| 6 | **Preparar pedido ao Gemini** + **Gemini** | Monta o prompt com critérios explícitos de nota e pede a resposta em JSON com `responseSchema` fixo. |
| 7 | **Selecionar jogos** (Code) | Aplica as regras de corte (abaixo). Se o Gemini falhar, calcula a nota pelo peso dos times e o resumo sai mesmo assim. |
| 8 | **Salvar no Airtable** | *Upsert* pela coluna `ID`: rodar duas vezes no mesmo dia atualiza em vez de duplicar. |
| 9 | **Montar mensagem** + **Telegram** | Monta uma mensagem só, com blocos Brasil / Copas / Europa / 🏈 NFL / 🏀 NBA. Só divide em mais de uma se passar do limite de 4096 caracteres do Telegram. |

O código de todos os nós Code está em [`n8n/code/`](n8n/code), comentado.

---

## Regras de seleção

| Campeonato | O que entra |
|---|---|
| Brasileirão e Libertadores | **Todos os jogos** |
| Champions League | Nota 5 sempre + até **4** jogos nota 4 |
| Premier League | Nota 5 sempre + até **3** jogos nota 4 |
| Demais (La Liga, Serie A, Bundesliga, Ligue 1, Europa League) | Nota 5 sempre + até **2** jogos nota 4 |

Os limites ficam na tabela **Campeonatos** do Airtable (colunas *Todos os jogos* e *Limite nota 4*). A produção muda a regra sem mexer no fluxo.

### O que o LLM recebe e devolve

Para cada jogo o Gemini recebe campeonato, fase, rodada, horário, a posição dos dois times na tabela e o peso de cada time. O prompt define o que é nota 5 (clássico, confronto direto no topo, decisão) até nota 1 e proíbe inventar lesões, escalações ou resultados recentes. A resposta vem em JSON validado por schema:

```json
{ "jogos": [ { "id": "fd-123", "nota": 4, "motivo": "...", "briefing": "..." } ] }
```

---

## Decisões de projeto

- **Por que Gemini (`gemini-flash-lite-latest`)?** Tem plano gratuito com cota suficiente para uma chamada por dia. Os modelos `flash` maiores devolveram erro 503 de alta demanda nos testes, e o `flash-lite` respondeu de forma estável com qualidade suficiente para notas e briefings curtos. A escolha foi por custo, cota e estabilidade.
- **Uma chamada só ao LLM por dia**, com todos os jogos no mesmo pedido. Economiza cota e deixa o modelo comparar os jogos entre si.
- **Falha não derruba o resumo.** O nó Gemini tenta de novo com intervalo de 5 s e, se continuar falhando, a nota sai do peso dos times e a mensagem avisa que foi sem LLM. Se a ESPN cair, o resumo sai sem a Europa League, a NFL ou a NBA, com aviso.
- **Configuração no Airtable, não no código.** Campeonatos, limites e peso dos times são editáveis por quem não programa. Ver o [manual de uso](docs/MANUAL.md).
- **Segredos fora do fluxo.** Tokens ficam no `.env` e nas credenciais do n8n. O JSON exportado neste repositório não tem nenhuma chave.

---

## Estrutura do repositório

```
├── n8n/
│   ├── workflow-pauta-de-jogos.json   # fluxo principal (importar no n8n)
│   ├── workflow-smoke-test.json       # testa as 4 APIs de uma vez
│   └── code/                          # código de cada nó Code, comentado
├── airtable/
│   ├── campeonatos.csv                # configuração dos campeonatos
│   ├── times.csv                      # 45 times de futebol com peso e grafias nas APIs
│   ├── times-nfl.csv                  # 32 times da NFL (importar na mesma tabela Times)
│   └── times-nba.csv                  # 30 times da NBA (importar na mesma tabela Times)
├── docs/MANUAL.md                     # manual para a produção
├── start-n8n.ps1                      # sobe o n8n local carregando o .env
├── .env.example
└── ROADMAP.md                         # próximos passos e ideias
```

---

## Como rodar

**Pré-requisitos:** Node.js 20–24 (o n8n ainda não roda no Node 26) e contas gratuitas em [football-data.org](https://www.football-data.org/client/register), [Google AI Studio](https://aistudio.google.com/apikey), [Airtable](https://airtable.com) e um bot criado no [@BotFather](https://t.me/BotFather).

1. **Airtable:** crie uma base com as tabelas `Campeonatos`, `Times` e `Jogos` (campos descritos no [manual](docs/MANUAL.md#estrutura-do-airtable)) e importe os CSVs da pasta `airtable/`. Gere um *personal access token* com acesso a essa base.
2. **Segredos:** copie `.env.example` para `.env` e preencha.
3. **n8n:** instale (`npm install n8n`) e suba com `.\start-n8n.ps1`, ajustando no topo do script o caminho do n8n e do Node. O script carrega o `.env` e libera `{{ $env.* }}` nos nós.
4. **Importe** `n8n/workflow-pauta-de-jogos.json` e crie as credenciais que os nós pedem:
   - *Airtable Personal Access Token*
   - *Header Auth* `X-Auth-Token` para a football-data.org
   - *Header Auth* `x-goog-api-key` para o Gemini
   - *Telegram API* com o token do bot
5. Rode o `workflow-smoke-test.json` para conferir as quatro APIs, execute o fluxo principal manualmente uma vez e depois ative-o.

> O n8n roda local, então o gatilho das 7h só dispara com o PC ligado. Para produção, o mesmo fluxo roda em um servidor ou no n8n Cloud sem alterações.

---

## Próximos passos

Ver o [ROADMAP](ROADMAP.md): NBA pelo mesmo endpoint da ESPN na mensagem e um formulário no Airtable para a equipe pedir cobertura de um jogo.
