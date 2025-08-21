export interface FetchJsonOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
}

export async function fetchJson<T = unknown>(
  url: string,
  options: FetchJsonOptions = {}
): Promise<T> {
  const { method = "GET", headers = {}, body, timeoutMs } = options;

  const controller = timeoutMs ? new AbortController() : undefined;
  const timer = timeoutMs
    ? setTimeout(() => controller?.abort(), timeoutMs)
    : undefined;

  try {
    const response = await fetch(url, {
      method,
      headers:
        body !== undefined
          ? { "Content-Type": "application/json", ...headers }
          : headers,
      body:
        body !== undefined
          ? typeof body === "string"
            ? body
            : JSON.stringify(body)
          : undefined,
      signal: controller?.signal,
    });

    if (!response.ok) {
      let errorText = "";
      try {
        errorText = await response.text();
      } catch {}
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return (await response.json()) as T;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
