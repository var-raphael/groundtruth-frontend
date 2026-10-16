import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

let candidateClient: SupabaseClient | null = null;
let recruiterClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!candidateClient) {
    candidateClient = createClient(url, anonKey);
  }
  return candidateClient;
}

export function getRecruiterSupabase(): SupabaseClient {
  if (!recruiterClient) {
    recruiterClient = createClient(url, anonKey, {
      auth: { storageKey: "gt-recruiter-auth" },
    });
  }
  return recruiterClient;
}
