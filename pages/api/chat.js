import { Client } from "pg";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { message, session_id } = req.body;

  const client = new Client({
    connectionString:
      "postgresql://postgres.rrdukautkxckcwentorp:%40Plan7526277@aws-0-sa-east-1.pooler.supabase.com:6543/postgres",
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    if (!message || !session_id) {
      return res.status(400).json({ error: "Mensagem e session_id são obrigatórios" });
    }

    const knowledgeResult = await client.query("SELECT * FROM knowledge_base");
    const knowledgeBase = knowledgeResult.rows;

    const userMessageLower = message.toLowerCase();
    let matchedTopic = null;
    let bestMatch = null;

    for (const item of knowledgeBase) {
      const keywords = item.keywords || [];
      for (const keyword of keywords) {
        if (userMessageLower.includes(keyword.toLowerCase())) {
          matchedTopic = item.topic;
          bestMatch = item;
          break;
        }
      }
      if (bestMatch) break;
    }

    let response = bestMatch?.response_template?.trim();

    if (!response) {
      response = "Desculpe, não encontrei nenhuma resposta para essa pergunta. Tente reformular ou fale com nosso suporte.";
    }

    console.log("Resposta gerada:", response);

    await client.query(
      `INSERT INTO chat_conversations (session_id, user_message, bot_response, topic_matched, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [session_id, message, response, matchedTopic]
    );

    return res.status(200).json({ success: true, data: response });
  } catch (error) {
    console.error("Chat error:", error);
    return res.status(500).json({ error: "Erro interno", details: error.message });
  } finally {
    await client.end();
  }
}
