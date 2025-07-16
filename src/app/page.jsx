"use client";
import React from "react";

function MainComponent() {
  const [activeTab, setActiveTab] = React.useState("chat");
  const [messages, setMessages] = React.useState([]);
  const [inputMessage, setInputMessage] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [sessionId] = React.useState(() => "session_" + Date.now());

  // Admin states
  const [knowledgeBase, setKnowledgeBase] = React.useState([]);
  const [isLoadingKnowledge, setIsLoadingKnowledge] = React.useState(false);
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState(null);

  // Stats states
  const [stats, setStats] = React.useState(null);
  const [isLoadingStats, setIsLoadingStats] = React.useState(false);
  const [conversations, setConversations] = React.useState([]);

  // Form states
  const [formData, setFormData] = React.useState({
    topic: "",
    keywords: "",
    content: "",
    response_template: "",
  });

  // Load knowledge base
  const loadKnowledgeBase = React.useCallback(async () => {
    setIsLoadingKnowledge(true);
    try {
      const response = await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list" }),
      });
      const data = await response.json();
      if (data.success) {
        setKnowledgeBase(data.data);
      }
    } catch (error) {
      console.error("Erro ao carregar base de conhecimento:", error);
    }
    setIsLoadingKnowledge(false);
  }, []);

  // Load stats
  const loadStats = React.useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const [statsResponse, conversationsResponse] = await Promise.all([
        fetch("/api/chat-history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "stats" }),
        }),
        fetch("/api/chat-history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "list", limit: 20 }),
        }),
      ]);

      const statsData = await statsResponse.json();
      const conversationsData = await conversationsResponse.json();

      if (statsData.success) {
        setStats(statsData.data);
      }
      if (conversationsData.success) {
        setConversations(conversationsData.data);
      }
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
    }
    setIsLoadingStats(false);
  }, []);

  // Send message to chatbot
  const sendMessage = React.useCallback(async () => {
    if (!inputMessage.trim()) return;

    const userMessage = inputMessage.trim();
    setInputMessage("");
    setMessages((prev) => [...prev, { type: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          session_id: sessionId,
        }),
      });

      const data = await response.json();

      console.log("Resposta do backend:", data);

      if (data.error) {
        setMessages((prev) => [
          ...prev,
          {
            type: "bot",
            content: "Desculpe, ocorreu um erro. Tente novamente.",
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            type: "bot",
            content: data.data,          // <-- aqui estava 'data.response' antes
            topic: data.topic_matched,  // <-- assume que backend retorna isso
          },
        ]);
      }
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      setMessages((prev) => [
        ...prev,
        {
          type: "bot",
          content: "Erro de conexão. Tente novamente.",
        },
      ]);
    }

    setIsLoading(false);
  }, [inputMessage, sessionId]);

  // Handle form submission
  const handleFormSubmit = React.useCallback(
    async (e) => {
      e.preventDefault();

      const keywordsArray = formData.keywords
        .split(",")
        .map((k) => k.trim())
        .filter((k) => k);

      const payload = {
        action: editingItem ? "update" : "create",
        ...(editingItem && { id: editingItem.id }),
        topic: formData.topic,
        keywords: keywordsArray,
        content: formData.content,
        response_template: formData.response_template,
      };

      try {
        const response = await fetch("/api/knowledge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (data.success) {
          setFormData({
            topic: "",
            keywords: "",
            content: "",
            response_template: "",
          });
          setShowAddForm(false);
          setEditingItem(null);
          loadKnowledgeBase();
        } else {
          alert("Erro: " + data.error);
        }
      } catch (error) {
        console.error("Erro ao salvar:", error);
        alert("Erro ao salvar");
      }
    },
    [formData, editingItem, loadKnowledgeBase]
  );

  // Delete knowledge item
  const deleteKnowledgeItem = React.useCallback(
    async (id) => {
      if (!confirm("Tem certeza que deseja deletar este item?")) return;

      try {
        const response = await fetch("/api/knowledge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "delete", id }),
        });

        const data = await response.json();
        if (data.success) {
          loadKnowledgeBase();
        }
      } catch (error) {
        console.error("Erro ao deletar:", error);
      }
    },
    [loadKnowledgeBase]
  );

  // Edit knowledge item
  const editKnowledgeItem = React.useCallback((item) => {
    setEditingItem(item);
    setFormData({
      topic: item.topic,
      keywords: item.keywords.join(", "),
      content: item.content,
      response_template: item.response_template,
    });
    setShowAddForm(true);
  }, []);

  React.useEffect(() => {
    if (activeTab === "admin") {
      loadKnowledgeBase();
    } else if (activeTab === "stats") {
      loadStats();
    }
  }, [activeTab, loadKnowledgeBase, loadStats]);

  React.useEffect(() => {
    // Welcome message with examples
    setMessages([
      {
        type: "bot",
        content:
          "🐦 Olá! Sou o assistente do PDV Colibri. Como posso ajudar você hoje?",
      },
      {
        type: "bot",
        content:
          "💡 Você pode perguntar sobre:\n• Como fazer uma venda\n• Cadastro de produtos\n• Relatórios de vendas\n• Problemas com impressora\n• Backup dos dados",
        isExample: true,
      },
    ]);
  }, []);

  // Quick action buttons
  const quickActions = [
    "Como fazer uma venda?",
    "Como cadastrar produtos?",
    "Problemas com impressora",
    "Como fazer backup?",
  ];

  const sendQuickAction = React.useCallback(
    (action) => {
      setInputMessage(action);
      // Trigger send after setting message
      setTimeout(() => {
        const event = { target: { value: action } };
        setInputMessage(action);
        sendMessage();
      }, 100);
    },
    [sendMessage]
  );

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
      {/* Header */}
      <div
        style={{
          backgroundColor: "#2563eb",
          color: "white",
          padding: "1rem",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: "bold" }}>
            🐦 Assistente PDV Colibri - Sistema de Suporte Inteligente
          </h1>
          <p
            style={{ margin: "0.5rem 0 0 0", opacity: 0.9, fontSize: "0.9rem" }}
          >
            Conectado ao Supabase • Base de conhecimento atualizada
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div
        style={{
          backgroundColor: "white",
          borderBottom: "1px solid #e5e7eb",
          padding: "0 1rem",
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ display: "flex", gap: "2rem" }}>
            <button
              onClick={() => setActiveTab("chat")}
              style={{
                padding: "1rem 0",
                border: "none",
                background: "none",
                fontSize: "1rem",
                fontWeight: activeTab === "chat" ? "bold" : "normal",
                color: activeTab === "chat" ? "#2563eb" : "#6b7280",
                borderBottom:
                  activeTab === "chat"
                    ? "2px solid #2563eb"
                    : "2px solid transparent",
                cursor: "pointer",
              }}
            >
              💬 Chat de Suporte
            </button>
            <button
              onClick={() => setActiveTab("admin")}
              style={{
                padding: "1rem 0",
                border: "none",
                background: "none",
                fontSize: "1rem",
                fontWeight: activeTab === "admin" ? "bold" : "normal",
                color: activeTab === "admin" ? "#2563eb" : "#6b7280",
                borderBottom:
                  activeTab === "admin"
                    ? "2px solid #2563eb"
                    : "2px solid transparent",
                cursor: "pointer",
              }}
            >
              ⚙️ Administração
            </button>
            <button
              onClick={() => setActiveTab("stats")}
              style={{
                padding: "1rem 0",
                border: "none",
                background: "none",
                fontSize: "1rem",
                fontWeight: activeTab === "stats" ? "bold" : "normal",
                color: activeTab === "stats" ? "#2563eb" : "#6b7280",
                borderBottom:
                  activeTab === "stats"
                    ? "2px solid #2563eb"
                    : "2px solid transparent",
                cursor: "pointer",
              }}
            >
              📊 Estatísticas
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem" }}>
        {activeTab === "chat" && (
          <div>
            {/* Quick Actions */}
            <div style={{ marginBottom: "1rem" }}>
              <h3 style={{ margin: "0 0 1rem 0", color: "#374151" }}>
                ⚡ Perguntas Rápidas:
              </h3>
              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  flexWrap: "wrap",
                  marginBottom: "1rem",
                }}
              >
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setInputMessage(action);
                      setTimeout(sendMessage, 100);
                    }}
                    style={{
                      padding: "0.5rem 1rem",
                      backgroundColor: "#f3f4f6",
                      border: "1px solid #d1d5db",
                      borderRadius: "1rem",
                      fontSize: "0.875rem",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                    onMouseOver={(e) => {
                      e.target.style.backgroundColor = "#e5e7eb";
                    }}
                    onMouseOut={(e) => {
                      e.target.style.backgroundColor = "#f3f4f6";
                    }}
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Container */}
            <div
              style={{
                backgroundColor: "white",
                borderRadius: "8px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                height: "600px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Chat Messages */}
              <div
                style={{
                  flex: 1,
                  padding: "1rem",
                  overflowY: "auto",
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    style={{
                      marginBottom: "1rem",
                      display: "flex",
                      justifyContent: msg.type === "user" ? "flex-end" : "flex-start",
                    }}
                  >
                    <div
                      style={{
                        maxWidth: "70%",
                        padding: "0.75rem 1rem",
                        borderRadius: "1rem",
                        backgroundColor: msg.isExample
                          ? "#f0f9ff"
                          : msg.type === "user"
                          ? "#2563eb"
                          : "#f3f4f6",
                        color: msg.isExample
                          ? "#0369a1"
                          : msg.type === "user"
                          ? "white"
                          : "#1f2937",
                        border: msg.isExample ? "1px solid #bae6fd" : "none",
                        whiteSpace: "pre-line",
                      }}
                    >
                      <div>{msg.content}</div>
                      {msg.topic && (
                        <div
                          style={{
                            fontSize: "0.75rem",
                            opacity: 0.7,
                            marginTop: "0.25rem",
                            backgroundColor: "rgba(255,255,255,0.2)",
                            padding: "0.25rem 0.5rem",
                            borderRadius: "0.5rem",
                          }}
                        >
                          📋 Tópico: {msg.topic}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div
                    style={{ display: "flex", justifyContent: "flex-start" }}
                  >
                    <div
                      style={{
                        padding: "0.75rem 1rem",
                        borderRadius: "1rem",
                        backgroundColor: "#f3f4f6",
                        color: "#6b7280",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <div
                        style={{
                          width: "8px",
                          height: "8px",
                          backgroundColor: "#6b7280",
                          borderRadius: "50%",
                          animation: "pulse 1.5s infinite",
                        }}
                      ></div>
                      Processando sua pergunta...
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div style={{ padding: "1rem" }}>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                    placeholder="Digite sua pergunta sobre o PDV Colibri..."
                    style={{
                      flex: 1,
                      padding: "0.75rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "0.5rem",
                      fontSize: "1rem",
                      outline: "none",
                    }}
                    disabled={isLoading}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={isLoading || !inputMessage.trim()}
                    style={{
                      padding: "0.75rem 1.5rem",
                      backgroundColor: "#2563eb",
                      color: "white",
                      border: "none",
                      borderRadius: "0.5rem",
                      fontSize: "1rem",
                      cursor: isLoading ? "not-allowed" : "pointer",
                      opacity: isLoading || !inputMessage.trim() ? 0.5 : 1,
                    }}
                  >
                    {isLoading ? "..." : "Enviar"}
                  </button>
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "#6b7280",
                    marginTop: "0.5rem",
                    textAlign: "center",
                  }}
                >
                  💾 Todas as conversas são salvas automaticamente no Supabase
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "stats" && (
          <div>
            <h2
              style={{
                margin: "0 0 2rem 0",
                fontSize: "1.5rem",
                fontWeight: "bold",
              }}
            >
              Estatísticas do Chatbot
            </h2>

            {isLoadingStats ? (
              <div style={{ textAlign: "center", padding: "2rem" }}>
                Carregando estatísticas...
              </div>
            ) : stats ? (
              <div>
                {/* Overview Cards */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                    gap: "1rem",
                    marginBottom: "2rem",
                  }}
                >
                  <div
                    style={{
                      backgroundColor: "white",
                      padding: "1.5rem",
                      borderRadius: "8px",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                    }}
                  >
                    <h3 style={{ margin: "0 0 0.5rem 0", color: "#2563eb" }}>
                      Total de Conversas
                    </h3>
                    <div style={{ fontSize: "2rem", fontWeight: "bold" }}>
                      {stats.total_conversations}
                    </div>
                  </div>

                  <div
                    style={{
                      backgroundColor: "white",
                      padding: "1.5rem",
                      borderRadius: "8px",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                    }}
                  >
                    <h3 style={{ margin: "0 0 0.5rem 0", color: "#10b981" }}>
                      Usuários Únicos
                    </h3>
                    <div style={{ fontSize: "2rem", fontWeight: "bold" }}>
                      {stats.unique_sessions}
                    </div>
                  </div>
                </div>

                {/* Top Topics */}
                <div
                  style={{
                    backgroundColor: "white",
                    padding: "1.5rem",
                    borderRadius: "8px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                    marginBottom: "2rem",
                  }}
                >
                  <h3 style={{ margin: "0 0 1rem 0" }}>
                    Tópicos Mais Perguntados
                  </h3>
                  {stats.top_topics.length > 0 ? (
                    <div>
                      {stats.top_topics.map((topic, index) => (
                        <div
                          key={index}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "0.75rem 0",
                            borderBottom:
                              index < stats.top_topics.length - 1
                                ? "1px solid #e5e7eb"
                                : "none",
                          }}
                        >
                          <span style={{ fontWeight: "500" }}>
                            {topic.topic_matched}
                          </span>
                          <span
                            style={{
                              backgroundColor: "#2563eb",
                              color: "white",
                              padding: "0.25rem 0.75rem",
                              borderRadius: "1rem",
                              fontSize: "0.875rem",
                            }}
                          >
                            {topic.count} perguntas
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      style={{
                        color: "#6b7280",
                        textAlign: "center",
                        padding: "2rem",
                      }}
                    >
                      Nenhum tópico identificado ainda
                    </div>
                  )}
                </div>

                {/* Recent Conversations */}
                <div
                  style={{
                    backgroundColor: "white",
                    padding: "1.5rem",
                    borderRadius: "8px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  }}
                >
                  <h3 style={{ margin: "0 0 1rem 0" }}>Conversas Recentes</h3>
                  {conversations.length > 0 ? (
                    <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                      {conversations.map((conv, index) => (
                        <div
                          key={index}
                          style={{
                            padding: "1rem",
                            borderBottom:
                              index < conversations.length - 1
                                ? "1px solid #e5e7eb"
                                : "none",
                            marginBottom: "0.5rem",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "0.875rem",
                              color: "#6b7280",
                              marginBottom: "0.5rem",
                            }}
                          >
                            {new Date(conv.created_at).toLocaleString("pt-BR")}
                            {conv.topic_matched && (
                              <span
                                style={{
                                  marginLeft: "1rem",
                                  backgroundColor: "#f3f4f6",
                                  padding: "0.25rem 0.5rem",
                                  borderRadius: "0.25rem",
                                  fontSize: "0.75rem",
                                }}
                              >
                                {conv.topic_matched}
                              </span>
                            )}
                          </div>
                          <div style={{ marginBottom: "0.5rem" }}>
                            <strong>Usuário:</strong> {conv.user_message}
                          </div>
                          <div style={{ color: "#4b5563" }}>
                            <strong>Bot:</strong>{" "}
                            {conv.bot_response.substring(0, 150)}
                            {conv.bot_response.length > 150 && "..."}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      style={{
                        color: "#6b7280",
                        textAlign: "center",
                        padding: "2rem",
                      }}
                    >
                      Nenhuma conversa registrada ainda
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "2rem" }}>
                Erro ao carregar estatísticas
              </div>
            )}
          </div>
        )}

        {activeTab === "admin" && (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "2rem",
              }}
            >
              <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: "bold" }}>
                Base de Conhecimento
              </h2>
              <button
                onClick={() => {
                  setShowAddForm(true);
                  setEditingItem(null);
                  setFormData({
                    topic: "",
                    keywords: "",
                    content: "",
                    response_template: "",
                  });
                }}
                style={{
                  padding: "0.75rem 1.5rem",
                  backgroundColor: "#10b981",
                  color: "white",
                  border: "none",
                  borderRadius: "0.5rem",
                  fontSize: "1rem",
                  cursor: "pointer",
                }}
              >
                + Adicionar Conhecimento
              </button>
            </div>

            {showAddForm && (
              <div
                style={{
                  backgroundColor: "white",
                  padding: "2rem",
                  borderRadius: "8px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  marginBottom: "2rem",
                }}
              >
                <h3 style={{ marginTop: 0 }}>
                  {editingItem ? "Editar" : "Adicionar"} Conhecimento
                </h3>
                <form onSubmit={handleFormSubmit}>
                  <div style={{ marginBottom: "1rem" }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "0.5rem",
                        fontWeight: "bold",
                      }}
                    >
                      Tópico:
                    </label>
                    <input
                      type="text"
                      value={formData.topic}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          topic: e.target.value,
                        }))
                      }
                      style={{
                        width: "100%",
                        padding: "0.75rem",
                        border: "1px solid #d1d5db",
                        borderRadius: "0.5rem",
                      }}
                      required
                    />
                  </div>

                  <div style={{ marginBottom: "1rem" }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "0.5rem",
                        fontWeight: "bold",
                      }}
                    >
                      Palavras-chave (separadas por vírgula):
                    </label>
                    <input
                      type="text"
                      value={formData.keywords}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          keywords: e.target.value,
                        }))
                      }
                      placeholder="venda, produto, pagamento, cliente"
                      style={{
                        width: "100%",
                        padding: "0.75rem",
                        border: "1px solid #d1d5db",
                        borderRadius: "0.5rem",
                      }}
                      required
                    />
                  </div>

                  <div style={{ marginBottom: "1rem" }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "0.5rem",
                        fontWeight: "bold",
                      }}
                    >
                      Conteúdo/Descrição:
                    </label>
                    <textarea
                      value={formData.content}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          content: e.target.value,
                        }))
                      }
                      rows={4}
                      style={{
                        width: "100%",
                        padding: "0.75rem",
                        border: "1px solid #d1d5db",
                        borderRadius: "0.5rem",
                        resize: "vertical",
                      }}
                      required
                    />
                  </div>

                  <div style={{ marginBottom: "1rem" }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "0.5rem",
                        fontWeight: "bold",
                      }}
                    >
                      Template de Resposta:
                    </label>
                    <textarea
                      value={formData.response_template}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          response_template: e.target.value,
                        }))
                      }
                      rows={4}
                      placeholder="Para fazer isso no PDV Colibri: 1) Acesse o menu..., 2) Clique em..."
                      style={{
                        width: "100%",
                        padding: "0.75rem",
                        border: "1px solid #d1d5db",
                        borderRadius: "0.5rem",
                        resize: "vertical",
                      }}
                      required
                    />
                  </div>

                  <div style={{ display: "flex", gap: "1rem" }}>
                    <button
                      type="submit"
                      style={{
                        padding: "0.75rem 1.5rem",
                        backgroundColor: "#2563eb",
                        color: "white",
                        border: "none",
                        borderRadius: "0.5rem",
                        cursor: "pointer",
                      }}
                    >
                      {editingItem ? "Atualizar" : "Salvar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddForm(false);
                        setEditingItem(null);
                      }}
                      style={{
                        padding: "0.75rem 1.5rem",
                        backgroundColor: "#6b7280",
                        color: "white",
                        border: "none",
                        borderRadius: "0.5rem",
                        cursor: "pointer",
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Knowledge Base List */}
            <div
              style={{
                backgroundColor: "white",
                borderRadius: "8px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              }}
            >
              {isLoadingKnowledge ? (
                <div style={{ padding: "2rem", textAlign: "center" }}>
                  Carregando...
                </div>
              ) : (
                <div>
                  {knowledgeBase.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        padding: "1.5rem",
                        borderBottom: "1px solid #e5e7eb",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          marginBottom: "1rem",
                        }}
                      >
                        <h4 style={{ margin: 0, color: "#2563eb" }}>
                          {item.topic}
                        </h4>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button
                            onClick={() => editKnowledgeItem(item)}
                            style={{
                              padding: "0.5rem 1rem",
                              backgroundColor: "#f59e0b",
                              color: "white",
                              border: "none",
                              borderRadius: "0.25rem",
                              fontSize: "0.875rem",
                              cursor: "pointer",
                            }}
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => deleteKnowledgeItem(item.id)}
                            style={{
                              padding: "0.5rem 1rem",
                              backgroundColor: "#ef4444",
                              color: "white",
                              border: "none",
                              borderRadius: "0.25rem",
                              fontSize: "0.875rem",
                              cursor: "pointer",
                            }}
                          >
                            Deletar
                          </button>
                        </div>
                      </div>

                      <div style={{ marginBottom: "0.5rem" }}>
                        <strong>Palavras-chave:</strong>{" "}
                        {item.keywords.join(", ")}
                      </div>

                      <div style={{ marginBottom: "0.5rem" }}>
                        <strong>Conteúdo:</strong> {item.content}
                      </div>

                      <div
                        style={{
                          backgroundColor: "#f9fafb",
                          padding: "1rem",
                          borderRadius: "0.5rem",
                          fontSize: "0.875rem",
                        }}
                      >
                        <strong>Template de Resposta:</strong>
                        <br />
                        {item.response_template}
                      </div>
                    </div>
                  ))}

                  {knowledgeBase.length === 0 && (
                    <div
                      style={{
                        padding: "2rem",
                        textAlign: "center",
                        color: "#6b7280",
                      }}
                    >
                      Nenhum conhecimento cadastrado ainda.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

<style jsx global>{`
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`}</style>;

export default MainComponent;