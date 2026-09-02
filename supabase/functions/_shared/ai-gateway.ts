import { createOpenAICompatible } from "npm:@ai-sdk/openai-compatible";

/**
 * Provedor para o Lovable AI Gateway (compartilhado entre funções).
 * Envia a chave em "Lovable-API-Key" — nunca em Authorization.
 */
export function createLovableAiGatewayProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "lovable-ai-gateway",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: {
      "Lovable-API-Key": apiKey,
    },
  });
}
