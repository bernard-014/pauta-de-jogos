// Nó Code "Transcrever áudios" do workflow "Bot da Pauta" (modo: Run Once for All Items)
// Para cada mensagem de voz: baixa o arquivo no Telegram (getFile devolve o caminho, depois baixa o .ogg)
// e pede ao Gemini a transcrição. O texto transcrito vira a pergunta do AI Agent, que continua só com texto.
// Mensagem de texto passa direto. Os erros saem sem o token do bot e sem a chave do Gemini.

const token = $env.TELEGRAM_BOT_TOKEN;
const chave = $env.GEMINI_API_KEY;
const semSegredos = (e) => String(e?.message ?? e).split(token).join('***').split(chave).join('***');
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const DURACAO_MAXIMA = 180; // segundos

const transcrever = async (audio) => {
  const arquivo = await this.helpers.httpRequest({
    url: `https://api.telegram.org/bot${token}/getFile`,
    qs: { file_id: audio.fileId },
    json: true,
  });
  const bruto = await this.helpers.httpRequest({
    url: `https://api.telegram.org/file/bot${token}/${arquivo.result.file_path}`,
    encoding: 'arraybuffer',
  });
  const buffer = Buffer.isBuffer(bruto) ? bruto : bruto?.type === 'Buffer' ? Buffer.from(bruto.data) : Buffer.from(bruto);

  const pedido = {
    method: 'POST',
    url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent',
    headers: { 'x-goog-api-key': chave },
    json: true,
    timeout: 30000,
    body: {
      contents: [{
        role: 'user',
        parts: [
          { text: 'Transcreva este áudio em português do Brasil, exatamente o que foi dito, sem comentários nem aspas. Se não houver fala, responda apenas: (sem fala)' },
          { inline_data: { mime_type: audio.mime, data: buffer.toString('base64') } },
        ],
      }],
      generationConfig: { temperature: 0 },
    },
  };

  // O Gemini grátis às vezes devolve 503 (alta demanda): mais uma tentativa depois de 3 s
  let resposta;
  try {
    resposta = await this.helpers.httpRequest(pedido);
  } catch (e) {
    await esperar(3000);
    resposta = await this.helpers.httpRequest(pedido);
  }
  const texto = (resposta.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('').trim();
  if (!texto || texto === '(sem fala)') throw new Error('o áudio veio sem fala reconhecível');
  return texto;
};

const saida = [];
for (const [i, item] of $input.all().entries()) {
  const m = item.json;
  if (!m.audio) {
    saida.push({ json: { ...m, transcricao: '' }, pairedItem: i });
    continue;
  }
  if (m.audio.duracao > DURACAO_MAXIMA) {
    saida.push({ json: { ...m, transcricao: '', texto: `Mandei um áudio de ${m.audio.duracao} s, acima do limite de ${DURACAO_MAXIMA} s. Avise que só entende áudio de até 3 minutos.` }, pairedItem: i });
    continue;
  }
  try {
    const transcricao = await transcrever(m.audio);
    // Se o áudio veio com legenda, a legenda vai junto
    saida.push({ json: { ...m, transcricao, texto: [m.texto, transcricao].filter(Boolean).join('\n') }, pairedItem: i });
  } catch (e) {
    saida.push({
      json: { ...m, transcricao: '', texto: 'Mandei um áudio, mas ele não pôde ser transcrito. Peça para eu escrever a pergunta.', erroAudio: semSegredos(e) },
      pairedItem: i,
    });
  }
}
return saida;
