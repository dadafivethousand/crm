import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebaseConfig";
import "./Stylesheets/LoginForm.css";

export default function LoginForm({ onLogin }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const friendlyError = (err) => {
    const code = err?.code || "";
    if (code.includes("auth/invalid-credential") || code.includes("auth/invalid-login-credentials")) {
      return "Invalid email or password.";
    }
    if (code.includes("auth/user-not-found")) return "No account found with that email.";
    if (code.includes("auth/wrong-password")) return "Incorrect password.";
    if (code.includes("auth/too-many-requests")) return "Too many attempts. Try again later.";
    return "Sign in failed. Please try again.";
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    if (loading) return;
    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
      const token = await userCredential.user.getIdToken();
      onLogin(token, userCredential.user);
    } catch (err) {
      console.error("Login failed:", err);
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-form-container">
      <form onSubmit={handleLogin} className="login-form" noValidate>
        <img className="login-logo" src={require("./Images/crmlogo.png")} alt="CRM" />

        <h2 className="login-title">Sign in</h2>
        <p className="login-subtitle">Use your account to continue.</p>

        <label className="sr-only" htmlFor="login-email">Email</label>
        <input
          id="login-email"
          type="email"
          placeholder="Email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
        />

        <label className="sr-only" htmlFor="login-password">Password</label>
        <input
          id="login-password"
          type="password"
          placeholder="Password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading}
        />

        {error && <div className="login-error" role="alert">{error}</div>}

        <button type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
