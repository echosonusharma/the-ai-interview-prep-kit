"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AuthCard, useAuthSubmit } from "./AuthCard";

export default function LoginView() {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();
  const { loading, error, submit } = useAuthSubmit(() => login(email, password));

  return (
    <AuthCard
      title="Sign in"
      switchText="New here?"
      switchLabel="Create an account"
      switchHref="/signup"
      sideTitle="Welcome back."
      sideSubtitle="Sign in to view your interview prep kits and track generation progress live."
      error={error}
      loading={loading}
      submitLabel="Sign in"
      submitPendingLabel="Signing in…"
      onSubmit={(e) => void submit(e)}
    >
      <label className="block">
        <span className="text-xs font-semibold">Email</span>
        <input
          type="email"
          required
          name="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-[#e6e8f2] bg-[#f6f7fb] px-3.5 py-2.5 text-sm"
        />
      </label>
      <label className="block">
        <span className="text-xs font-semibold">Password</span>
        <div className="mt-1.5 relative">
          <input
            type={show ? "text" : "password"}
            required
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-[#e6e8f2] bg-[#f6f7fb] px-3.5 py-2.5 pr-11 text-sm"
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? "Hide password" : "Show password"}
            className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-[#67708f] transition-colors hover:bg-[#eef0ff] hover:text-[#4f46e5]"
          >
            {show ? <EyeOff size={15} aria-hidden /> : <Eye size={15} aria-hidden />}
          </button>
        </div>
      </label>
    </AuthCard>
  );
}
