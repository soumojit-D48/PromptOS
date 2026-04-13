export function trackServerEvent(event: string, properties?: Record<string, unknown>) {
  console.log(`[Track] ${event}`, properties);
}