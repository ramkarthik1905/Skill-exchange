import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api.js";
import styles from "./AuthPages.module.css";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { token, setToken, setUser } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [age, setAge] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  if (token) return <Navigate to="/" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      const data = await api("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name,
          email,
          password,
          age: age === "" ? undefined : Number.parseInt(age, 10),
          dateOfBirth,
        }),
      });
      setToken(data.token);
      setUser(data.user);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message || "Registration failed");
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Create account</h1>
        <p className={styles.subtitle}>
          Join the peer-to-peer skill marketplace. Your age must match your date of birth.
        </p>
        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.label}>
            Full name
            <input
              className={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
            />
          </label>
          <label className={styles.label}>
            Email address
            <input
              className={styles.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>
          <label className={styles.label}>
            Age
            <input
              className={styles.input}
              type="number"
              inputMode="numeric"
              min={0}
              max={130}
              value={age}
              onChange={(e) => setAge(e.target.value)}
              required
              autoComplete="off"
            />
          </label>
          <label className={styles.label}>
            Date of birth
            <input
              className={styles.input}
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              required
            />
          </label>
          <label className={styles.label}>
            Password
            <input
              className={styles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>
          {error && <p className={styles.error}>{error}</p>}
          <button className={styles.primary} type="submit">
            Create account
          </button>
        </form>
        <p className={styles.footer}>
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}
