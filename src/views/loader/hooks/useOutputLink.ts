import { useMemo } from "react";

export const useOutputLink = (input: string, property: string) => {
  const href = useMemo(() => {
    const url = new URL(import.meta.env.BASE_URL, location.origin);
    const q = new URLSearchParams([[property, input]]);
    url.hash = "?" + q.toString()
    return url.href;
  }, [input, property]);

  return href;
}
