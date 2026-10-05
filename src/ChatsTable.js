import React, { useState, useMemo } from "react";
import "./Stylesheets/ClientTable.css";
import "./Stylesheets/ChatsTable.css";

const STATUS_LABELS = {
  answered: "Answered",
  no_answer: "No answer",
  api_error: "API error",
  knowledge_unavailable: "Knowledge unavailable",
  rate_limited: "Rate limited",
  daily_cap: "Daily cap",
  conversation_cap: "Conversation cap",
  budget_reached: "Budget reached",
  turnstile_failed: "Bot check failed",
};

// answered stays quiet; "the bot didn't know" is amber; anything that blocked
// or broke the reply is red
function statusClass(status) {
  if (status === "answered") return "chat-status-answered";
  if (status === "no_answer") return "status-expiring";
  return "status-expired";
}

// "Oct 5, 3:42 PM" — year only shown when it isn't this year
function formatChatTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d)) return String(value);
  const opts = { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" };
  if (d.getFullYear() !== new Date().getFullYear()) opts.year = "numeric";
  return d.toLocaleString("en-US", opts);
}

// Sub-cent costs are the norm, so keep three decimals below a dollar
function formatCost(usd) {
  if (typeof usd !== "number" || !isFinite(usd)) return "";
  return `$${usd.toFixed(usd >= 1 ? 2 : 3)}`;
}

// Full URLs are noisy in a narrow column; show just the path
function formatPage(page) {
  if (!page) return "";
  try {
    return new URL(page).pathname || page;
  } catch {
    return page;
  }
}

function ChatsTable({ chats, cursor, loadingMore, error, onLoadMore }) {
  const [expanded, setExpanded] = useState(() => new Set());
  const [sessionFilter, setSessionFilter] = useState(null);

  const toggleExpanded = (key) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  // A single conversation reads top-to-bottom, so flip it to oldest first
  const visibleChats = useMemo(() => {
    const arr = chats || [];
    if (!sessionFilter) return arr;
    return arr.filter((c) => c.sessionId === sessionFilter).reverse();
  }, [chats, sessionFilter]);

  const summary = useMemo(() => {
    let cost = 0;
    const sessions = new Set();
    for (const c of visibleChats) {
      if (typeof c.costUsd === "number" && isFinite(c.costUsd)) cost += c.costUsd;
      if (c.sessionId) sessions.add(c.sessionId);
    }
    return { count: visibleChats.length, cost, sessions: sessions.size };
  }, [visibleChats]);

  return (
    <div className="ct-client-table-container">
      <div className="ct-stats-bar">
        <span className="ct-stat">{summary.count} <span className="ct-stat-label">questions</span></span>
        <span className="ct-stat-divider" />
        <span className="ct-stat">{formatCost(summary.cost) || "$0.000"} <span className="ct-stat-label">total cost</span></span>
        <span className="ct-stat-divider" />
        <span className="ct-stat">{summary.sessions} <span className="ct-stat-label">sessions</span></span>
      </div>

      <div className="ct-toolbar">
        <span className="ct-selected-count">Website chatbot</span>
        {sessionFilter && (
          <button className="chat-session-chip" onClick={() => setSessionFilter(null)} title="Show all sessions">
            Session {sessionFilter.slice(0, 8)} <span aria-hidden="true">×</span>
          </button>
        )}
      </div>

      <div className="ct-table-wrap">
        <table className="ct-client-table chat-table">
          <thead>
            <tr>
              <th className="chat-col-time">Time</th>
              <th>Question</th>
              <th>Answer</th>
              <th className="chat-col-status">Status</th>
              <th className="chat-col-page">Page</th>
              <th className="chat-col-session">Session</th>
              <th className="chat-col-cost">Cost</th>
            </tr>
          </thead>
          <tbody>
            {visibleChats.length === 0 ? (
              <tr>
                <td colSpan={7} className="ct-empty-state">
                  {error ? "Couldn't load chats" : "No chats yet"}
                </td>
              </tr>
            ) : (
              visibleChats.map((chat, index) => {
                const key = chat.key ?? index;
                const isOpen = expanded.has(key);
                return (
                  <tr key={key}>
                    <td className="chat-col-time">{formatChatTime(chat.createdAt)}</td>
                    <td className="chat-text">{chat.question}</td>
                    <td
                      className={`chat-text chat-answer${isOpen ? " chat-answer--open" : ""}`}
                      onClick={() => toggleExpanded(key)}
                      title={isOpen ? "Click to collapse" : "Click to expand"}
                    >
                      {chat.answer || <span className="chat-muted">—</span>}
                    </td>
                    <td className="chat-col-status">
                      <span className={`status-badge ${statusClass(chat.status)}`}>
                        {STATUS_LABELS[chat.status] || chat.status || "Unknown"}
                      </span>
                    </td>
                    <td className="chat-col-page" title={chat.page || ""}>{formatPage(chat.page)}</td>
                    <td className="chat-col-session">
                      {chat.sessionId && (
                        <button
                          className="chat-session-link"
                          onClick={() => setSessionFilter(chat.sessionId)}
                          title="Show this conversation"
                        >
                          {chat.sessionId.slice(0, 8)}
                        </button>
                      )}
                    </td>
                    <td className="chat-col-cost">{formatCost(chat.costUsd)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {(cursor || error) && (
        <div className="chat-footer">
          {error && <span className="chat-error">{error}</span>}
          {cursor && (
            <button className="mass-actions-btn" onClick={onLoadMore} disabled={loadingMore}>
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default ChatsTable;
