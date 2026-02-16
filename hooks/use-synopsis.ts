
import { useQuery } from "@tanstack/react-query"
import { SynopsisData } from "@/lib/synopsis-generator"

async function fetchSynopsis(projectId: string): Promise<SynopsisData> {
  const response = await fetch(`/api/projects/${projectId}/synopsis/generate`, {
    method: "POST"
  })

  if (!response.ok) {
    throw new Error("Failed to generate synopsis")
  }

  return response.json()
}

export function useSynopsis(projectId: string) {
  return useQuery({
    queryKey: ["synopsis", projectId],
    queryFn: () => fetchSynopsis(projectId),
    enabled: !!projectId,
  })
}
