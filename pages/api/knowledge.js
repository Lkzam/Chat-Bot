import { Client } from "pg";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const {
    action,
    id,
    topic,
    keywords,
    content,
    response_template,
    query,
  } = req.body;

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
          "SELECT * FROM knowledge_base ORDER BY created_at DESC"
        );
        return res.status(200).json({ success: true, data: result.rows });
      }

      case "create": {
        if (!topic || !keywords || !content || !response_template) {
          return res.status(400).json({
            error:
              "Topic, keywords, content e response_template são obrigatórios",
          });
        }

        if (!Array.isArray(keywords)) {
          return res.status(400).json({ error: "keywords deve ser uma lista" });
        }

        const result = await client.query(
          `INSERT INTO knowledge_base (topic, keywords, content, response_template, created_at, updated_at)
           VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *`,
          [topic, keywords, content, response_template]
        );

        return res.status(201).json({ success: true, data: result.rows[0] });
      }

      case "update": {
        if (!id) return res.status(400).json({ error: "ID é obrigatório" });

        const updateFields = [];
        const values = [];
        let i = 1;

        if (topic !== undefined) {
          updateFields.push(`topic = $${i++}`);
          values.push(topic);
        }
        if (keywords !== undefined) {
          if (!Array.isArray(keywords))
            return res.status(400).json({ error: "keywords deve ser array" });
          updateFields.push(`keywords = $${i++}`);
          values.push(keywords);
        }
        if (content !== undefined) {
          updateFields.push(`content = $${i++}`);
          values.push(content);
        }
        if (response_template !== undefined) {
          updateFields.push(`response_template = $${i++}`);
          values.push(response_template);
        }

        updateFields.push(`updated_at = NOW()`);
        values.push(id);

        const result = await client.query(
          `UPDATE knowledge_base SET ${updateFields.join(", ")} WHERE id = $${i} RETURNING *`,
          values
        );

        if (result.rows.length === 0)
          return res.status(404).json({ error: "Não encontrado" });

        return res.status(200).json({ success: true, data: result.rows[0] });
      }

      case "delete": {
        if (!id) return res.status(400).json({ error: "ID é obrigatório" });

        const result = await client.query(
          "DELETE FROM knowledge_base WHERE id = $1 RETURNING *",
          [id]
        );

        if (result.rows.length === 0)
          return res.status(404).json({ error: "Não encontrado" });

        return res
          .status(200)
          .json({ success: true, message: "Item deletado com sucesso" });
      }

      case "search": {
        if (!query) return res.status(400).json({ error: "Query obrigatória" });

        const result = await client.query(
          `SELECT * FROM knowledge_base
           WHERE topic ILIKE $1 OR content ILIKE $1
           ORDER BY created_at DESC`,
          [`%${query}%`]
        );

        return res.status(200).json({ success: true, data: result.rows });
      }

      default:
        return res.status(400).json({
          error: "Ação inválida. Use: list, create, update, delete ou search",
        });
    }
  } catch (error) {
    console.error("Erro knowledge base:", error);
    return res.status(500).json({ error: "Erro interno", details: error.message });
  } finally {
    await client.end();
  }
}
