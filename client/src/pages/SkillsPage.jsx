import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api.js";
import styles from "./SkillsPage.module.css";

export default function SkillsPage() {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState([]);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [tag, setTag] = useState("");
  const [sort, setSort] = useState("name");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [detail, setDetail] = useState(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newTags, setNewTags] = useState("");

  async function fetchList() {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (category) params.set("category", category);
    if (tag.trim()) params.set("tag", tag.trim());
    if (sort) params.set("sort", sort);
    params.set("limit", "120");
    const data = await api(`/api/skills?${params.toString()}`);
    setItems(data.items || []);
    setTotal(typeof data.total === "number" ? data.total : (data.items || []).length);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cats = await api("/api/skills/categories");
        if (!cancelled) setCategories(cats);
        const data = await api("/api/skills?limit=120&sort=name");
        if (!cancelled) {
          setItems(data.items || []);
          setTotal(typeof data.total === "number" ? data.total : (data.items || []).length);
        }
      } catch (e) {
        if (!cancelled) setMsg(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function applyFilters(e) {
    e?.preventDefault();
    setLoading(true);
    setMsg("");
    try {
      await fetchList();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function openDetail(skill) {
    setMsg("");
    try {
      const id = skill._id || skill.slug;
      const d = await api(`/api/skills/${id}`);
      setDetail(d);
    } catch (e) {
      setMsg(e.message);
    }
  }

  async function createSkill(e) {
    e.preventDefault();
    setMsg("");
    try {
      await api(
        "/api/skills",
        {
          method: "POST",
          body: JSON.stringify({
            name: newName,
            category: newCategory,
            description: newDescription,
            tags: newTags,
          }),
        },
        token
      );
      setNewName("");
      setNewCategory("");
      setNewDescription("");
      setNewTags("");
      setCreateOpen(false);
      await fetchList();
      const cats = await api("/api/skills/categories");
      setCategories(cats);
      setMsg("Skill created.");
    } catch (err) {
      setMsg(err.message);
    }
  }

  if (loading && !items.length) return <p className={styles.muted}>Loading skills…</p>;

  return (
    <div>
      <h1 className={styles.h1}>Skills library</h1>
      <p className={styles.lead}>
        Browse, filter, and add skills to the marketplace. Popularity grows when members add a skill
        to their profile.
      </p>

      <form className={styles.toolbar} onSubmit={applyFilters}>
        <div className={styles.field} style={{ flex: "1", minWidth: "200px" }}>
          <label htmlFor="skill-q">Search</label>
          <input
            id="skill-q"
            className={styles.input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Name, tag, category…"
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="skill-cat">Category</label>
          <select
            id="skill-cat"
            className={styles.select}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="skill-tag">Tag</label>
          <input
            id="skill-tag"
            className={styles.input}
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            placeholder="e.g. react"
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="skill-sort">Sort</label>
          <select
            id="skill-sort"
            className={styles.select}
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="name">Name</option>
            <option value="popular">Most popular</option>
            <option value="recent">Newest</option>
          </select>
        </div>
        <button type="submit" className={styles.btn}>
          Apply
        </button>
        <button type="button" className={styles.btnGhost} onClick={() => setCreateOpen((o) => !o)}>
          {createOpen ? "Hide create form" : "+ Create skill"}
        </button>
      </form>

      {createOpen && (
        <section className={styles.panel}>
          <h2>Add a new skill</h2>
          <form className={styles.createGrid} onSubmit={createSkill}>
            <div className={styles.field}>
              <label>Name</label>
              <input
                className={styles.input}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
              />
            </div>
            <div className={styles.field}>
              <label>Category</label>
              <input
                className={styles.input}
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                required
                placeholder="e.g. Engineering"
              />
            </div>
            <div className={styles.field}>
              <label>Description</label>
              <textarea
                className={styles.input}
                rows={3}
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                style={{ resize: "vertical" }}
              />
            </div>
            <div className={styles.field}>
              <label>Tags (comma-separated)</label>
              <input
                className={styles.input}
                value={newTags}
                onChange={(e) => setNewTags(e.target.value)}
                placeholder="react, frontend"
              />
            </div>
            <button type="submit" className={styles.btn}>
              Create skill
            </button>
          </form>
        </section>
      )}

      {msg && <p className={styles.muted}>{msg}</p>}
      <p className={styles.footer}>
        Showing {items.length} of {total} skills
        {loading ? " · updating…" : ""}
      </p>

      <div className={styles.grid}>
        {items.map((s) => (
          <article key={s._id} className={styles.card}>
            <h3>{s.name}</h3>
            <div className={styles.meta}>{s.category}</div>
            {s.description && <p className={styles.desc}>{s.description}</p>}
            {s.tags?.length > 0 && (
              <div className={styles.tags}>
                {s.tags.slice(0, 6).map((t) => (
                  <span key={t} className={styles.tag}>
                    {t}
                  </span>
                ))}
              </div>
            )}
            <div className={styles.pop}>Popularity: {s.popularityScore ?? 0}</div>
            <button type="button" className={styles.btnGhost} onClick={() => openDetail(s)}>
              Details & stats
            </button>
          </article>
        ))}
      </div>

      {detail && (
        <div
          className={styles.detailOverlay}
          role="dialog"
          aria-modal="true"
          onClick={() => setDetail(null)}
        >
          <div className={styles.detailCard} onClick={(e) => e.stopPropagation()}>
            <h2>{detail.name}</h2>
            <p className={styles.muted}>{detail.category}</p>
            {detail.description && <p className={styles.muted}>{detail.description}</p>}
            <div className={styles.stats}>
              <span>
                <strong>{detail.stats?.offeringCount ?? 0}</strong> members teach this
              </span>
              <span>
                <strong>{detail.stats?.wantingCount ?? 0}</strong> want to learn
              </span>
            </div>
            {detail.contributedBy?.name && (
              <p className={styles.muted}>Added by {detail.contributedBy.name}</p>
            )}
            {detail.tags?.length > 0 && (
              <div className={styles.tags}>
                {detail.tags.map((t) => (
                  <span key={t} className={styles.tag}>
                    {t}
                  </span>
                ))}
              </div>
            )}
            <button type="button" className={styles.btn} onClick={() => setDetail(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
