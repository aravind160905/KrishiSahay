import { z } from "zod";

export const errorSchemas = {
  validation: z.object({ message: z.string() }),
  internal: z.object({ message: z.string() }),
};

export const api = {
  chat: {
    send: {
      method: "POST" as const,
      path: "/api/chat" as const,
      input: z.object({
        text: z.string(),
        mode: z.enum(["offline", "online"]),
        language: z.string(),
      }),
    },
  },
  queries: {
    list: {
      method: "GET" as const,
      path: "/api/queries" as const,
    },
  },
  analytics: {
    get: {
      method: "GET" as const,
      path: "/api/analytics" as const,
    },
  },
  feedback: {
    send: {
      method: "POST" as const,
      path: "/api/feedback" as const,
      input: z.object({
        queryId: z.string(),
        feedback: z.enum(["up", "down"]),
      }),
    },
  },
};

export function buildUrl(
  path: string,
  params?: Record<string, string | number>
): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
