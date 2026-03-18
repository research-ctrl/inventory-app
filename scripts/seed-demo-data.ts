import { createAdminClient } from "@/lib/supabase/admin";

async function seedDemoData() {
  const supabase = createAdminClient();
  console.log("Seeding demo data...");
  // TODO: Insert demo requirements, vendors, POs
  console.log("Done.");
}

seedDemoData().catch(console.error);
