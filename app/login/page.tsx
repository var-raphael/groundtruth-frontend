"use client";

import { useEffect, useState } from "react";
import { FiLoader } from "react-icons/fi";
import { FaGoogle } from "react-icons/fa6";
import { getRecruiterSupabase } from "../../lib/supabase";

function Logo({ size = 20 }: { size?: number }) {
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
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 font-mono text-[13px] font-semibold mb-10 justify-center">
          <Logo size={18} /> groundtruth
        </div>

        <div className="rounded-xl border border-white/15 bg-white/[0.02] p-6">
          <h1 className="text-[20px] font-bold mb-1">Sign in</h1>
          <p className="text-[13px] text-white/50 leading-relaxed mb-6">
            Recruiters sign in with Google to manage jobs and review verified candidate reports.
          </p>

          <button
            onClick={signIn}
            disabled={signingIn}
            className="w-full flex items-center justify-center gap-2.5 bg-white hover:bg-white/90 disabled:opacity-60 text-black font-mono text-[13px] font-semibold rounded-lg py-3 transition-colors"
          >
            {signingIn ? <FiLoader size={14} className="animate-spin" /> : <FaGoogle size={14} />}
            Continue with Google
          </button>

          {error && <p className="font-mono text-[11px] text-red-400 mt-3">{error}</p>}
        </div>

        <p className="font-mono text-[11px] text-white/30 text-center mt-5 leading-relaxed">
          Applying for a job? Use the link the hiring team sent you instead.
        </p>
      </div>
    </div>
  );
}
