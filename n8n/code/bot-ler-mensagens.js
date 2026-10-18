// Nó Code "Ler mensagens" do workflow "Bot da Pauta" (modo: Run Once for All Items)
// Faz o long polling no Telegram (getUpdates segura a conexão por até 30 s), confirma a leitura
// e devolve um item por mensagem nova (texto ou áudio) vinda do chat autorizado (TELEGRAM_CHAT_ID).
// As chamadas ficam aqui, e não num nó HTTP, porque o token do bot vai na URL e o nó HTTP grava
// a URL inteira no log quando falha. Aqui o erro sai sem o token.

const token = $env.TELEGRAM_BOT_TOKEN;
const semToken = (e) => String(e?.message ?? e).split(token).join('***');
const getUpdates = (qs, timeout) =>
  this.helpers.httpRequest({ url: `https://api.telegram.org/bot${token}/getUpdates`, qs, json: true, timeout });

let updates;
try {
  updates = (await getUpdates({ timeout: 30, allowed_updates: '["message"]' }, 45000)).result ?? [];
} catch (e) {
  throw new Error(`Falha ao ler mensagens do Telegram: ${semToken(e)}`);
}
if (updates.length === 0) return [];

// Chamar getUpdates com offset = último id + 1 faz o Telegram esquecer as mensagens já lidas.
// Confirmar antes de responder evita resposta repetida se a próxima execução começar antes desta acabar.
// Se a confirmação falhar, nada é respondido agora: a próxima execução lê as mesmas mensagens.
try {
  await getUpdates({ offset: updates[updates.length - 1].update_id + 1, timeout: 0, limit: 1 }, 15000);
} catch (e) {
  throw new Error(`Falha ao confirmar a leitura no Telegram: ${semToken(e)}`);
}

const chatAutorizado = String($env.TELEGRAM_CHAT_ID);
const agora = Math.floor(Date.now() / 1000);

return updates
  .map((u) => u.message)
  .filter((m) => m && String(m.chat.id) === chatAutorizado)
  .filter((m) => agora - m.date < 10 * 60) // ignora mensagem com mais de 10 min (ex.: enviada com o n8n desligado)
  .map((m) => {
    const audio = m.voice ?? m.audio; // voice = gravado no microfone; audio = arquivo de áudio enviado
    return {
      chatId: m.chat.id,
      // Em grupo, o Telegram só entrega ao bot comandos e menções: tira o "@nome_do_bot" e a barra do comando
      texto: (m.text ?? m.caption ?? '').replace(/@\w+bot\b/gi, '').replace(/^\/\w+\s*/, '').trim(),
      audio: audio ? { fileId: audio.file_id, mime: audio.mime_type ?? 'audio/ogg', duracao: audio.duration ?? 0 } : undefined,
      nome: m.from?.first_name ?? '',
    };
  })
  .filter((m) => m.texto || m.audio) // figurinha, foto sem legenda etc. ficam de fora
  .map((m) => ({ json: m }));
