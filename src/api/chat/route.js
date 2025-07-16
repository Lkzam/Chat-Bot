import { Client } from "pg";

async function handler({ message, session_id }) {
  const client = new Client({
    connectionString: "postgresql://postgres.rrdukautkxckcwentorp:@Plan7526277@aws-0-sa-east-1.pooler.supabase.com:6543/postgres",
  });

  await client.connect();

  try {
    if (!message || !session_id) {
      return { error: "Mensagem e session_id são obrigatórios" };
    }

    // 1. Buscar conhecimentos da base
    const knowledgeResult = await client.query(`SELECT * FROM knowledge_base`);
    const knowledgeBase = knowledgeResult.rows;

    // 2. Encontrar tópico correspondente
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

    // 3. Gerar resposta
    let response;
    if (bestMatch) {
      response = bestMatch.response_template;
    } else {
      response =
        "Desculpe, não encontrei informações específicas sobre sua pergunta. Você pode reformular ou entrar em contato com nosso suporte técnico para mais detalhes sobre o PDV Colibri.";
    }

    // 4. Salvar conversa no histórico
    const conversationData = {
      session_id,
      user_message: message,
      bot_response: response,
      topic_matched: matchedTopic,
      created_at: new Date().toISOString(),
    };

    await client.query(
      `INSERT INTO chat_conversations (session_id, user_message, bot_response, topic_matched, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        conversationData.session_id,
        conversationData.user_message,
        conversationData.bot_response,
        conversationData.topic_matched,
        conversationData.created_at,
      ]
    );

    return { success: true, data: response };
  } catch (error) {
    console.error("Chat error:", error);
    return {
      error: "Erro interno do servidor",
      details: error.message,
    };
  } finally {
    await client.end();
  }
}

export async function POST(request) {
  return handler(await request.json());
}