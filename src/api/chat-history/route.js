import { Client } from "pg";

async function handler({ action, session_id, topic, limit, days }) {
  const client = new Client({
    connectionString:
      "postgresql://postgres.rrdukautkxckcwentorp:%40Plan7526277@aws-0-sa-east-1.pooler.supabase.com:6543/postgres",
    ssl: {
      rejectUnauthorized: false,
    },
  });

  await client.connect();

  try {
    switch (action) {
      case "list": {
        const conversationLimit = limit || 50;
        const listResult = await client.query(
          `SELECT * FROM chat_conversations ORDER BY created_at DESC LIMIT $1`,
          [conversationLimit]
        );
        return { success: true, data: listResult.rows };
      }

      case "by_session": {
        if (!session_id) {
          return { error: "session_id is required" };
        }
        const sessionResult = await client.query(
          `SELECT * FROM chat_conversations WHERE session_id = $1 ORDER BY created_at ASC`,
          [session_id]
        );
        return { success: true, data: sessionResult.rows };
      }

      case "by_topic": {
        if (!topic) {
          return { error: "topic is required" };
        }
        const topicResult = await client.query(
          `SELECT * FROM chat_conversations WHERE topic_matched = $1 ORDER BY created_at DESC`,
          [topic]
        );
        return { success: true, data: topicResult.rows };
      }

      case "stats": {
        const totalResult = await client.query(
          `SELECT COUNT(*) FROM chat_conversations`
        );
        const totalCount = parseInt(totalResult.rows[0].count, 10);

        const uniqueSessionsResult = await client.query(
          `SELECT COUNT(DISTINCT session_id) FROM chat_conversations`
        );
        const uniqueSessions = parseInt(uniqueSessionsResult.rows[0].count, 10);

        const topicsResult = await client.query(
          `SELECT topic_matched, COUNT(*) as count
           FROM chat_conversations
           WHERE topic_matched IS NOT NULL
           GROUP BY topic_matched
           ORDER BY count DESC
           LIMIT 10`
        );
        const topTopics = topicsResult.rows;

        return {
          success: true,
          data: {
            total_conversations: totalCount,
            unique_sessions: uniqueSessions,
            top_topics: topTopics,
          },
        };
      }

      case "cleanup": {
        const cleanupDays = days || 30;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - cleanupDays);

        const cleanupResult = await client.query(
          `DELETE FROM chat_conversations WHERE created_at < $1 RETURNING *`,
          [cutoffDate.toISOString()]
        );
        return {
          success: true,
          message: `Conversas mais antigas que ${cleanupDays} dias foram removidas`,
          deleted_count: cleanupResult.rowCount,
        };
      }

      default:
        return {
          error: "Invalid action. Use: list, by_session, by_topic, stats, or cleanup",
        };
    }
  } catch (error) {
    console.error("Chat history error:", error);
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
