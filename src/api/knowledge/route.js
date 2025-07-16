import { Client } from "pg";

async function handler({
  action,
  id,
  topic,
  keywords,
  content,
  response_template,
  query,
}) {
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
        const listResult = await client.query(
          "SELECT * FROM knowledge_base ORDER BY created_at DESC"
        );
        return { success: true, data: listResult.rows };
      }

      case "create": {
        if (!topic || !keywords || !content || !response_template) {
          return {
            error:
              "Topic, keywords, content, and response_template are required",
          };
        }

        if (!Array.isArray(keywords)) {
          return { error: "Keywords must be an array" };
        }

        const createResult = await client.query(
          `INSERT INTO knowledge_base (topic, keywords, content, response_template, created_at, updated_at)
           VALUES ($1, $2, $3, $4, NOW(), NOW())
           RETURNING *`,
          [topic, keywords, content, response_template]
        );

        return { success: true, data: createResult.rows[0] };
      }

      case "update": {
        if (!id) {
          return { error: "ID is required for update" };
        }

        const updateFields = [];
        const updateValues = [];
        let index = 1;

        if (topic !== undefined) {
          updateFields.push(`topic = $${index++}`);
          updateValues.push(topic);
        }
        if (keywords !== undefined) {
          if (!Array.isArray(keywords)) {
            return { error: "Keywords must be an array" };
          }
          updateFields.push(`keywords = $${index++}`);
          updateValues.push(keywords);
        }
        if (content !== undefined) {
          updateFields.push(`content = $${index++}`);
          updateValues.push(content);
        }
        if (response_template !== undefined) {
          updateFields.push(`response_template = $${index++}`);
          updateValues.push(response_template);
        }

        updateFields.push(`updated_at = NOW()`);
        updateValues.push(id);

        const updateResult = await client.query(
          `UPDATE knowledge_base SET ${updateFields.join(", ")} WHERE id = $${index} RETURNING *`,
          updateValues
        );

        if (updateResult.rows.length === 0) {
          return { error: "Knowledge not found" };
        }

        return { success: true, data: updateResult.rows[0] };
      }

      case "delete": {
        if (!id) {
          return { error: "ID is required for delete" };
        }

        const deleteResult = await client.query(
          "DELETE FROM knowledge_base WHERE id = $1 RETURNING *",
          [id]
        );

        if (deleteResult.rows.length === 0) {
          return { error: "Knowledge not found" };
        }

        return { success: true, message: "Knowledge deleted successfully" };
      }

      case "search": {
        if (!query) {
          return { error: "Query is required for search" };
        }

        const searchResult = await client.query(
          `SELECT * FROM knowledge_base
           WHERE topic ILIKE $1 OR content ILIKE $1
           ORDER BY created_at DESC`,
          [`%${query}%`]
        );

        return { success: true, data: searchResult.rows };
      }

      default:
        return {
          error: "Invalid action. Use: list, create, update, delete, or search",
        };
    }
  } catch (error) {
    console.error("Knowledge base error:", error);
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

// Example fetch request to use the API
fetch('/api/knowledge', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    action: 'list', // ou 'create', 'update', etc.
  }),
});
