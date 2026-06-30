// Smart Worker Recommendation & Bid Ranking
// Scores workers / offers on a 0-100 scale using multiple signals.

import { supabase } from "@/integrations/supabase/client";

export type WorkerLike = {
  id: string;
  categories: string[] | null;
  skills: string[] | null;
  city: string | null;
  rating: number | null;
  reviews_count: number | null;
  completed_jobs: number | null;
  availability: "available" | "busy" | "offline" | null;
  is_verified: boolean | null;
  hourly_rate: number | null;
  headline?: string | null;
  service_radius_km?: number | null;
};

export type JobLike = {
  category: string;
  location: string;
  budget: number | null;
  job_type?: "scheduled" | "urgent" | "emergency";
};

export type ScoreBreakdown = {
  skill: number;       // /25
  location: number;    // /15
  rating: number;      // /20
  experience: number;  // /10
  availability: number;// /15
  verified: number;    // /5
  bid: number;         // /10 (only when bid provided)
  total: number;       // /100
};

const normalizeCity = (s?: string | null) =>
  (s ?? "").toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();

function skillScore(worker: WorkerLike, job: JobLike): number {
  const target = job.category.toLowerCase();
  const cats = (worker.categories ?? []).map((c) => c.toLowerCase());
  const skills = (worker.skills ?? []).map((s) => s.toLowerCase());
  if (cats.includes(target)) return 25;
  if (skills.some((s) => s.includes(target) || target.includes(s))) return 18;
  if (cats.some((c) => c.includes(target) || target.includes(c))) return 15;
  return 0;
}

function locationScore(worker: WorkerLike, job: JobLike): number {
  const w = normalizeCity(worker.city);
  const j = normalizeCity(job.location);
  if (!w || !j) return 4;
  if (j.includes(w) || w.includes(j)) return 15;
  // token overlap
  const wt = new Set(w.split(/\s+/).filter(Boolean));
  const jt = j.split(/\s+/).filter(Boolean);
  const hits = jt.filter((t) => wt.has(t)).length;
  if (hits >= 2) return 12;
  if (hits === 1) return 8;
  return 2;
}

function ratingScore(worker: WorkerLike): number {
  const r = Number(worker.rating ?? 0);
  const rc = Number(worker.reviews_count ?? 0);
  // confidence factor: ramp up across first 10 reviews
  const conf = Math.min(rc / 10, 1);
  // baseline 10 for new workers so they aren't crushed
  const raw = (r / 5) * 20;
  return Math.round(raw * conf + 10 * (1 - conf));
}

function experienceScore(worker: WorkerLike): number {
  const c = Number(worker.completed_jobs ?? 0);
  return Math.round(Math.min(c / 20, 1) * 10);
}

function availabilityScore(worker: WorkerLike, job: JobLike): number {
  const a = worker.availability ?? "offline";
  if (a === "available") return 15;
  if (a === "busy") return job.job_type === "emergency" ? 4 : 8;
  return 0;
}

function verifiedScore(worker: WorkerLike): number {
  return worker.is_verified ? 5 : 0;
}

function bidScore(price: number, budget: number | null | undefined): number {
  if (!budget || budget <= 0) return 5; // neutral when no budget
  const ratio = price / budget;
  if (ratio <= 0.8) return 10;
  if (ratio <= 1.0) return 8;
  if (ratio <= 1.15) return 5;
  if (ratio <= 1.3) return 2;
  return 0;
}

export function scoreWorker(
  worker: WorkerLike,
  job: JobLike,
  bid?: { price: number },
): ScoreBreakdown {
  const skill = skillScore(worker, job);
  const location = locationScore(worker, job);
  const rating = ratingScore(worker);
  const experience = experienceScore(worker);
  const availability = availabilityScore(worker, job);
  const verified = verifiedScore(worker);
  const bid_ = bid ? bidScore(bid.price, job.budget) : 0;
  // When there's no bid, redistribute the 10 bid points proportionally
  // so the worker recommendation panel still uses a 0-100 scale.
  const total = bid
    ? skill + location + rating + experience + availability + verified + bid_
    : Math.round(
        ((skill + location + rating + experience + availability + verified) / 90) * 100,
      );
  return { skill, location, rating, experience, availability, verified, bid: bid_, total };
}

export type RecommendedWorker = {
  worker: WorkerLike;
  profile: { id: string; full_name: string | null; avatar_url: string | null; city: string | null } | null;
  score: ScoreBreakdown;
};

/**
 * Fetch and rank workers for a given job.
 * Excludes workers already assigned to another active job (prevents duplicate assignment).
 */
export async function recommendWorkersForJob(job: JobLike & { id?: string }, limit = 5): Promise<RecommendedWorker[]> {
  const { data: workers, error } = await supabase
    .from("worker_profiles")
    .select("*")
    .neq("availability", "offline")
    .limit(100);
  if (error) throw error;

  // Workers currently assigned to a non-terminal job somewhere else
  const { data: busyAssignments } = await supabase
    .from("jobs")
    .select("assigned_worker_id, id, status")
    .not("assigned_worker_id", "is", null)
    .in("status", ["accepted", "on_the_way", "started", "in_progress"]);
  const busySet = new Set(
    (busyAssignments ?? [])
      .filter((j) => !job.id || j.id !== job.id)
      .map((j) => j.assigned_worker_id as string),
  );

  const eligible = (workers ?? []).filter((w) => !busySet.has(w.id));

  const ids = eligible.map((w) => w.id);
  const profiles = ids.length
    ? (await supabase.from("profiles").select("id, full_name, avatar_url, city").in("id", ids)).data ?? []
    : [];
  const pmap = new Map(profiles.map((p) => [p.id, p]));

  const ranked = eligible
    .map((w) => ({
      worker: w as WorkerLike,
      profile: pmap.get(w.id) ?? null,
      score: scoreWorker(w as WorkerLike, job),
    }))
    .filter((r) => r.score.skill > 0 || r.score.location >= 8) // basic relevance gate
    .sort((a, b) => b.score.total - a.score.total)
    .slice(0, limit);

  return ranked;
}

/**
 * Rank job offers by combined worker quality + bid attractiveness.
 */
export async function rankOffers(
  offers: Array<{ id: string; worker_id: string; price: number; eta_minutes: number | null; status: string; message: string | null; created_at: string }>,
  job: JobLike,
) {
  const ids = Array.from(new Set(offers.map((o) => o.worker_id)));
  if (!ids.length) return [];
  const [{ data: workers }, { data: profiles }] = await Promise.all([
    supabase.from("worker_profiles").select("*").in("id", ids),
    supabase.from("profiles").select("id, full_name, avatar_url, city").in("id", ids),
  ]);
  const wmap = new Map((workers ?? []).map((w) => [w.id, w as WorkerLike]));
  const pmap = new Map((profiles ?? []).map((p) => [p.id, p]));

  return offers
    .map((o) => {
      const w = wmap.get(o.worker_id);
      const score = w ? scoreWorker(w, job, { price: Number(o.price) }) : null;
      return { offer: o, worker: w ?? null, profile: pmap.get(o.worker_id) ?? null, score };
    })
    .sort((a, b) => (b.score?.total ?? 0) - (a.score?.total ?? 0));
}
