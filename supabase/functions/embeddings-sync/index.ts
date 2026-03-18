import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// TODO: Generate and sync embeddings for AI search

serve(async (_req) => {
  return new Response(
    JSON.stringify({ message: "Embeddings sync placeholder" }),
    { status: 200 }
  );
});
