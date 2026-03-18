// Auto-generated Supabase DB types placeholder.
// Run: npx supabase gen types typescript --project-id <id> > types/database.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          role: string;
          department: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["profiles"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      requirements: {
        Row: {
          id: string;
          ref_number: string;
          title: string;
          description: string | null;
          vessel_name: string | null;
          department: string | null;
          requested_by: string;
          urgency: string;
          status: string;
          required_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["requirements"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["requirements"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      status: "draft" | "pending" | "approved" | "rejected" | "in_progress" | "completed" | "cancelled" | "on_hold";
      urgency_level: "routine" | "urgent" | "critical";
      qc_result: "pass" | "fail" | "conditional";
      recovery_outcome: "reuse" | "repair" | "scrap" | "sell";
    };
  };
}
