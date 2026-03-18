import { createAdminClient } from "@/lib/supabase/admin";

async function generateEmbeddings() {
  const supabase = createAdminClient();
  console.log("Generating embeddings...");
  // TODO: Fetch records, generate vectors, upsert to embeddings table
  const { count } = await supabase.from("embeddings").select("*", { count: "exact", head: true });
  console.log("Existing embeddings:", count);
}

generateEmbeddings().catch(console.error);
