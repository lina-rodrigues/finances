/** Empty or missing `CURSOR_API_KEY` means AI features are turned off. */
export function readCursorApiKey(): string | null {
  const apiKey = process.env.CURSOR_API_KEY?.trim();
  return apiKey ? apiKey : null;
}
