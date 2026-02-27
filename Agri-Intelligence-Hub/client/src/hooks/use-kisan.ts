import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import type { Query, Analytics } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useChat() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      text: string;
      mode: "offline" | "online";
      language: string;
    }): Promise<Query> => {
      const res = await fetch(api.chat.send.path, {
        method: api.chat.send.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        if (res.status === 400) {
          const error = await res.json();
          throw new Error(error.message);
        }
        throw new Error("Failed to communicate with KrishiSahay AI");
      }
      return (await res.json()) as Query;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.queries.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.analytics.get.path] });
    },
    onError: (error) => {
      toast({
        title: "Communication Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useQueryHistory() {
  return useQuery({
    queryKey: [api.queries.list.path],
    queryFn: async (): Promise<Query[]> => {
      const res = await fetch(api.queries.list.path);
      if (!res.ok) throw new Error("Failed to fetch history");
      return (await res.json()) as Query[];
    },
  });
}

export function useAnalytics() {
  return useQuery({
    queryKey: [api.analytics.get.path],
    queryFn: async (): Promise<Analytics> => {
      const res = await fetch(api.analytics.get.path);
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return (await res.json()) as Analytics;
    },
  });
}

export function useFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { queryId: string; feedback: "up" | "down" }) => {
      const res = await fetch(api.feedback.send.path, {
        method: api.feedback.send.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to submit feedback");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.analytics.get.path] });
    },
  });
}
