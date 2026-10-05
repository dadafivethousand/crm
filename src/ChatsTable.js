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

const UTM_FIELDS = ["source", "medium", "campaign", "term", "content", "gclid", "fbclid"];

const COLUMN_COUNT = 10;

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

function hostnameOf(url) {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function hasValue(v) {
  return v !== undefined && v !== null && v !== "";
}

function capitalize(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : "";
}

// "Richmond Hill, ON" — falls back to the country alone
function formatLocation(loc) {
  if (!loc) return "";
  const place = [loc.city, loc.region].filter(Boolean).join(", ");
  return place || loc.country || "";
}

// "iPhone · iOS 18 · Safari"; type stands in when there's no model
function formatDevice(device) {
  if (!device) return "";
  return [device.model || capitalize(device.type), device.os, device.browser].filter(Boolean).join(" · ");
}

// UTM tags win, then the referring site. Rows from before visitor tracking
// have no client block at all, so those stay blank rather than "Direct".
function formatSource(client) {
  if (!client) return "";
  const utm = client.utm || {};
  const tagged = [utm.source, utm.medium, utm.campaign].filter(Boolean).join(" / ");
  if (tagged) return tagged;
  if (client.referrer) return hostnameOf(client.referrer);
  return "Direct";
}

function DetailField({ label, children }) {
  if (!hasValue(children)) return null;
  return (
    <div className="chat-detail-field">
      <span className="ct-card-row-label">{label}</span>
      <span className="chat-detail-value">{children}</span>
    </div>
  );
}

// Every captured field, grouped. Empty groups disappear so old rows stay tidy.
function ChatDetail({ chat, onFilter }) {
  const loc = chat.location || {};
  const device = chat.device || {};
  const client = chat.client || {};
  const utm = client.utm || {};
  const hasCoords = hasValue(loc.latitude) && hasValue(loc.longitude);
  const stop = (e) => e.stopPropagation();

  const groups = [
    {
      title: "Visitor",
      fields: [
        ["Visitor", client.visitorId && (
          <button className="chat-session-link" onClick={(e) => { stop(e); onFilter("visitor", client.visitorId); }} title="Show every chat from this visitor">
            {client.visitorId}
          </button>
        )],
        ["Visits", client.visits],
        ["First seen", client.firstSeen && formatChatTime(client.firstSeen)],
        ["Session", chat.sessionId && (
          <button className="chat-session-link" onClick={(e) => { stop(e); onFilter("session", chat.sessionId); }} title="Show this conversation">
            {chat.sessionId}
          </button>
        )],
        ["IP", chat.ip],
        ["IP hash", chat.ipHash],
      ],
    },
    {
      title: "Location",
      fields: [
        ["City", loc.city],
        ["Region", loc.region],
        ["Postal", loc.postalCode],
        ["Country", loc.country],
        ["Coords", hasCoords && (
          <a className="ct-card-link" href={`https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`} target="_blank" rel="noopener noreferrer" onClick={stop}>
            {loc.latitude}, {loc.longitude}
          </a>
        )],
        ["Timezone", loc.timezone],
        ["ISP", loc.isp],
        ["ASN", loc.asn],
      ],
    },
    {
      title: "Device",
      fields: [
        ["Type", device.type],
        ["Model", device.model],
        ["OS", device.os],
        ["Browser", device.browser],
        ["Screen", client.screen],
        ["Viewport", client.viewport],
        ["Language", client.language],
        ["Accept", device.acceptLanguage],
        ["Timezone", client.timezone],
        ["Agent", device.userAgent],
      ],
    },
    {
      title: "Traffic",
      fields: [
        ["Page", chat.page],
        ["Landing", client.landingPage],
        ["Referrer", client.referrer],
        ...UTM_FIELDS.map((f) => [f.endsWith("clid") ? f : `utm_${f}`, utm[f]]),
      ],
    },
    {
      title: "Model",
      fields: [
        ["Model", chat.model],
        ["Stop", chat.stopReason],
        ["Cost", formatCost(chat.costUsd)],
        ...Object.entries(chat.usage || {}).map(([k, v]) => [k, typeof v === "object" ? JSON.stringify(v) : v]),
      ],
    },
  ]
    .map((g) => ({ ...g, fields: g.fields.filter(([, v]) => hasValue(v) && v !== false) }))
    .filter((g) => g.fields.length > 0);

  return (
    <div className="chat-detail" onClick={stop}>
      {groups.map((g) => (
        <div key={g.title} className="chat-detail-group">
          <div className="chat-detail-title">{g.title}</div>
          {g.fields.map(([label, value]) => (
            <DetailField key={label} label={label}>{value}</DetailField>
          ))}
        </div>
      ))}
    </div>
  );
}

function ChatsTable({ chats, cursor, loadingMore, error, onLoadMore }) {
  const [expanded, setExpanded] = useState(() => new Set());
  // { kind: "session" | "visitor", value }
  const [filter, setFilter] = useState(null);

  const toggleExpanded = (key) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const applyFilter = (kind, value) => setFilter({ kind, value });

  // A filtered conversation reads top-to-bottom, so flip it to oldest first
  const visibleChats = useMemo(() => {
    const arr = chats || [];
    if (!filter) return arr;
    const match = filter.kind === "visitor"
      ? (c) => c.client?.visitorId === filter.value
      : (c) => c.sessionId === filter.value;
    return arr.filter(match).reverse();
  }, [chats, filter]);

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
        {filter && (
          <button className="chat-session-chip" onClick={() => setFilter(null)} title="Show all chats">
            {filter.kind === "visitor" ? "Visitor" : "Session"} {filter.value.slice(0, 8)} <span aria-hidden="true">×</span>
          </button>
        )}
      </div>

      <div className="ct-table-wrap">
        <table className="ct-client-table chat-table">
          <thead>
            <tr>
              <th className="ct-small"></th>
              <th className="chat-col-time">Time</th>
              <th>Question</th>
              <th>Answer</th>
              <th className="chat-col-status">Status</th>
              <th className="chat-col-meta">Location</th>
              <th className="chat-col-meta">Device</th>
              <th className="chat-col-meta">Source</th>
              <th className="chat-col-ip">IP</th>
              <th className="chat-col-cost">Cost</th>
            </tr>
          </thead>
          <tbody>
            {visibleChats.length === 0 ? (
              <tr>
                <td colSpan={COLUMN_COUNT} className="ct-empty-state">
                  {error ? "Couldn't load chats" : "No chats yet"}
                </td>
              </tr>
            ) : (
              visibleChats.map((chat, index) => {
                const key = chat.key ?? index;
                const isOpen = expanded.has(key);
                const location = formatLocation(chat.location);
                const device = formatDevice(chat.device);
                const source = formatSource(chat.client);
                return (
                  <React.Fragment key={key}>
                    <tr
                      className={`chat-row${isOpen ? " chat-row--open" : ""}`}
                      onClick={() => toggleExpanded(key)}
                      title={isOpen ? "Click to collapse" : "Click for details"}
                    >
                      <td className="ct-small">
                        <span className="chat-chevron" aria-hidden="true">{isOpen ? "▾" : "▸"}</span>
                      </td>
                      <td className="chat-col-time">{formatChatTime(chat.createdAt)}</td>
                      <td className="chat-text">{chat.question}</td>
                      <td className={`chat-text chat-answer${isOpen ? " chat-answer--open" : ""}`}>
                        {chat.answer || <span className="chat-muted">—</span>}
                      </td>
                      <td className="chat-col-status">
                        <span className={`status-badge ${statusClass(chat.status)}`}>
                          {STATUS_LABELS[chat.status] || chat.status || "Unknown"}
                        </span>
                      </td>
                      <td className="chat-col-meta" title={chat.location?.postalCode ? `Postal code ${chat.location.postalCode}` : ""}><span className="chat-clip">{location}</span></td>
                      <td className="chat-col-meta" title={chat.device?.userAgent || ""}><span className="chat-clip">{device}</span></td>
                      <td className="chat-col-meta" title={chat.client?.referrer || ""}><span className="chat-clip">{source}</span></td>
                      <td className="chat-col-ip" title={chat.ip || ""}><span className="chat-clip">{chat.ip}</span></td>
                      <td className="chat-col-cost">{formatCost(chat.costUsd)}</td>
                    </tr>
                    {isOpen && (
                      <tr className="chat-detail-row">
                        <td colSpan={COLUMN_COUNT}>
                          <ChatDetail chat={chat} onFilter={applyFilter} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
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
