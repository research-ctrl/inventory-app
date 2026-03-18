export interface AIResponse {
  content: string;
  tool_calls?: Array<{
    name: string;
    args: Record<string, unknown>;
    result: unknown;
  }>;
}
