"use client";

import { useEffect, useState } from "react";
import { FiLoader } from "react-icons/fi";
import { getRecruiterSupabase } from "../../lib/supabase";

function Logo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
      <path d="M6 3 L20 12 L6 21 Z" fill="#3FB950" />
      <path
        d="M9.5 12.5 L11.5 14.5 L15 10.5"
        stroke="#000000"
        strokeWidth={2.2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className="flex-shrink-0">
      <path
        fill="#FFC107"
        style={{ fill: "#FFC107" }}
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        style={{ fill: "#FF3D00" }}
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        style={{ fill: "#4CAF50" }}
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        style={{ fill: "#1976D2" }}
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const [checking, setChecking] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getRecruiterSupabase()
      .auth.getSession()
      .then(({ data }) => {
        if (data.session) {
          window.location.replace("/candidates");
          return;
        }
        setChecking(false);
      })
      .catch(() => setChecking(false));
  }, []);

  const signIn = async () => {
    setSigningIn(true);
    setError(null);
    const { error } = await getRecruiterSupabase().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/candidates` },
    });
    if (error) {
      setError(error.message);
      setSigningIn(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <FiLoader size={22} className="animate-spin text-white/40" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans flex items-center justify-center px-6">
      <div className="w-full max-w-sm flex flex-col items-center text-center">
        <div className="flex items-center gap-2 font-mono text-[15px] font-semibold mb-10">
          <Logo size={22} /> groundtruth
        </div>

        <h1 className="text-[22px] font-bold tracking-tight mb-2">Sign in to continue</h1>
        <p className="text-[14px] text-white/60 leading-relaxed mb-8 max-w-xs">
          Recruiters sign in with Google to manage jobs and review verified candidate reports.
        </p>

        <button
          onClick={signIn}
          disabled={signingIn}
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-white/90 active:bg-white/80 disabled:opacity-60 text-black font-mono text-[14px] font-semibold rounded-lg py-3.5 transition-colors"
        >
          {signingIn ? <FiLoader size={16} className="animate-spin" /> : <GoogleIcon size={18} />}
          {signingIn ? "Redirecting..." : "Continue with Google"}
        </button>

        {error && <p className="font-mono text-[11px] text-red-400 mt-3">{error}</p>}

        <p className="font-mono text-[11px] text-white/30 leading-relaxed mt-8 max-w-xs">
          Applying for a job? Use the link the hiring team sent you instead.
          <br />
          By continuing, you agree to groundtruth&apos;s terms and privacy policy.
        </p>
      </div>
    </div>
  );
}