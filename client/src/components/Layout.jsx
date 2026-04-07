import { Outlet, Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import styles from "./Layout.module.css";

export default function Layout() {
  const { user, logout } = useAuth();
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link to="/" className={styles.brand}>
          Skill Exchange
        </Link>
        <nav className={styles.nav}>
          <NavLink to="/" end className={({ isActive }) => (isActive ? styles.active : "")}>
            Matches
          </NavLink>
          <NavLink to="/skills" className={({ isActive }) => (isActive ? styles.active : "")}>
            Skills
          </NavLink>
          <NavLink to="/exchanges" className={({ isActive }) => (isActive ? styles.active : "")}>
            Exchanges
          </NavLink>
          <NavLink to="/calendar" className={({ isActive }) => (isActive ? styles.active : "")}>
            Calendar
          </NavLink>
        </nav>
        <div className={styles.user}>
          {user?.name && <span>{user.name}</span>}
          <button type="button" className={styles.outlineBtn} onClick={logout}>
            Log out
          </button>
        </div>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
