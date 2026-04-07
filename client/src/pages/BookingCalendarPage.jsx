import { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import format from "date-fns/format";
import parse from "date-fns/parse";
import startOfWeek from "date-fns/startOfWeek";
import getDay from "date-fns/getDay";
import { enUS } from "date-fns/locale/en-US";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api.js";
import styles from "./BookingCalendarPage.module.css";

const locales = { "en-US": enUS };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

function buildEvents(exchanges, currentUserId) {
  const out = [];
  for (const ex of exchanges) {
    const other =
      String(ex.initiator?._id || ex.initiator) === String(currentUserId)
        ? ex.recipient?.name || "Partner"
        : ex.initiator?.name || "Partner";
    const titleBase = `${other} · ${ex.skillOfferedByInitiator?.name || "Session"}`;

    if (ex.confirmedSession?.start && ex.confirmedSession?.end) {
      out.push({
        id: `${ex._id}-confirmed`,
        title: `Confirmed: ${titleBase}`,
        start: new Date(ex.confirmedSession.start),
        end: new Date(ex.confirmedSession.end),
        resource: {
          type: "confirmed",
          exchange: ex,
          skillOffered: ex.skillOfferedByInitiator?.name,
          skillRequested: ex.skillRequestedFromRecipient?.name
        },
      });
    }
    (ex.proposedSessions || []).forEach((ps, idx) => {
      if (!ps.start || !ps.end) return;
      out.push({
        id: `${ex._id}-prop-${idx}`,
        title: `Proposed: ${titleBase}`,
        start: new Date(ps.start),
        end: new Date(ps.end),
        resource: {
          type: "proposed",
          exchange: ex,
          session: ps,
          index: idx,
          skillOffered: ex.skillOfferedByInitiator?.name,
          skillRequested: ex.skillRequestedFromRecipient?.name
        },
      });
    });
  }
  return out;
}

export default function BookingCalendarPage() {
  const { token, user } = useAuth();
  const [exchanges, setExchanges] = useState([]);
  const [selectedExchangeId, setSelectedExchangeId] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);

  const load = useCallback(async () => {
    const rangeStart = new Date();
    rangeStart.setDate(rangeStart.getDate() - 7);
    const rangeEnd = new Date();
    rangeEnd.setDate(rangeEnd.getDate() + 60);
    const qs = `?start=${rangeStart.toISOString()}&end=${rangeEnd.toISOString()}`;
    const data = await api(`/api/exchanges/calendar${qs}`, {}, token);
    setExchanges(data);
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await load();
      } catch (e) {
        if (!cancelled) setMsg(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const events = useMemo(
    () => buildEvents(exchanges, user?._id),
    [exchanges, user?._id]
  );

  const handleEventSelect = (event) => {
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  const handleCloseModal = () => {
    setSelectedEvent(null);
    setShowEventModal(false);
  };

  const handleSessionResponse = async (response) => {
    if (!selectedEvent) return;

    setMsg("");
    try {
      if (selectedEvent.resource.type === "proposed") {
        if (response === "accept") {
          await api(
            `/api/exchanges/${selectedEvent.resource.exchange._id}/confirm-session`,
            {
              method: "PATCH",
              body: JSON.stringify({ sessionIndex: selectedEvent.resource.index }),
            },
            token
          );
          setMsg("Session confirmed!");
        } else if (response === "decline") {
          // For decline, we could add a decline endpoint or handle it differently
          // For now, just close the modal
          setMsg("Session declined.");
        }
      } else if (selectedEvent.resource.type === "confirmed") {
        if (response === "complete") {
          await api(
            `/api/exchanges/${selectedEvent.resource.exchange._id}/status`,
            {
              method: "PATCH",
              body: JSON.stringify({ status: "completed" }),
            },
            token
          );
          setMsg("Exchange marked as completed!");
        } else if (response === "start") {
          await api(
            `/api/exchanges/${selectedEvent.resource.exchange._id}/status`,
            {
              method: "PATCH",
              body: JSON.stringify({ status: "in_progress" }),
            },
            token
          );
          setMsg("Exchange started!");
        }
      }
      await load();
      handleCloseModal();
    } catch (err) {
      setMsg(err.message);
    }
  };

  async function submitProposal(e) {
    e.preventDefault();
    setMsg("");
    if (!selectedExchangeId || !start || !end) {
      setMsg("Choose an exchange and start/end times.");
      return;
    }
    try {
      const startIso = new Date(start).toISOString();
      const endIso = new Date(end).toISOString();
      await api(
        `/api/exchanges/${selectedExchangeId}/sessions`,
        {
          method: "POST",
          body: JSON.stringify({ start: startIso, end: endIso }),
        },
        token
      );
      setMsg("Session proposed.");
      await load();
    } catch (err) {
      setMsg(err.message);
    }
  }

  if (loading) return <p className={styles.muted}>Loading calendar…</p>;

  return (
    <div>
      <h1 className={styles.h1}>Booking calendar</h1>
      <p className={styles.lead}>Confirmed and proposed skill sessions appear on the grid.</p>

      <div className={styles.calendarWrap}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 520 }}
          views={["month", "week", "day"]}
          defaultView="week"
          onSelectEvent={handleEventSelect}
          selectable
        />
      </div>

      <section className={styles.panel}>
        <h2>Propose a session</h2>
        <form onSubmit={submitProposal} className={styles.form}>
          <label className={styles.label}>
            Exchange
            <select
              className={styles.input}
              value={selectedExchangeId}
              onChange={(e) => setSelectedExchangeId(e.target.value)}
            >
              <option value="">Select…</option>
              {exchanges.map((ex) => (
                <option key={ex._id} value={ex._id}>
                  {ex._id.slice(-6)} — {ex.status}{" "}
                  {ex.skillOfferedByInitiator?.name ? `· ${ex.skillOfferedByInitiator.name}` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.label}>
            Start (local)
            <input
              className={styles.input}
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>
          <label className={styles.label}>
            End (local)
            <input
              className={styles.input}
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </label>
          <button type="submit" className={styles.btn}>
            Propose time
          </button>
        </form>
        {msg && <p className={styles.msg}>{msg}</p>}
      </section>

      {showEventModal && selectedEvent && (
        <div className={styles.modalOverlay} onClick={handleCloseModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3>Session Details</h3>
            <div className={styles.eventDetails}>
              <p><strong>Type:</strong> {selectedEvent.resource.type === "confirmed" ? "Confirmed Session" : "Proposed Session"}</p>
              <p><strong>Title:</strong> {selectedEvent.title}</p>
              <p><strong>Start:</strong> {format(selectedEvent.start, "PPP p")}</p>
              <p><strong>End:</strong> {format(selectedEvent.end, "PPP p")}</p>
              <p><strong>Exchange Status:</strong> {selectedEvent.resource.exchange.status}</p>
              <p><strong>Skill Offered:</strong> {selectedEvent.resource.skillOffered || "N/A"}</p>
              <p><strong>Skill Requested:</strong> {selectedEvent.resource.skillRequested || "N/A"}</p>
              {selectedEvent.resource.type === "proposed" && selectedEvent.resource.session.message && (
                <p><strong>Message:</strong> {selectedEvent.resource.session.message}</p>
              )}
              {selectedEvent.resource.type === "proposed" && (
                <p><strong>Proposed by:</strong> {selectedEvent.resource.session.proposedBy?.name || "Unknown"}</p>
              )}
            </div>

            <div className={styles.modalActions}>
              {selectedEvent.resource.type === "proposed" && (
                <>
                  <button
                    className={`${styles.btn} ${styles.btnAccept}`}
                    onClick={() => handleSessionResponse("accept")}
                  >
                    Accept Session
                  </button>
                  <button
                    className={`${styles.btn} ${styles.btnDecline}`}
                    onClick={() => handleSessionResponse("decline")}
                  >
                    Decline
                  </button>
                </>
              )}

              {selectedEvent.resource.type === "confirmed" && (
                <>
                  {selectedEvent.resource.exchange.status === "accepted" && (
                    <button
                      className={`${styles.btn} ${styles.btnStart}`}
                      onClick={() => handleSessionResponse("start")}
                    >
                      Start Session
                    </button>
                  )}
                  {selectedEvent.resource.exchange.status === "in_progress" && (
                    <button
                      className={`${styles.btn} ${styles.btnComplete}`}
                      onClick={() => handleSessionResponse("complete")}
                    >
                      Mark Complete
                    </button>
                  )}
                </>
              )}

              <button
                className={`${styles.btn} ${styles.btnCancel}`}
                onClick={handleCloseModal}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
