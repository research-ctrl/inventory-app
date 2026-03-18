import { createAdminClient } from "@/lib/supabase/admin";
import { readFileSync } from "fs";

async function importVendors(filePath: string) {
  const supabase = createAdminClient();
  const vendors = JSON.parse(readFileSync(filePath, "utf-8"));
  const { error } = await supabase.from("vendors").upsert(vendors);
  if (error) throw error;
  console.log(`Imported ${vendors.length} vendors.`);
}

importVendors(process.argv[2] ?? "vendors.json").catch(console.error);
