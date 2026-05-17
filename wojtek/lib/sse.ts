export async function* streamSSE<T>(
  url: string,
  body: unknown,
): AsyncGenerator<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.body) return;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      const m = line.match(/^data: (.+)$/m);
      if (m) {
        try {
          yield JSON.parse(m[1]) as T;
        } catch {}
      }
    }
  }
}
