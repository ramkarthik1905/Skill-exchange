import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api.js";
import styles from "./DashboardPage.module.css";

export default function DashboardPage() {
  const { token, setUser } = useAuth();
  const [matches, setMatches] = useState([]);
  const [reason, setReason] = useState("");
  const [matchQuery, setMatchQuery] = useState("");
  const [minScore, setMinScore] = useState(0);
  const [filterTheyTeach, setFilterTheyTeach] = useState("");
  const [filterYouTeach, setFilterYouTeach] = useState("");
  const [matchSort, setMatchSort] = useState("score");
  const [matchPage, setMatchPage] = useState(1);
  const pageSize = 8;
  const [skills, setSkills] = useState([]);
  const [offerSkillId, setOfferSkillId] = useState("");
  const [wantSkillId, setWantSkillId] = useState("");
  const [offerProficiency, setOfferProficiency] = useState("intermediate");
  const [offerTeaching, setOfferTeaching] = useState("flexible");
  const [wantPriority, setWantPriority] = useState("high");
  const [wantUrgency, setWantUrgency] = useState(8);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  async function loadMatches() {
    const data = await api("/api/match/me?limit=50", {}, token);
    setMatches(data.matches || []);
    setReason(data.reason || "");
    setMatchPage(1);
  }

  async function loadMe() {
    const me = await api("/api/users/me", {}, token);
    setUser((u) => ({ ...u, ...me }));
    setProfile(me);
    return me;
  }

  async function loadSkillCatalog() {
    const data = await api("/api/skills?limit=200&sort=name");
    setSkills(data.items || []);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadMe();
        await loadSkillCatalog();
        await loadMatches();
      } catch (e) {
        if (!cancelled) setMessage(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function persistProfile(nextOffered, nextWanted) {
    await api(
      "/api/users/me",
      {
        method: "PATCH",
        body: JSON.stringify({ skillsOffered: nextOffered, skillsWanted: nextWanted }),
      },
      token
    );
    await loadMe();
    await loadMatches();
  }

  async function addSkillsToProfile(e) {
    e.preventDefault();
    setMessage("");
    if (!offerSkillId || !wantSkillId) {
      setMessage("Pick both an offered and wanted skill.");
      return;
    }
    const me = profile || (await loadMe());
    const offered = [
      ...(me.skillsOffered || []).map((x) => ({
        skill: x.skill?._id || x.skill,
        proficiency: x.proficiency,
        teachingAvailability: x.teachingAvailability,
        sessionLengthMinutes: x.sessionLengthMinutes,
        notes: x.notes,
      })),
      {
        skill: offerSkillId,
        proficiency: offerProficiency,
        teachingAvailability: offerTeaching,
      },
    ];
    const wanted = [
      ...(me.skillsWanted || []).map((x) => ({
        skill: x.skill?._id || x.skill,
        priority: x.priority,
        urgency: x.urgency,
        desiredProficiencyTarget: x.desiredProficiencyTarget,
        notes: x.notes,
      })),
      {
        skill: wantSkillId,
        priority: wantPriority,
        urgency: wantUrgency,
      },
    ];
    try {
      await persistProfile(offered, wanted);
      setMessage("Profile skills updated. Matching refreshed.");
      setOfferSkillId("");
      setWantSkillId("");
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function removeOffered(entryId) {
    setMessage("");
    const me = profile || (await loadMe());
    const next = (me.skillsOffered || []).filter((x) => String(x._id) !== entryId);
    const wantedPayload = (me.skillsWanted || []).map((x) => ({
      skill: x.skill?._id || x.skill,
      priority: x.priority,
      urgency: x.urgency,
      desiredProficiencyTarget: x.desiredProficiencyTarget,
      notes: x.notes,
    }));
    const offeredPayload = next.map((x) => ({
      skill: x.skill?._id || x.skill,
      proficiency: x.proficiency,
      teachingAvailability: x.teachingAvailability,
      sessionLengthMinutes: x.sessionLengthMinutes,
      notes: x.notes,
    }));
    try {
      await persistProfile(offeredPayload, wantedPayload);
      setMessage("Teaching offer removed.");
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function removeWanted(entryId) {
    setMessage("");
    const me = profile || (await loadMe());
    const next = (me.skillsWanted || []).filter((x) => String(x._id) !== entryId);
    const offeredPayload = (me.skillsOffered || []).map((x) => ({
      skill: x.skill?._id || x.skill,
      proficiency: x.proficiency,
      teachingAvailability: x.teachingAvailability,
      sessionLengthMinutes: x.sessionLengthMinutes,
      notes: x.notes,
    }));
    const wantedPayload = next.map((x) => ({
      skill: x.skill?._id || x.skill,
      priority: x.priority,
      urgency: x.urgency,
      desiredProficiencyTarget: x.desiredProficiencyTarget,
      notes: x.notes,
    }));
    try {
      await persistProfile(offeredPayload, wantedPayload);
      setMessage("Wanted skill removed.");
    } catch (err) {
      setMessage(err.message);
    }
  }

  const skillOptions = useMemo(() => {
    const they = new Set();
    const you = new Set();
    for (const m of matches) {
      const tn = m.pair?.theyTeachYou?.skill?.name;
      const yn = m.pair?.youTeachThem?.skill?.name;
      if (tn) they.add(tn);
      if (yn) you.add(yn);
    }
    return {
      theyTeach: [...they].sort((a, b) => a.localeCompare(b)),
      youTeach: [...you].sort((a, b) => a.localeCompare(b)),
    };
  }, [matches]);

  const browsedMatches = useMemo(() => {
    let list = [...matches];
    const q = matchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((m) => {
        const name = (m.user?.name || "").toLowerCase();
        const head = (m.user?.headline || "").toLowerCase();
        const they = (m.pair?.theyTeachYou?.skill?.name || "").toLowerCase();
        const you = (m.pair?.youTeachThem?.skill?.name || "").toLowerCase();
        return name.includes(q) || head.includes(q) || they.includes(q) || you.includes(q);
      });
    }
    if (minScore > 0) {
      list = list.filter((m) => (m.score ?? 0) >= minScore);
    }
    if (filterTheyTeach) {
      list = list.filter((m) => m.pair?.theyTeachYou?.skill?.name === filterTheyTeach);
    }
    if (filterYouTeach) {
      list = list.filter((m) => m.pair?.youTeachThem?.skill?.name === filterYouTeach);
    }
    if (matchSort === "score") {
      list.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    } else if (matchSort === "name") {
      list.sort((a, b) => (a.user?.name || "").localeCompare(b.user?.name || ""));
    } else if (matchSort === "rating") {
      list.sort((a, b) => (b.user?.averageRating ?? 0) - (a.user?.averageRating ?? 0));
    }
    return list;
  }, [matches, matchQuery, minScore, filterTheyTeach, filterYouTeach, matchSort]);

  const matchPages = Math.max(1, Math.ceil(browsedMatches.length / pageSize));
  const pagedMatches = useMemo(() => {
    const start = (matchPage - 1) * pageSize;
    return browsedMatches.slice(start, start + pageSize);
  }, [browsedMatches, matchPage]);

  useEffect(() => {
    setMatchPage((p) => Math.min(p, matchPages));
  }, [matchPages]);

  async function startExchange(m) {
    setMessage("");
    const theySkill = m.pair.theyTeachYou.skill?._id || m.pair.theyTeachYou.skill;
    const youSkill = m.pair.youTeachThem.skill?._id || m.pair.youTeachThem.skill;
    try {
      await api(
        "/api/exchanges",
        {
          method: "POST",
          body: JSON.stringify({
            recipientId: m.user._id,
            skillOfferedByInitiator: youSkill,
            skillRequestedFromRecipient: theySkill,
          }),
        },
        token
      );
      setMessage("Exchange request created. Check Calendar to propose times.");
    } catch (e) {
      setMessage(e.message);
    }
  }

  if (loading) return <p className={styles.muted}>Loading…</p>;

  return (
    <div>
      <h1 className={styles.h1}>Skill matches</h1>
      <p className={styles.lead}>
        Bilateral barter: you learn something they offer, they learn something you offer. Use the tools
        below to search, filter, and page through matches.
      </p>

      <nav className={styles.browseNav} aria-label="Browse app">
        <Link to="/skills" className={styles.browseLink}>
          Skills library
        </Link>
        <Link to="/exchanges" className={styles.browseLink}>
          My exchanges
        </Link>
        <Link to="/calendar" className={styles.browseLink}>
          Calendar & bookings
        </Link>
        <button type="button" className={styles.browseBtn} onClick={() => loadMatches()}>
          Refresh matches
        </button>
      </nav>

      <section className={styles.panel}>
        <h2>Your profile skills</h2>
        <div className={styles.profileGrid}>
          <div>
            <h3 className={styles.subh}>You teach</h3>
            <ul className={styles.skillList}>
              {(profile?.skillsOffered || []).length === 0 && (
                <li className={styles.muted}>No skills listed yet.</li>
              )}
              {(profile?.skillsOffered || []).map((row) => (
                <li key={row._id} className={styles.skillRow}>
                  <div>
                    <strong>{row.skill?.name || "Skill"}</strong>
                    <span className={styles.mini}>
                      {row.proficiency} · {row.teachingAvailability}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={styles.btnDanger}
                    onClick={() => removeOffered(String(row._id))}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className={styles.subh}>You want to learn</h3>
            <ul className={styles.skillList}>
              {(profile?.skillsWanted || []).length === 0 && (
                <li className={styles.muted}>No skills listed yet.</li>
              )}
              {(profile?.skillsWanted || []).map((row) => (
                <li key={row._id} className={styles.skillRow}>
                  <div>
                    <strong>{row.skill?.name || "Skill"}</strong>
                    <span className={styles.mini}>
                      priority {row.priority} · urgency {row.urgency}/10
                    </span>
                  </div>
                  <button
                    type="button"
                    className={styles.btnDanger}
                    onClick={() => removeWanted(String(row._id))}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className={styles.panel}>
        <h2>Add skills to your profile</h2>
        <form onSubmit={addSkillsToProfile} className={styles.formGrid}>
          <div className={styles.formRow}>
            <label className={styles.formLabel}>
              Skill you can teach
              <select
                className={styles.select}
                value={offerSkillId}
                onChange={(e) => setOfferSkillId(e.target.value)}
              >
                <option value="">Choose…</option>
                {skills.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} ({s.category})
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.formLabel}>
              Proficiency
              <select
                className={styles.select}
                value={offerProficiency}
                onChange={(e) => setOfferProficiency(e.target.value)}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="expert">Expert</option>
              </select>
            </label>
            <label className={styles.formLabel}>
              Teaching availability
              <select
                className={styles.select}
                value={offerTeaching}
                onChange={(e) => setOfferTeaching(e.target.value)}
              >
                <option value="occasional">Occasional</option>
                <option value="regular">Regular</option>
                <option value="flexible">Flexible</option>
              </select>
            </label>
          </div>
          <div className={styles.formRow}>
            <label className={styles.formLabel}>
              Skill you want
              <select
                className={styles.select}
                value={wantSkillId}
                onChange={(e) => setWantSkillId(e.target.value)}
              >
                <option value="">Choose…</option>
                {skills.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} ({s.category})
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.formLabel}>
              Priority
              <select
                className={styles.select}
                value={wantPriority}
                onChange={(e) => setWantPriority(e.target.value)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </label>
            <label className={styles.formLabel}>
              Urgency (1–10)
              <input
                className={styles.select}
                type="number"
                min={1}
                max={10}
                value={wantUrgency}
                onChange={(e) => setWantUrgency(Number(e.target.value))}
              />
            </label>
          </div>
          <button type="submit" className={styles.btn}>
            Add pair & refresh matches
          </button>
        </form>
        {message && <p className={styles.msg}>{message}</p>}
      </section>

      {reason && <p className={styles.hint}>{reason}</p>}

      <section className={styles.panel}>
        <h2>Browse matches</h2>
        <div className={styles.matchToolbar}>
          <label className={styles.formLabel}>
            Search
            <input
              className={styles.select}
              type="search"
              placeholder="Name, headline, or skill…"
              value={matchQuery}
              onChange={(e) => {
                setMatchQuery(e.target.value);
                setMatchPage(1);
              }}
            />
          </label>
          <label className={styles.formLabel}>
            Min score
            <input
              className={styles.select}
              type="number"
              min={0}
              max={100}
              value={minScore}
              onChange={(e) => {
                setMinScore(Number(e.target.value) || 0);
                setMatchPage(1);
              }}
            />
          </label>
          <label className={styles.formLabel}>
            They teach you
            <select
              className={styles.select}
              value={filterTheyTeach}
              onChange={(e) => {
                setFilterTheyTeach(e.target.value);
                setMatchPage(1);
              }}
            >
              <option value="">Any skill</option>
              {skillOptions.theyTeach.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.formLabel}>
            You teach them
            <select
              className={styles.select}
              value={filterYouTeach}
              onChange={(e) => {
                setFilterYouTeach(e.target.value);
                setMatchPage(1);
              }}
            >
              <option value="">Any skill</option>
              {skillOptions.youTeach.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.formLabel}>
            Sort by
            <select
              className={styles.select}
              value={matchSort}
              onChange={(e) => setMatchSort(e.target.value)}
            >
              <option value="score">Match score</option>
              <option value="name">Name (A–Z)</option>
              <option value="rating">Member rating</option>
            </select>
          </label>
          <button
            type="button"
            className={styles.browseBtn}
            onClick={() => {
              setMatchQuery("");
              setMinScore(0);
              setFilterTheyTeach("");
              setFilterYouTeach("");
              setMatchSort("score");
              setMatchPage(1);
            }}
          >
            Clear filters
          </button>
        </div>
        <p className={styles.browseMeta}>
          {browsedMatches.length === 0
            ? `No results (${matches.length} total before filters)`
            : `Showing ${(matchPage - 1) * pageSize + 1}–${Math.min(matchPage * pageSize, browsedMatches.length)} of ${browsedMatches.length} filtered (${matches.length} total)`}
        </p>
      </section>

      <ul className={styles.list}>
        {pagedMatches.map((m) => (
          <li key={m.user._id} className={styles.card}>
            <div className={styles.cardHead}>
              <div>
                <strong>{m.user.name}</strong>
                {m.user.headline && <span className={styles.headline}>{m.user.headline}</span>}
                <span className={styles.cardMeta}>
                  {m.user.timezone && <span>{m.user.timezone}</span>}
                  {typeof m.user.averageRating === "number" && m.user.averageRating > 0 && (
                    <span>
                      ★ {m.user.averageRating.toFixed(1)}
                      {typeof m.user.reviewCount === "number" && m.user.reviewCount > 0
                        ? ` · ${m.user.reviewCount} reviews`
                        : ""}
                    </span>
                  )}
                </span>
              </div>
              <span className={styles.score}>Score {m.score}</span>
            </div>
            <p className={styles.muted}>
              They teach you: <strong>{m.pair.theyTeachYou.skill?.name}</strong> · You teach:{" "}
              <strong>{m.pair.youTeachThem.skill?.name || "—"}</strong>
            </p>
            <button type="button" className={styles.btnSecondary} onClick={() => startExchange(m)}>
              Request exchange
            </button>
          </li>
        ))}
        {!matches.length && !reason && (
          <li className={styles.muted}>No matches yet. Add complementary offer/want skills.</li>
        )}
        {matches.length > 0 && browsedMatches.length === 0 && (
          <li className={styles.muted}>No matches match your filters. Clear search or filters.</li>
        )}
      </ul>

      {browsedMatches.length > pageSize && (
        <div className={styles.pagination}>
          <button
            type="button"
            className={styles.btnSecondary}
            disabled={matchPage <= 1}
            onClick={() => setMatchPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <span className={styles.pageInfo}>
            Page {matchPage} of {matchPages}
          </span>
          <button
            type="button"
            className={styles.btnSecondary}
            disabled={matchPage >= matchPages}
            onClick={() => setMatchPage((p) => Math.min(matchPages, p + 1))}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
