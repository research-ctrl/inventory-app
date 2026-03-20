// Supabase database types — Shipyard Material Lifecycle System
// Generated: 2026-03-18

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
      // ------------------------------------------------------------------ //
      // profiles
      // ------------------------------------------------------------------ //
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          role: Database["public"]["Enums"]["user_role"];
          department: string | null;
          employee_id: string | null;
          phone: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          department?: string | null;
          employee_id?: string | null;
          phone?: string | null;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          department?: string | null;
          employee_id?: string | null;
          phone?: string | null;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: []
      };

      // ------------------------------------------------------------------ //
      // vessels
      // ------------------------------------------------------------------ //
      vessels: {
        Row: {
          id: string;
          name: string;
          imo_number: string | null;
          vessel_type: string | null;
          flag: string | null;
          owner: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          imo_number?: string | null;
          vessel_type?: string | null;
          flag?: string | null;
          owner?: string | null;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          name?: string;
          imo_number?: string | null;
          vessel_type?: string | null;
          flag?: string | null;
          owner?: string | null;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: []
      };

      // ------------------------------------------------------------------ //
      // departments
      // ------------------------------------------------------------------ //
      departments: {
        Row: {
          id: string;
          code: string;
          name: string;
          head_id: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          head_id?: string | null;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          head_id?: string | null;
          is_active?: boolean;
        };
        Relationships: []
      };

      // ------------------------------------------------------------------ //
      // seq_counters
      // ------------------------------------------------------------------ //
      seq_counters: {
        Row: {
          entity_type: string;
          last_val: number;
        };
        Insert: {
          entity_type: string;
          last_val?: number;
        };
        Update: {
          entity_type?: string;
          last_val?: number;
        };
        Relationships: []
      };

      // ------------------------------------------------------------------ //
      // workflow_history
      // ------------------------------------------------------------------ //
      workflow_history: {
        Row: {
          id: string;
          entity_type: string;
          entity_id: string;
          from_status: string | null;
          to_status: string;
          event: Database["public"]["Enums"]["workflow_event"];
          actor_id: string | null;
          comment: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          entity_type: string;
          entity_id: string;
          from_status?: string | null;
          to_status: string;
          event: Database["public"]["Enums"]["workflow_event"];
          actor_id?: string | null;
          comment?: string | null;
          metadata?: Json | null;
        };
        Update: {
          id?: string;
          entity_type?: string;
          entity_id?: string;
          from_status?: string | null;
          to_status?: string;
          event?: Database["public"]["Enums"]["workflow_event"];
          actor_id?: string | null;
          comment?: string | null;
          metadata?: Json | null;
        };
        Relationships: []
      };

      // ------------------------------------------------------------------ //
      // notifications
      // ------------------------------------------------------------------ //
      notifications: {
        Row: {
          id: string;
          recipient_id: string;
          entity_type: string | null;
          entity_id: string | null;
          title: string;
          body: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          recipient_id: string;
          entity_type?: string | null;
          entity_id?: string | null;
          title: string;
          body?: string | null;
          is_read?: boolean;
        };
        Update: {
          id?: string;
          recipient_id?: string;
          entity_type?: string | null;
          entity_id?: string | null;
          title?: string;
          body?: string | null;
          is_read?: boolean;
        };
        Relationships: []
      };

      // ------------------------------------------------------------------ //
      // audit_log
      // ------------------------------------------------------------------ //
      audit_log: {
        Row: {
          id: string;
          actor_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          ip_address: string | null;
          old_data: Json | null;
          new_data: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          ip_address?: string | null;
          old_data?: Json | null;
          new_data?: Json | null;
        };
        Update: {
          id?: string;
          actor_id?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          ip_address?: string | null;
          old_data?: Json | null;
          new_data?: Json | null;
        };
        Relationships: []
      };

      // ------------------------------------------------------------------ //
      // requirements
      // ------------------------------------------------------------------ //
      requirements: {
        Row: {
          id: string;
          ref_number: string;
          title: string;
          description: string | null;
          vessel_id: string | null;
          department_id: string | null;
          requested_by: string;
          urgency: Database["public"]["Enums"]["urgency_level"];
          status: Database["public"]["Enums"]["item_status"];
          required_date: string | null;
          budget_estimate: number | null;
          currency: string | null;
          rejection_reason: string | null;
          approved_by: string | null;
          approved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          ref_number?: string;
          title: string;
          description?: string | null;
          vessel_id?: string | null;
          department_id?: string | null;
          requested_by: string;
          urgency?: Database["public"]["Enums"]["urgency_level"];
          status?: Database["public"]["Enums"]["item_status"];
          required_date?: string | null;
          budget_estimate?: number | null;
          currency?: string | null;
          rejection_reason?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
        };
        Update: {
          id?: string;
          ref_number?: string;
          title?: string;
          description?: string | null;
          vessel_id?: string | null;
          department_id?: string | null;
          requested_by?: string;
          urgency?: Database["public"]["Enums"]["urgency_level"];
          status?: Database["public"]["Enums"]["item_status"];
          required_date?: string | null;
          budget_estimate?: number | null;
          currency?: string | null;
          rejection_reason?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          updated_at?: string;
        };
        Relationships: []
      };

      // ------------------------------------------------------------------ //
      // requirement_items
      // ------------------------------------------------------------------ //
      requirement_items: {
        Row: {
          id: string;
          requirement_id: string;
          line_number: number;
          description: string;
          part_number: string | null;
          quantity: number;
          unit: string;
          estimated_unit_price: number | null;
          currency: string | null;
          specifications: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          requirement_id: string;
          line_number?: number;
          description: string;
          part_number?: string | null;
          quantity: number;
          unit?: string;
          estimated_unit_price?: number | null;
          currency?: string | null;
          specifications?: string | null;
          notes?: string | null;
        };
        Update: {
          id?: string;
          requirement_id?: string;
          line_number?: number;
          description?: string;
          part_number?: string | null;
          quantity?: number;
          unit?: string;
          estimated_unit_price?: number | null;
          currency?: string | null;
          specifications?: string | null;
          notes?: string | null;
        };
        Relationships: []
      };

      // ------------------------------------------------------------------ //
      // vendors
      // ------------------------------------------------------------------ //
      vendors: {
        Row: {
          id: string;
          code: string;
          name: string;
          trade_name: string | null;
          email: string | null;
          phone: string | null;
          website: string | null;
          address_line1: string | null;
          address_line2: string | null;
          city: string | null;
          country: string | null;
          postal_code: string | null;
          category: string | null;
          rating: number | null;
          payment_terms_days: number | null;
          currency: string | null;
          tax_id: string | null;
          bank_details: Json | null;
          is_approved: boolean;
          approved_by: string | null;
          approved_at: string | null;
          blacklisted: boolean;
          blacklist_reason: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          trade_name?: string | null;
          email?: string | null;
          phone?: string | null;
          website?: string | null;
          address_line1?: string | null;
          address_line2?: string | null;
          city?: string | null;
          country?: string | null;
          postal_code?: string | null;
          category?: string | null;
          rating?: number | null;
          payment_terms_days?: number | null;
          currency?: string | null;
          tax_id?: string | null;
          bank_details?: Json | null;
          is_approved?: boolean;
          approved_by?: string | null;
          approved_at?: string | null;
          blacklisted?: boolean;
          blacklist_reason?: string | null;
          notes?: string | null;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          trade_name?: string | null;
          email?: string | null;
          phone?: string | null;
          website?: string | null;
          address_line1?: string | null;
          address_line2?: string | null;
          city?: string | null;
          country?: string | null;
          postal_code?: string | null;
          category?: string | null;
          rating?: number | null;
          payment_terms_days?: number | null;
          currency?: string | null;
          tax_id?: string | null;
          bank_details?: Json | null;
          is_approved?: boolean;
          approved_by?: string | null;
          approved_at?: string | null;
          blacklisted?: boolean;
          blacklist_reason?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: []
      };

      // ------------------------------------------------------------------ //
      // vendor_contacts
      // ------------------------------------------------------------------ //
      vendor_contacts: {
        Row: {
          id: string;
          vendor_id: string;
          name: string;
          designation: string | null;
          email: string | null;
          phone: string | null;
          is_primary: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          vendor_id: string;
          name: string;
          designation?: string | null;
          email?: string | null;
          phone?: string | null;
          is_primary?: boolean;
        };
        Update: {
          id?: string;
          vendor_id?: string;
          name?: string;
          designation?: string | null;
          email?: string | null;
          phone?: string | null;
          is_primary?: boolean;
        };
        Relationships: []
      };

      // ------------------------------------------------------------------ //
      // approvals
      // ------------------------------------------------------------------ //
      approvals: {
        Row: {
          id: string;
          entity_type: string;
          entity_id: string;
          step_number: number;
          approver_id: string;
          status: Database["public"]["Enums"]["item_status"];
          comment: string | null;
          decided_at: string | null;
          due_date: string | null;
          escalated: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          entity_type: string;
          entity_id: string;
          step_number?: number;
          approver_id: string;
          status?: Database["public"]["Enums"]["item_status"];
          comment?: string | null;
          decided_at?: string | null;
          due_date?: string | null;
          escalated?: boolean;
        };
        Update: {
          id?: string;
          entity_type?: string;
          entity_id?: string;
          step_number?: number;
          approver_id?: string;
          status?: Database["public"]["Enums"]["item_status"];
          comment?: string | null;
          decided_at?: string | null;
          due_date?: string | null;
          escalated?: boolean;
        };
        Relationships: []
      };

      // ------------------------------------------------------------------ //
      // purchase_orders
      // ------------------------------------------------------------------ //
      purchase_orders: {
        Row: {
          id: string;
          po_number: string;
          requirement_id: string | null;
          vendor_id: string;
          status: Database["public"]["Enums"]["item_status"];
          payment_terms: string | null;
          delivery_address: string | null;
          incoterms: string | null;
          total_amount: number | null;
          tax_amount: number | null;
          discount_amount: number | null;
          currency: string;
          expected_delivery: string | null;
          actual_delivery: string | null;
          rejection_reason: string | null;
          approved_by: string | null;
          approved_at: string | null;
          ordered_by: string | null;
          ordered_at: string | null;
          created_by: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          po_number?: string;
          requirement_id?: string | null;
          vendor_id: string;
          status?: Database["public"]["Enums"]["item_status"];
          payment_terms?: string | null;
          delivery_address?: string | null;
          incoterms?: string | null;
          total_amount?: number | null;
          tax_amount?: number | null;
          discount_amount?: number | null;
          currency?: string;
          expected_delivery?: string | null;
          actual_delivery?: string | null;
          rejection_reason?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          ordered_by?: string | null;
          ordered_at?: string | null;
          created_by: string;
          notes?: string | null;
        };
        Update: {
          id?: string;
          po_number?: string;
          requirement_id?: string | null;
          vendor_id?: string;
          status?: Database["public"]["Enums"]["item_status"];
          payment_terms?: string | null;
          delivery_address?: string | null;
          incoterms?: string | null;
          total_amount?: number | null;
          tax_amount?: number | null;
          discount_amount?: number | null;
          currency?: string;
          expected_delivery?: string | null;
          actual_delivery?: string | null;
          rejection_reason?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          ordered_by?: string | null;
          ordered_at?: string | null;
          created_by?: string;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: []
      };

      // ------------------------------------------------------------------ //
      // po_items
      // ------------------------------------------------------------------ //
      po_items: {
        Row: {
          id: string;
          po_id: string;
          requirement_item_id: string | null;
          line_number: number;
          description: string;
          part_number: string | null;
          quantity: number;
          unit: string;
          unit_price: number;
          currency: string;
          tax_rate: number | null;
          discount_rate: number | null;
          line_total: number | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          po_id: string;
          requirement_item_id?: string | null;
          line_number?: number;
          description: string;
          part_number?: string | null;
          quantity: number;
          unit?: string;
          unit_price: number;
          currency?: string;
          tax_rate?: number | null;
          discount_rate?: number | null;
          line_total?: number | null;
          notes?: string | null;
        };
        Update: {
          id?: string;
          po_id?: string;
          requirement_item_id?: string | null;
          line_number?: number;
          description?: string;
          part_number?: string | null;
          quantity?: number;
          unit?: string;
          unit_price?: number;
          currency?: string;
          tax_rate?: number | null;
          discount_rate?: number | null;
          line_total?: number | null;
          notes?: string | null;
        };
        Relationships: []
      };

      // ------------------------------------------------------------------ //
      // payments
      // ------------------------------------------------------------------ //
      payments: {
        Row: {
          id: string;
          po_id: string;
          payment_ref: string | null;
          amount: number;
          currency: string;
          payment_date: string | null;
          payment_method: string | null;
          bank_reference: string | null;
          status: Database["public"]["Enums"]["item_status"];
          processed_by: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          po_id: string;
          payment_ref?: string | null;
          amount: number;
          currency?: string;
          payment_date?: string | null;
          payment_method?: string | null;
          bank_reference?: string | null;
          status?: Database["public"]["Enums"]["item_status"];
          processed_by?: string | null;
          notes?: string | null;
        };
        Update: {
          id?: string;
          po_id?: string;
          payment_ref?: string | null;
          amount?: number;
          currency?: string;
          payment_date?: string | null;
          payment_method?: string | null;
          bank_reference?: string | null;
          status?: Database["public"]["Enums"]["item_status"];
          processed_by?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: []
      };

      // ------------------------------------------------------------------ //
      // deliveries
      // ------------------------------------------------------------------ //
      deliveries: {
        Row: {
          id: string;
          delivery_ref: string;
          po_id: string;
          status: Database["public"]["Enums"]["item_status"];
          supplier_delivery_note: string | null;
          tracking_number: string | null;
          carrier: string | null;
          expected_date: string | null;
          actual_received_date: string | null;
          received_by: string | null;
          receiving_location_id: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          delivery_ref?: string;
          po_id: string;
          status?: Database["public"]["Enums"]["item_status"];
          supplier_delivery_note?: string | null;
          tracking_number?: string | null;
          carrier?: string | null;
          expected_date?: string | null;
          actual_received_date?: string | null;
          received_by?: string | null;
          receiving_location_id?: string | null;
          notes?: string | null;
        };
        Update: {
          id?: string;
          delivery_ref?: string;
          po_id?: string;
          status?: Database["public"]["Enums"]["item_status"];
          supplier_delivery_note?: string | null;
          tracking_number?: string | null;
          carrier?: string | null;
          expected_date?: string | null;
          actual_received_date?: string | null;
          received_by?: string | null;
          receiving_location_id?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: []
      };

      // ------------------------------------------------------------------ //
      // delivery_items
      // ------------------------------------------------------------------ //
      delivery_items: {
        Row: {
          id: string;
          delivery_id: string;
          po_item_id: string | null;
          line_number: number;
          description: string;
          part_number: string | null;
          quantity_expected: number;
          quantity_received: number | null;
          unit: string;
          condition_notes: string | null;
          is_partial: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          delivery_id: string;
          po_item_id?: string | null;
          line_number?: number;
          description: string;
          part_number?: string | null;
          quantity_expected: number;
          quantity_received?: number | null;
          unit?: string;
          condition_notes?: string | null;
          is_partial?: boolean;
        };
        Update: {
          id?: string;
          delivery_id?: string;
          po_item_id?: string | null;
          line_number?: number;
          description?: string;
          part_number?: string | null;
          quantity_expected?: number;
          quantity_received?: number | null;
          unit?: string;
          condition_notes?: string | null;
          is_partial?: boolean;
          updated_at?: string;
        };
        Relationships: []
      };

      // ------------------------------------------------------------------ //
      // store_locations
      // ------------------------------------------------------------------ //
      store_locations: {
        Row: {
          id: string;
          code: string;
          name: string;
          warehouse: string | null;
          zone: string | null;
          aisle: string | null;
          rack: string | null;
          bin: string | null;
          capacity_kg: number | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          warehouse?: string | null;
          zone?: string | null;
          aisle?: string | null;
          rack?: string | null;
          bin?: string | null;
          capacity_kg?: number | null;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          warehouse?: string | null;
          zone?: string | null;
          aisle?: string | null;
          rack?: string | null;
          bin?: string | null;
          capacity_kg?: number | null;
          is_active?: boolean;
        };
        Relationships: []
      };

      // ------------------------------------------------------------------ //
      // qc_inspections
      // ------------------------------------------------------------------ //
      qc_inspections: {
        Row: {
          id: string;
          inspection_ref: string;
          delivery_id: string;
          delivery_item_id: string | null;
          inspector_id: string | null;
          result: Database["public"]["Enums"]["qc_result"] | null;
          status: Database["public"]["Enums"]["item_status"];
          inspection_date: string | null;
          pass_criteria: string | null;
          remarks: string | null;
          documents: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          inspection_ref?: string;
          delivery_id: string;
          delivery_item_id?: string | null;
          inspector_id?: string | null;
          result?: Database["public"]["Enums"]["qc_result"] | null;
          status?: Database["public"]["Enums"]["item_status"];
          inspection_date?: string | null;
          pass_criteria?: string | null;
          remarks?: string | null;
          documents?: Json | null;
        };
        Update: {
          id?: string;
          inspection_ref?: string;
          delivery_id?: string;
          delivery_item_id?: string | null;
          inspector_id?: string | null;
          result?: Database["public"]["Enums"]["qc_result"] | null;
          status?: Database["public"]["Enums"]["item_status"];
          inspection_date?: string | null;
          pass_criteria?: string | null;
          remarks?: string | null;
          documents?: Json | null;
          updated_at?: string;
        };
        Relationships: []
      };

      // ------------------------------------------------------------------ //
      // qc_defects
      // ------------------------------------------------------------------ //
      qc_defects: {
        Row: {
          id: string;
          inspection_id: string;
          defect_code: string | null;
          description: string;
          severity: string | null;
          quantity_affected: number | null;
          disposition: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          inspection_id: string;
          defect_code?: string | null;
          description: string;
          severity?: string | null;
          quantity_affected?: number | null;
          disposition?: string | null;
        };
        Update: {
          id?: string;
          inspection_id?: string;
          defect_code?: string | null;
          description?: string;
          severity?: string | null;
          quantity_affected?: number | null;
          disposition?: string | null;
        };
        Relationships: []
      };

      // ------------------------------------------------------------------ //
      // inventory_pins
      // ------------------------------------------------------------------ //
      inventory_pins: {
        Row: {
          id: string;
          pin_number: string;
          description: string;
          part_number: string | null;
          category: string | null;
          unit: string;
          location_id: string | null;
          status: Database["public"]["Enums"]["item_status"];
          is_serialized: boolean;
          serial_number: string | null;
          min_stock_level: number | null;
          max_stock_level: number | null;
          parent_pin_id: string | null;
          derived_from_recovery_id: string | null;
          origin_type: string | null;
          origin_reference: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          pin_number?: string;
          description: string;
          part_number?: string | null;
          category?: string | null;
          unit?: string;
          location_id?: string | null;
          status?: Database["public"]["Enums"]["item_status"];
          is_serialized?: boolean;
          serial_number?: string | null;
          min_stock_level?: number | null;
          max_stock_level?: number | null;
          parent_pin_id?: string | null;
          derived_from_recovery_id?: string | null;
          origin_type?: string | null;
          origin_reference?: string | null;
        };
        Update: {
          id?: string;
          pin_number?: string;
          description?: string;
          part_number?: string | null;
          category?: string | null;
          unit?: string;
          location_id?: string | null;
          status?: Database["public"]["Enums"]["item_status"];
          is_serialized?: boolean;
          serial_number?: string | null;
          min_stock_level?: number | null;
          max_stock_level?: number | null;
          parent_pin_id?: string | null;
          derived_from_recovery_id?: string | null;
          origin_type?: string | null;
          origin_reference?: string | null;
          updated_at?: string;
        };
        Relationships: []
      };

      // ------------------------------------------------------------------ //
      // inventory_transactions
      // ------------------------------------------------------------------ //
      inventory_transactions: {
        Row: {
          id: string;
          pin_id: string;
          transaction_type: Database["public"]["Enums"]["transaction_type"];
          quantity: number;
          quantity_before: number | null;
          quantity_after: number | null;
          reference_type: string | null;
          reference_id: string | null;
          location_id: string | null;
          unit_cost: number | null;
          notes: string | null;
          actor_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          pin_id: string;
          transaction_type: Database["public"]["Enums"]["transaction_type"];
          quantity: number;
          quantity_before?: number | null;
          quantity_after?: number | null;
          reference_type?: string | null;
          reference_id?: string | null;
          location_id?: string | null;
          unit_cost?: number | null;
          notes?: string | null;
          actor_id?: string | null;
        };
        Update: {
          id?: string;
          pin_id?: string;
          transaction_type?: Database["public"]["Enums"]["transaction_type"];
          quantity?: number;
          quantity_before?: number | null;
          quantity_after?: number | null;
          reference_type?: string | null;
          reference_id?: string | null;
          location_id?: string | null;
          unit_cost?: number | null;
          notes?: string | null;
          actor_id?: string | null;
        };
        Relationships: []
      };

      // ------------------------------------------------------------------ //
      // material_issues
      // ------------------------------------------------------------------ //
      material_issues: {
        Row: {
          id: string;
          issue_number: string;
          pin_id: string;
          issued_to: string;
          vessel_id: string | null;
          work_order: string | null;
          quantity: number;
          quantity_returned: number | null;
          unit: string;
          status: Database["public"]["Enums"]["item_status"];
          purpose: string | null;
          approved_by: string | null;
          approved_at: string | null;
          issued_by: string | null;
          issued_at: string | null;
          expected_return_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          issue_number?: string;
          pin_id: string;
          issued_to: string;
          vessel_id?: string | null;
          work_order?: string | null;
          quantity: number;
          quantity_returned?: number | null;
          unit?: string;
          status?: Database["public"]["Enums"]["item_status"];
          purpose?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          issued_by?: string | null;
          issued_at?: string | null;
          expected_return_date?: string | null;
        };
        Update: {
          id?: string;
          issue_number?: string;
          pin_id?: string;
          issued_to?: string;
          vessel_id?: string | null;
          work_order?: string | null;
          quantity?: number;
          quantity_returned?: number | null;
          unit?: string;
          status?: Database["public"]["Enums"]["item_status"];
          purpose?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          issued_by?: string | null;
          issued_at?: string | null;
          expected_return_date?: string | null;
          updated_at?: string;
        };
        Relationships: []
      };

      // ------------------------------------------------------------------ //
      // recoveries
      // ------------------------------------------------------------------ //
      recoveries: {
        Row: {
          id: string;
          recovery_ref: string;
          issue_id: string | null;
          pin_id: string | null;
          quantity_returned: number;
          outcome: Database["public"]["Enums"]["recovery_outcome"] | null;
          status: Database["public"]["Enums"]["item_status"];
          condition_grade: string | null;
          condition_notes: string | null;
          assessed_by: string | null;
          assessed_at: string | null;
          disposition_notes: string | null;
          derived_pin_id: string | null;
          recovery_location_id: string | null;
          recovered_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          recovery_ref?: string;
          issue_id?: string | null;
          pin_id?: string | null;
          quantity_returned: number;
          outcome?: Database["public"]["Enums"]["recovery_outcome"] | null;
          status?: Database["public"]["Enums"]["item_status"];
          condition_grade?: string | null;
          condition_notes?: string | null;
          assessed_by?: string | null;
          assessed_at?: string | null;
          disposition_notes?: string | null;
          derived_pin_id?: string | null;
          recovery_location_id?: string | null;
          recovered_at?: string | null;
        };
        Update: {
          id?: string;
          recovery_ref?: string;
          issue_id?: string | null;
          pin_id?: string | null;
          quantity_returned?: number;
          outcome?: Database["public"]["Enums"]["recovery_outcome"] | null;
          status?: Database["public"]["Enums"]["item_status"];
          condition_grade?: string | null;
          condition_notes?: string | null;
          assessed_by?: string | null;
          assessed_at?: string | null;
          disposition_notes?: string | null;
          derived_pin_id?: string | null;
          recovery_location_id?: string | null;
          recovered_at?: string | null;
          updated_at?: string;
        };
        Relationships: []
      };

      // ------------------------------------------------------------------ //
      // chat_sessions
      // ------------------------------------------------------------------ //
      chat_sessions: {
        Row: {
          id: string;
          user_id: string;
          title: string | null;
          context: Json | null;
          message_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string | null;
          context?: Json | null;
          message_count?: number;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string | null;
          context?: Json | null;
          message_count?: number;
          updated_at?: string;
        };
        Relationships: []
      };

      // ------------------------------------------------------------------ //
      // chat_messages
      // ------------------------------------------------------------------ //
      chat_messages: {
        Row: {
          id: string;
          session_id: string;
          role: string;
          content: string;
          tool_name: string | null;
          tool_calls: Json | null;
          tokens_used: number | null;
          latency_ms: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          role: string;
          content: string;
          tool_name?: string | null;
          tool_calls?: Json | null;
          tokens_used?: number | null;
          latency_ms?: number | null;
        };
        Update: {
          id?: string;
          session_id?: string;
          role?: string;
          content?: string;
          tool_name?: string | null;
          tool_calls?: Json | null;
          tokens_used?: number | null;
          latency_ms?: number | null;
        };
        Relationships: []
      };

      // ------------------------------------------------------------------ //
      // embeddings
      // ------------------------------------------------------------------ //
      embeddings: {
        Row: {
          id: string;
          entity_type: string;
          entity_id: string;
          content: string;
          embedding: number[] | null;
          model: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          entity_type: string;
          entity_id: string;
          content: string;
          embedding?: number[] | null;
          model?: string | null;
        };
        Update: {
          id?: string;
          entity_type?: string;
          entity_id?: string;
          content?: string;
          embedding?: number[] | null;
          model?: string | null;
          updated_at?: string;
        };
        Relationships: []
      };

      // ------------------------------------------------------------------ //
      // sop_documents
      // ------------------------------------------------------------------ //
      sop_documents: {
        Row: {
          id: string;
          title: string;
          category: string | null;
          content: string;
          version: string | null;
          effective_date: string | null;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          category?: string | null;
          content: string;
          version?: string | null;
          effective_date?: string | null;
          is_active?: boolean;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          category?: string | null;
          content?: string;
          version?: string | null;
          effective_date?: string | null;
          is_active?: boolean;
          created_by?: string | null;
          updated_at?: string;
        };
        Relationships: []
      };
    };

    // ---------------------------------------------------------------------- //
    // Views
    // ---------------------------------------------------------------------- //
    Views: {
      v_requirement_summary: {
        Row: {
          id: string | null;
          ref_number: string | null;
          title: string | null;
          status: string | null;
          urgency: string | null;
          vessel_name: string | null;
          department_name: string | null;
          requested_by_name: string | null;
          required_date: string | null;
          budget_estimate: number | null;
          currency: string | null;
          item_count: number | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Relationships: []
      };
      v_po_summary: {
        Row: {
          id: string | null;
          po_number: string | null;
          status: string | null;
          vendor_name: string | null;
          vendor_code: string | null;
          requirement_ref: string | null;
          total_amount: number | null;
          tax_amount: number | null;
          discount_amount: number | null;
          currency: string | null;
          expected_delivery: string | null;
          actual_delivery: string | null;
          created_by_name: string | null;
          ordered_by_name: string | null;
          approved_by_name: string | null;
          item_count: number | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Relationships: []
      };
      v_delivery_timeline: {
        Row: {
          delivery_id: string | null;
          delivery_ref: string | null;
          po_number: string | null;
          vendor_name: string | null;
          status: string | null;
          expected_date: string | null;
          actual_received_date: string | null;
          received_by_name: string | null;
          receiving_location: string | null;
          tracking_number: string | null;
          carrier: string | null;
          item_count: number | null;
          created_at: string | null;
        };
        Relationships: []
      };
      v_qc_summary: {
        Row: {
          inspection_id: string | null;
          inspection_ref: string | null;
          delivery_ref: string | null;
          po_number: string | null;
          inspector_name: string | null;
          result: string | null;
          status: string | null;
          inspection_date: string | null;
          defect_count: number | null;
          pass_criteria: string | null;
          remarks: string | null;
          created_at: string | null;
        };
        Relationships: []
      };
      v_stock_balance: {
        Row: {
          pin_id: string | null;
          pin_number: string | null;
          description: string | null;
          part_number: string | null;
          category: string | null;
          unit: string | null;
          location_code: string | null;
          location_name: string | null;
          current_stock: number | null;
          quantity_committed: number | null;
          quantity_available: number | null;
          min_stock_level: number | null;
          max_stock_level: number | null;
          is_low_stock: boolean | null;
          status: string | null;
        };
        Relationships: []
      };
      v_inventory_status: {
        Row: {
          pin_id: string | null;
          pin_number: string | null;
          description: string | null;
          part_number: string | null;
          category: string | null;
          unit: string | null;
          status: string | null;
          is_serialized: boolean | null;
          serial_number: string | null;
          location_code: string | null;
          location_name: string | null;
          origin_type: string | null;
          origin_reference: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Relationships: []
      };
      v_issue_summary: {
        Row: {
          issue_id: string | null;
          issue_number: string | null;
          pin_number: string | null;
          pin_description: string | null;
          issued_to_name: string | null;
          vessel_name: string | null;
          work_order: string | null;
          quantity: number | null;
          quantity_returned: number | null;
          unit: string | null;
          status: string | null;
          purpose: string | null;
          issued_by_name: string | null;
          issued_at: string | null;
          expected_return_date: string | null;
          created_at: string | null;
        };
        Relationships: []
      };
      v_recovery_summary: {
        Row: {
          recovery_id: string | null;
          recovery_ref: string | null;
          issue_number: string | null;
          pin_number: string | null;
          pin_description: string | null;
          quantity_returned: number | null;
          outcome: string | null;
          status: string | null;
          condition_grade: string | null;
          assessed_by_name: string | null;
          assessed_at: string | null;
          derived_pin_number: string | null;
          recovery_location: string | null;
          recovered_at: string | null;
          created_at: string | null;
        };
        Relationships: []
      };
      v_material_genealogy: {
        Row: {
          pin_id: string | null;
          pin_number: string | null;
          description: string | null;
          origin_type: string | null;
          origin_reference: string | null;
          parent_pin_id: string | null;
          parent_pin_number: string | null;
          derived_from_recovery_id: string | null;
          recovery_ref: string | null;
          depth: number | null;
          lineage: string | null;
        };
        Relationships: []
      };
    };

    // ---------------------------------------------------------------------- //
    // Functions
    // ---------------------------------------------------------------------- //
    Functions: {
      fn_stock_availability: {
        Args: { p_pin_id: string };
        Returns: {
          pin_id: string;
          pin_number: string;
          description: string;
          current_stock: number;
          quantity_committed: number;
          quantity_available: number;
          location_code: string | null;
          is_low_stock: boolean;
        }[];
      };
      fn_po_status: {
        Args: { p_po_number: string };
        Returns: Record<string, unknown>[];
      };
      fn_delivery_timeline: {
        Args: { p_po_id: string };
        Returns: Record<string, unknown>[];
      };
      fn_qc_summary: {
        Args: { p_delivery_id: string };
        Returns: Record<string, unknown>[];
      };
      fn_material_location: {
        Args: { p_pin_id: string };
        Returns: Record<string, unknown>[];
      };
      fn_recovery_status: {
        Args: { p_issue_id: string };
        Returns: Record<string, unknown>[];
      };
      fn_genealogy_trace: {
        Args: { p_pin_id: string };
        Returns: {
          pin_id: string;
          pin_number: string;
          description: string;
          origin_type: string | null;
          origin_reference: string | null;
          parent_pin_id: string | null;
          depth: number;
          lineage: string;
        }[];
      };
      fn_search_inventory: {
        Args: { p_query: string };
        Returns: Record<string, unknown>[];
      };
      recalculate_pin_quantity: {
        Args: { p_pin_id: string };
        Returns: number;
      };
      match_embeddings: {
        Args: {
          query_embedding: number[];
          match_threshold: number;
          match_count: number;
        };
        Returns: {
          id: string;
          entity_type: string;
          entity_id: string;
          content: string;
          similarity: number;
        }[];
      };
    };

    // ---------------------------------------------------------------------- //
    // Enums
    // ---------------------------------------------------------------------- //
    Enums: {
      user_role:
        | "super_admin"
        | "admin"
        | "procurement_manager"
        | "procurement_officer"
        | "store_manager"
        | "store_keeper"
        | "qc_inspector"
        | "engineer"
        | "approver"
        | "finance"
        | "shipbuilder"
        | "viewer";

      item_status:
        | "draft"
        | "pending_approval"
        | "approved"
        | "rejected"
        | "in_progress"
        | "ordered"
        | "partially_delivered"
        | "delivered"
        | "received"
        | "qc_pending"
        | "qc_passed"
        | "qc_failed"
        | "qc_conditional"
        | "issued"
        | "partially_returned"
        | "fully_returned"
        | "closed"
        | "cancelled"
        | "on_hold"
        | "pending_assessment"
        | "assessed"
        | "repair_pending"
        | "repaired"
        | "scrapped"
        | "for_sale";

      urgency_level: "routine" | "urgent" | "critical";

      qc_result: "pass" | "fail" | "conditional";

      recovery_outcome: "reuse" | "repair" | "scrap" | "sell";

      transaction_type:
        | "receipt"
        | "issue"
        | "return"
        | "adjustment"
        | "transfer"
        | "write_off"
        | "reversal";

      workflow_event:
        | "submit"
        | "approve"
        | "reject"
        | "revise"
        | "raise_po"
        | "place_order"
        | "receive"
        | "send_to_qc"
        | "start_inspection"
        | "pass_inspection"
        | "fail_inspection"
        | "conditional_inspection"
        | "accept_into_inventory"
        | "initiate_return"
        | "issue_material"
        | "partial_return"
        | "full_return"
        | "close"
        | "cancel"
        | "assess"
        | "mark_reuse"
        | "send_for_repair"
        | "mark_repaired"
        | "scrap_material"
        | "list_for_sale"
        | "hold"
        | "resume";
    };
  };
}

// Convenience aliases for table row types
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Vessel = Database["public"]["Tables"]["vessels"]["Row"];
export type Department = Database["public"]["Tables"]["departments"]["Row"];
export type SeqCounter = Database["public"]["Tables"]["seq_counters"]["Row"];
export type WorkflowHistory = Database["public"]["Tables"]["workflow_history"]["Row"];
export type Notification = Database["public"]["Tables"]["notifications"]["Row"];
export type AuditLog = Database["public"]["Tables"]["audit_log"]["Row"];
export type Requirement = Database["public"]["Tables"]["requirements"]["Row"];
export type RequirementItem = Database["public"]["Tables"]["requirement_items"]["Row"];
export type Vendor = Database["public"]["Tables"]["vendors"]["Row"];
export type VendorContact = Database["public"]["Tables"]["vendor_contacts"]["Row"];
export type Approval = Database["public"]["Tables"]["approvals"]["Row"];
export type PurchaseOrder = Database["public"]["Tables"]["purchase_orders"]["Row"];
export type PoItem = Database["public"]["Tables"]["po_items"]["Row"];
export type Payment = Database["public"]["Tables"]["payments"]["Row"];
export type Delivery = Database["public"]["Tables"]["deliveries"]["Row"];
export type DeliveryItem = Database["public"]["Tables"]["delivery_items"]["Row"];
export type StoreLocation = Database["public"]["Tables"]["store_locations"]["Row"];
export type QcInspection = Database["public"]["Tables"]["qc_inspections"]["Row"];
export type QcDefect = Database["public"]["Tables"]["qc_defects"]["Row"];
export type InventoryPin = Database["public"]["Tables"]["inventory_pins"]["Row"];
export type InventoryTransaction = Database["public"]["Tables"]["inventory_transactions"]["Row"];
export type MaterialIssue = Database["public"]["Tables"]["material_issues"]["Row"];
export type Recovery = Database["public"]["Tables"]["recoveries"]["Row"];
export type ChatSession = Database["public"]["Tables"]["chat_sessions"]["Row"];
export type ChatMessage = Database["public"]["Tables"]["chat_messages"]["Row"];
export type Embedding = Database["public"]["Tables"]["embeddings"]["Row"];
export type SopDocument = Database["public"]["Tables"]["sop_documents"]["Row"];

// Convenience aliases for enum types
export type UserRole = Database["public"]["Enums"]["user_role"];
export type ItemStatus = Database["public"]["Enums"]["item_status"];
export type UrgencyLevel = Database["public"]["Enums"]["urgency_level"];
export type QcResult = Database["public"]["Enums"]["qc_result"];
export type RecoveryOutcome = Database["public"]["Enums"]["recovery_outcome"];
export type TransactionType = Database["public"]["Enums"]["transaction_type"];
export type WorkflowEvent = Database["public"]["Enums"]["workflow_event"];
