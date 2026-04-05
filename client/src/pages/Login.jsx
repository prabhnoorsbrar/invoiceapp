import React, { useState } from "react";
import { api, setCurrentUser, setCurrentCompany } from "../api";

export default function Login({ onSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.login(email, password);
      if (res?.user) {
        setCurrentUser(res.user);
        setCurrentCompany(res.company);
        onSuccess?.(res.user, res.company);
      } else {
        setError("Login failed");
      }
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#05060a", backgroundImage: "radial-gradient(ellipse 60% 50% at 20% 60%, rgba(59,130,246,0.12) 0%, transparent 100%), radial-gradient(ellipse 50% 50% at 85% 15%, rgba(139,92,246,0.09) 0%, transparent 100%)" }}>
      <div className="w-full max-w-sm space-y-6">
        {/* Brand */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-extrabold tracking-tight">
            <span className="text-primary">US Pride</span>
            <span className="text-base-content/70"> Logistics</span>
          </h1>
          <p className="text-xs text-base-content/30 uppercase tracking-widest font-semibold">Invoice Portal</p>
        </div>

        {/* Card */}
        <form
          onSubmit={handleLogin}
          className="space-y-3 bg-white/[0.05] backdrop-blur-sm border border-white/[0.10] rounded-2xl p-6 shadow-2xl"
        >
          <input
            className="input w-full bg-white/[0.06] border border-white/10 focus:border-primary/60 focus:outline-none focus:bg-white/[0.09] transition-colors placeholder:text-base-content/30"
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="input w-full bg-white/[0.06] border border-white/10 focus:border-primary/60 focus:outline-none focus:bg-white/[0.09] transition-colors placeholder:text-base-content/30"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <p className="text-error text-sm font-medium">{error}</p>}

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-primary text-primary-content text-sm font-bold hover:opacity-90 active:opacity-80 transition-opacity disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "Logging in…" : "Log In"}
          </button>
        </form>
      </div>
    </div>
  );
}
