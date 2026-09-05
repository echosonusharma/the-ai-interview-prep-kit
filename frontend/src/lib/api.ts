import type { DashboardSummary, KitDetail, KitListResponse, KitSummary, PracticeDeck, User } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

const REQUEST_TIMEOUT_MS = 30000;

// Aborts hung requests so callers never spin forever (e.g. cold backend).
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  init?.signal?.addEventListener("abort", () => controller.abort(), { once: true });
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      signal: controller.signal,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
  } catch (err) {
    if (controller.signal.aborted && !init?.signal?.aborted) {
      throw new ApiError("Request timed out. The server is taking too long — try again.", 408);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
  const body =
    res.status === 204 ? {} : await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError((body as { error?: string }).error ?? res.statusText, res.status);
  }
  return body as T;
}

export const api = {
  signup: (data: { email: string; password: string; name?: string }) =>
    request<{ user: User }>("/api/auth/signup", { method: "POST", body: JSON.stringify(data) }),

  login: (data: { email: string; password: string }) =>
    request<{ user: User }>("/api/auth/login", { method: "POST", body: JSON.stringify(data) }),

  logout: () => request<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),

  me: () => request<{ user: User }>("/api/auth/me"),

  listKits: (
    params?: { page?: number; limit?: number; sort?: string; status?: string; q?: string },
    signal?: AbortSignal
  ) => {
    const search = new URLSearchParams();
    if (params?.page) search.set("page", String(params.page));
    if (params?.limit) search.set("limit", String(params.limit));
    if (params?.sort) search.set("sort", params.sort);
    if (params?.status) search.set("status", params.status);
    if (params?.q?.trim()) search.set("q", params.q.trim());
    const qs = search.toString();
    return request<KitListResponse>(`/api/kits${qs ? `?${qs}` : ""}`, { signal });
  },

  getDashboard: (page = 1, limit = 5) =>
    request<DashboardSummary>(`/api/kits/dashboard/summary?page=${page}&limit=${limit}`),

  getKit: (id: string) => request<KitDetail>(`/api/kits/${id}`),

  deleteKit: (id: string) => request<{ ok: boolean }>(`/api/kits/${id}`, { method: "DELETE" }),

  createKit: (data: { rawJd: string; companyUrl: string; days: number }) =>
    request<KitDetail>("/api/kits", { method: "POST", body: JSON.stringify(data) }),

  createKitBatch: (cases: Array<{ rawJd: string; companyUrl: string; days: number }>) =>
    request<{ kits: KitSummary[]; errors: Array<{ index: number; message: string }> }>("/api/kits/batch", {
      method: "POST",
      body: JSON.stringify({ cases }),
    }),

  patchBrief: (id: string, data: { summary?: string; what_they_do?: string; pinned?: boolean }) =>
    request<KitDetail>(`/api/kits/${id}/brief`, { method: "PATCH", body: JSON.stringify(data) }),

  patchQuestion: (
    id: string,
    qid: string,
    data: Partial<{
      prompt: string;
      answer_outline: string;
      difficulty: 1 | 2 | 3;
      category: string;
      requirement_ids: string[];
      pinned: boolean;
    }>
  ) => request<KitDetail>(`/api/kits/${id}/questions/${qid}`, { method: "PATCH", body: JSON.stringify(data) }),

  addQuestion: (
    id: string,
    data: {
      prompt: string;
      answer_outline: string;
      difficulty: 1 | 2 | 3;
      category: string;
      requirement_ids: string[];
    }
  ) => request<KitDetail>(`/api/kits/${id}/questions`, { method: "POST", body: JSON.stringify(data) }),

  deleteQuestion: (id: string, qid: string) =>
    request<KitDetail>(`/api/kits/${id}/questions/${qid}`, { method: "DELETE" }),

  patchRequirement: (
    id: string,
    rid: string,
    data: Partial<{ text: string; kind: string; priority: string; pinned: boolean }>
  ) => request<KitDetail>(`/api/kits/${id}/requirements/${rid}`, { method: "PATCH", body: JSON.stringify(data) }),

  addRequirement: (id: string, data: { text: string; kind: string; priority: string }) =>
    request<KitDetail>(`/api/kits/${id}/requirements`, { method: "POST", body: JSON.stringify(data) }),

  deleteRequirement: (id: string, rid: string) =>
    request<KitDetail>(`/api/kits/${id}/requirements/${rid}`, { method: "DELETE" }),

  reorderQuestions: (id: string, order: string[]) =>
    request<KitDetail>(`/api/kits/${id}/questions/reorder`, { method: "PATCH", body: JSON.stringify({ order }) }),

  patchFlashcard: (
    id: string,
    fid: string,
    data: Partial<{ front: string; back: string; requirement_ids: string[]; pinned: boolean }>
  ) => request<KitDetail>(`/api/kits/${id}/flashcards/${fid}`, { method: "PATCH", body: JSON.stringify(data) }),

  addFlashcard: (id: string, data: { front: string; back: string; requirement_ids: string[] }) =>
    request<KitDetail>(`/api/kits/${id}/flashcards`, { method: "POST", body: JSON.stringify(data) }),

  deleteFlashcard: (id: string, fid: string) =>
    request<KitDetail>(`/api/kits/${id}/flashcards/${fid}`, { method: "DELETE" }),

  regenerate: (id: string, section: string) =>
    request<KitDetail>(`/api/kits/${id}/regenerate/${section}`, { method: "POST" }),

  getPractice: (id: string) => request<PracticeDeck>(`/api/kits/${id}/practice`),

  reviewFlashcard: (id: string, flashcardId: string, confidence: number) =>
    request<PracticeDeck>(`/api/kits/${id}/practice/review`, {
      method: "POST",
      body: JSON.stringify({ flashcardId, confidence }),
    }),

  kitEventsUrl: (id: string) => `${API_URL}/api/kits/${id}/events`,
};
