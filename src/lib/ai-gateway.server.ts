import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export function createLovableAiGatewayProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "lovable-ai-gateway",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: { "Lovable-API-Key": apiKey },
  });
}

export function createGoogleGeminiProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "google-gemini",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

export function createAnthropicProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "anthropic",
    baseURL: "https://api.anthropic.com/v1",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
  });
}
