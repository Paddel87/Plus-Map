"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { ApiError, apiFetch } from "@/lib/api";

export type UserRole = "admin" | "editor" | "viewer";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  display_name: string | null;
  person_id: string;
  is_active: boolean;
  is_verified: boolean;
}

export const meQueryKey = ["auth", "me"] as const;

export async function fetchMe(): Promise<AuthUser | null> {
  try {
    return await apiFetch<AuthUser>("/api/users/me");
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }
    throw error;
  }
}

export function useMe() {
  return useQuery({
    queryKey: meQueryKey,
    queryFn: fetchMe,
    staleTime: 30_000,
    retry: false,
  });
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ email, password }: LoginCredentials) => {
      const body = new URLSearchParams({ username: email, password });
      await apiFetch<void>("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: meQueryKey });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: async () => {
      await apiFetch<void>("/api/auth/logout", { method: "POST" });
    },
    onSuccess: () => {
      queryClient.setQueryData(meQueryKey, null);
      router.push("/login");
      router.refresh();
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: async (email: string) => {
      await apiFetch<void>("/api/auth/forgot-password", {
        method: "POST",
        body: { email },
      });
    },
  });
}

export interface ResetPasswordPayload {
  token: string;
  password: string;
}

export function useResetPassword() {
  return useMutation({
    mutationFn: async ({ token, password }: ResetPasswordPayload) => {
      await apiFetch<void>("/api/auth/reset-password", {
        method: "POST",
        body: { token, password },
      });
    },
  });
}

export function useChangePassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (password: string) => {
      await apiFetch<void>("/api/users/me", {
        method: "PATCH",
        body: { password },
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: meQueryKey });
    },
  });
}
