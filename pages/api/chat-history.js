import { Client } from "pg";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { action, session_id, topic, limit, days } = req.body;

  const client = new Client({
    connectionString:
      "postgresql://postgres.rrdukautkxckcwentorp:%40Plan7526277@aws-0-sa-east-1.pooler.supabase.com:6543/postgres",
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    switch (action) {
      case "list": {
        const result = await client.query(
          "SELECT * FROM chat_conversations ORDER BY created_at DESC LIMIT $1",
          [limit || 50]
        );
        return res.status(200).json({ success: true, data: result.rows });
      }

      case "by_session": {
        if (!session_id) return res.status(400).json({ error: "session_id obrigatório" });

        const result = await client.query(
          "SELECT * FROM chat_conversations WHERE session_id = $1 ORDER BY created_at ASC",
          [session_id]
        );
        return res.status(200).json({ success: true, data: result.rows });
      }

      case "by_topic": {
        if (!topic) return res.status(400).json({ error: "topic obrigatório" });

        const result = await client.query(
          "SELECT * FROM chat_conversations WHERE topic_matched = $1 ORDER BY created_at DESC",
          [topic]
        );
        return res.status(200).json({ success: true, data: result.rows });
      }

      case "stats": {
        const totalResult = await client.query("SELECT COUNT(*) FROM chat_conversations");
        const uniqueResult = await client.query(
          "SELECT COUNT(DISTINCT session_id) FROM chat_conversations"
        );
        const topTopicsResult = await client.query(`
          SELECT topic_matched, COUNT(*) as count
          FROM chat_conversations
          WHERE topic_matched IS NOT NULL
          GROUP BY topic_matched
          ORDER BY count DESC
          LIMIT 10
        `);

        return res.status(200).json({
          success: true,
          data: {
            total_conversations: parseInt(totalResult.rows[0].count, 10),
            unique_sessions: parseInt(uniqueResult.rows[0].count, 10),
            top_topics: topTopicsResult.rows,
          },
        });
      }

      case "cleanup": {
        const cleanupDays = days || 30;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - cleanupDays);

        const result = await client.query(
          "DELETE FROM chat_conversations WHERE created_at < $1 RETURNING *",
          [cutoffDate.toISOString()]
        );

        return res.status(200).json({
          success: true,
          message: `Removidas ${result.rowCount} conversas com mais de ${cleanupDays} dias`,
        });
      }

      default:
        return res.status(400).json({
          error: "Ação inválida. Use: list, by_session, by_topic, stats ou cleanup",
        });
    }
  } catch (error) {
    console.error("Chat history error:", error);
    return res.status(500).json({ error: "Erro interno", details: error.message });
  } finally {
    await client.end();
  }
}

