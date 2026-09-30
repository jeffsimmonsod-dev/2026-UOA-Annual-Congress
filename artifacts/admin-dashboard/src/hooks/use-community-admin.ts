import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface CommunityReport {
  id: string | number;
  type: string;
  targetId: string | number;
  reason: string;
  reporterName: string;
  createdAt: string;
  status: string;
}

export interface CommunityContent {
  type: string;
  id: string | number;
  body: string;
  authorName: string;
  sessionToken: string;
  objectPath?: string | null;
  hidden: boolean;
  createdAt: string;
}

export interface CommunityUser {
  sessionToken: string;
  name: string;
  restricted: boolean;
}

export interface CommunityAdminData {
  reports: CommunityReport[];
  content: CommunityContent[];
  users: CommunityUser[];
  cutoffAt: string | null;
}

const key = (conferenceId: number, pin: string) => ["community-admin", conferenceId, pin] as const;
const headers = (conferenceId: number, pin: string) => ({
  "X-Conference-Id": String(conferenceId),
  "X-Admin-Pin": pin,
});

async function request<T>(path: string, conferenceId: number, pin: string, method = "GET", data?: unknown): Promise<T> {
  const response = await fetch(path, {
    method,
    credentials: "include",
    headers: { ...headers(conferenceId, pin), ...(data !== undefined ? { "Content-Type": "application/json" } : {}) },
    ...(data !== undefined ? { body: JSON.stringify(data) } : {}),
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => null) as { error?: string; message?: string } | null;
    throw new Error(detail?.error || detail?.message || `Request failed (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function useCommunityAdmin(conferenceId: number, pin: string) {
  return useQuery({
    queryKey: key(conferenceId, pin),
    queryFn: () => request<CommunityAdminData>("/api/community/admin", conferenceId, pin),
    enabled: !!conferenceId && !!pin,
    refetchInterval: 30000,
  });
}

export function useCommunityActions(conferenceId: number, pin: string) {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: key(conferenceId, pin) });
  const content = useMutation({
    mutationFn: (data: { type: string; id: string | number; hidden: boolean }) =>
      request<unknown>("/api/community/admin/content", conferenceId, pin, "PATCH", data),
    onSuccess: refresh,
  });
  const users = useMutation({
    mutationFn: (data: { sessionToken: string; restricted: boolean }) =>
      request<unknown>("/api/community/admin/users", conferenceId, pin, "PATCH", data),
    onSuccess: refresh,
  });
  const reports = useMutation({
    mutationFn: (data: { id: string | number; status: "dismissed" | "resolved" }) =>
      request<unknown>(`/api/community/admin/reports/${encodeURIComponent(data.id)}`, conferenceId, pin, "PATCH", { status: data.status }),
    onSuccess: refresh,
  });
  const settings = useMutation({
    mutationFn: (data: { cutoffAt: string | null }) =>
      request<{ cutoffAt: string | null }>("/api/community/admin/settings", conferenceId, pin, "PATCH", data),
    onSuccess: (result) => {
      client.setQueryData<CommunityAdminData>(key(conferenceId, pin), old => old ? { ...old, cutoffAt: result.cutoffAt } : old);
    },
  });
  return { content, users, reports, settings };
}

export interface AdminLeaderboard {
  leaders: { name: string; points: number; rank: number; sessionToken: string }[];
  cutoffAt: string | null;
}

export async function getCommunityLeaderboard(conferenceId: number, pin: string): Promise<AdminLeaderboard> {
  return request<AdminLeaderboard>("/api/community/admin/leaderboard", conferenceId, pin);
}