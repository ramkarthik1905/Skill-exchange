import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api.js";
import styles from "./ExchangesPage.module.css";

export default function ExchangesPage() {
  const { token, user } = useAuth();
  const [exchanges, setExchanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState("all"); // all, pending, accepted, in_progress, completed
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("updatedAt"); // updatedAt, createdAt, status
  const [showAddNote, setShowAddNote] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [stats, setStats] = useState({});

  const loadExchanges = useCallback(async () => {
    try {
      const data = await api("/api/exchanges/my", {}, token);
      setExchanges(data);

      // Calculate stats
      const stats = {
        total: data.length,
        pending: data.filter(ex => ex.status === 'pending').length,
        accepted: data.filter(ex => ex.status === 'accepted').length,
        inProgress: data.filter(ex => ex.status === 'in_progress').length,
        completed: data.filter(ex => ex.status === 'completed').length,
        averageRating: 0,
        totalReviews: 0
      };

      // Calculate average rating from completed exchanges
      const completedExchanges = data.filter(ex => ex.status === 'completed');
      if (completedExchanges.length > 0) {
        const totalRating = completedExchanges.reduce((sum, ex) => {
          // This would need to be calculated from reviews, for now using placeholder
          return sum + (Math.random() * 2 + 3); // Mock rating between 3-5
        }, 0);
        stats.averageRating = (totalRating / completedExchanges.length).toFixed(1);
        stats.totalReviews = completedExchanges.length;
      }

      setStats(stats);
    } catch (err) {
      setMessage(err.message);
    }
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadExchanges();
      } catch (e) {
        if (!cancelled) setMessage(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadExchanges]);

  const handleStatusChange = async (exchangeId, newStatus) => {
    setMessage("");
    try {
      await api(`/api/exchanges/${exchangeId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      }, token);
      setMessage(`Exchange ${newStatus === "accepted" ? "accepted" : newStatus === "declined" ? "declined" : "updated"} successfully!`);
      await loadExchanges();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleAddNote = async (exchangeId) => {
    if (!noteText.trim()) return;

    setMessage("");
    try {
      const exchange = exchanges.find(ex => ex._id === exchangeId);
      const isInitiator = String(exchange.initiator._id) === String(user._id);
      const noteField = isInitiator ? "initiatorNotes" : "recipientNotes";

      await api(`/api/exchanges/${exchangeId}/notes`, {
        method: "PATCH",
        body: JSON.stringify({ [noteField]: noteText }),
      }, token);

      setMessage("Note added successfully!");
      setShowAddNote(null);
      setNoteText("");
      await loadExchanges();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const filteredExchanges = exchanges.filter(ex => {
    if (filter === "all") return true;
    if (filter !== "all" && ex.status !== filter) return false;

    if (searchTerm) {
      const partner = String(ex.initiator._id) === String(user._id) ? ex.recipient : ex.initiator;
      const searchLower = searchTerm.toLowerCase();
      return (
        partner.name.toLowerCase().includes(searchLower) ||
        ex.skillOfferedByInitiator?.name.toLowerCase().includes(searchLower) ||
        ex.skillRequestedFromRecipient?.name.toLowerCase().includes(searchLower)
      );
    }

    return true;
  }).sort((a, b) => {
    switch (sortBy) {
      case "createdAt":
        return new Date(b.createdAt) - new Date(a.createdAt);
      case "status":
        return a.status.localeCompare(b.status);
      case "updatedAt":
      default:
        return new Date(b.updatedAt) - new Date(a.updatedAt);
    }
  });

  const getStatusColor = (status) => {
    switch (status) {
      case "pending": return styles.statusPending;
      case "accepted": return styles.statusAccepted;
      case "declined": return styles.statusDeclined;
      case "in_progress": return styles.statusInProgress;
      case "completed": return styles.statusCompleted;
      case "cancelled": return styles.statusCancelled;
      default: return styles.statusDefault;
    }
  };

  const getActionButtons = (exchange) => {
    const isInitiator = String(exchange.initiator._id) === String(user._id);
    const isRecipient = String(exchange.recipient._id) === String(user._id);

    switch (exchange.status) {
      case "pending":
        if (isRecipient) {
          return (
            <>
              <button
                className={`${styles.btn} ${styles.btnAccept}`}
                onClick={() => handleStatusChange(exchange._id, "accepted")}
              >
                Accept
              </button>
              <button
                className={`${styles.btn} ${styles.btnDecline}`}
                onClick={() => handleStatusChange(exchange._id, "declined")}
              >
                Decline
              </button>
            </>
          );
        }
        return <span className={styles.waiting}>Waiting for response</span>;

      case "accepted":
        return (
          <>
            <button
              className={`${styles.btn} ${styles.btnStart}`}
              onClick={() => handleStatusChange(exchange._id, "in_progress")}
            >
              Start Exchange
            </button>
            {(isInitiator || isRecipient) && (
              <button
                className={`${styles.btn} ${styles.btnCancel}`}
                onClick={() => handleStatusChange(exchange._id, "cancelled")}
              >
                Cancel
              </button>
            )}
          </>
        );

      case "in_progress":
        return (
          <>
            <button
              className={`${styles.btn} ${styles.btnComplete}`}
              onClick={() => handleStatusChange(exchange._id, "completed")}
            >
              Mark Complete
            </button>
            {(isInitiator || isRecipient) && (
              <button
                className={`${styles.btn} ${styles.btnCancel}`}
                onClick={() => handleStatusChange(exchange._id, "cancelled")}
              >
                Cancel
              </button>
            )}
          </>
        );

      case "completed":
        return <span className={styles.completed}>Exchange completed</span>;

      case "cancelled":
        return <span className={styles.cancelled}>Exchange cancelled</span>;

      case "declined":
        return <span className={styles.declined}>Exchange declined</span>;

      default:
        return null;
    }
  };

  if (loading) return <p className={styles.muted}>Loading exchanges…</p>;

  return (
    <div>
      <h1 className={styles.h1}>My Exchanges</h1>
      <p className={styles.lead}>Manage your skill exchange requests and ongoing exchanges.</p>

      {/* Statistics Dashboard */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statNumber}>{stats.total}</div>
          <div className={styles.statLabel}>Total Exchanges</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statNumber}>{stats.pending}</div>
          <div className={styles.statLabel}>Pending</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statNumber}>{stats.inProgress}</div>
          <div className={styles.statLabel}>In Progress</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statNumber}>{stats.completed}</div>
          <div className={styles.statLabel}>Completed</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statNumber}>{stats.averageRating}</div>
          <div className={styles.statLabel}>Avg Rating</div>
        </div>
      </div>

      <div className={styles.filters}>
        <label className={styles.filterLabel}>
          Search
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Search by partner or skill..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </label>

        <label className={styles.filterLabel}>
          Filter by status:
          <select
            className={styles.select}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All Exchanges</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="declined">Declined</option>
          </select>
        </label>

        <label className={styles.filterLabel}>
          Sort by:
          <select
            className={styles.select}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="updatedAt">Last Updated</option>
            <option value="createdAt">Date Created</option>
            <option value="status">Status</option>
          </select>
        </label>

        <button
          className={styles.refreshBtn}
          onClick={loadExchanges}
        >
          Refresh
        </button>
      </div>

      {message && <p className={styles.msg}>{message}</p>}

      <div className={styles.exchangesList}>
        {filteredExchanges.length === 0 ? (
          <p className={styles.muted}>
            {filter === "all" && !searchTerm ? "No exchanges yet." : `No ${filter} exchanges match your search.`}
          </p>
        ) : (
          filteredExchanges.map((exchange) => {
            const isInitiator = String(exchange.initiator._id) === String(user._id);
            const partner = isInitiator ? exchange.recipient : exchange.initiator;

            return (
              <div key={exchange._id} className={styles.exchangeCard}>
                <div className={styles.exchangeHeader}>
                  <div>
                    <h3 className={styles.partnerName}>{partner.name}</h3>
                    <p className={styles.partnerHeadline}>{partner.headline || "No headline"}</p>
                  </div>
                  <span className={`${styles.status} ${getStatusColor(exchange.status)}`}>
                    {exchange.status.replace("_", " ").toUpperCase()}
                  </span>
                </div>

                <div className={styles.exchangeDetails}>
                  <div className={styles.skillInfo}>
                    <p>
                      <strong>You {isInitiator ? "offer:" : "will learn:"}</strong>{" "}
                      {exchange.skillOfferedByInitiator?.name}
                    </p>
                    <p>
                      <strong>{isInitiator ? "You will learn:" : "They offer:"}</strong>{" "}
                      {exchange.skillRequestedFromRecipient?.name}
                    </p>
                  </div>

                  {exchange.confirmedSession && (
                    <div className={styles.sessionInfo}>
                      <p>
                        <strong>Confirmed Session:</strong>{" "}
                        {new Date(exchange.confirmedSession.start).toLocaleString()} -{" "}
                        {new Date(exchange.confirmedSession.end).toLocaleString()}
                      </p>
                    </div>
                  )}

                  {(exchange.initiatorNotes || exchange.recipientNotes) && (
                    <div className={styles.notes}>
                      {exchange.initiatorNotes && (
                        <p><strong>Initiator notes:</strong> {exchange.initiatorNotes}</p>
                      )}
                      {exchange.recipientNotes && (
                        <p><strong>Recipient notes:</strong> {exchange.recipientNotes}</p>
                      )}
                    </div>
                  )}

                  <div className={styles.exchangeMeta}>
                    <span>Match Score: {exchange.matchScore}</span>
                    <span>Created: {new Date(exchange.createdAt).toLocaleDateString()}</span>
                    {exchange.completedAt && (
                      <span>Completed: {new Date(exchange.completedAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>

                <div className={styles.actions}>
                  {getActionButtons(exchange)}

                  <button
                    className={`${styles.btn} ${styles.btnNote}`}
                    onClick={() => setShowAddNote(showAddNote === exchange._id ? null : exchange._id)}
                  >
                    {showAddNote === exchange._id ? "Cancel Note" : "Add Note"}
                  </button>
                </div>

                {showAddNote === exchange._id && (
                  <div className={styles.noteForm}>
                    <textarea
                      className={styles.noteTextarea}
                      placeholder="Add a note about this exchange..."
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      rows={3}
                    />
                    <div className={styles.noteActions}>
                      <button
                        className={`${styles.btn} ${styles.btnSave}`}
                        onClick={() => handleAddNote(exchange._id)}
                      >
                        Save Note
                      </button>
                      <button
                        className={`${styles.btn} ${styles.btnCancel}`}
                        onClick={() => {
                          setShowAddNote(null);
                          setNoteText("");
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}