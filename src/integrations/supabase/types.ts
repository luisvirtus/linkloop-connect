export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity: string | null
          entity_id: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity?: string | null
          entity_id?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity?: string | null
          entity_id?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      batches: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          label: string
          notes: string | null
          quantity: number
          size: Database["public"]["Enums"]["plate_size"]
          unit_cost: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          label: string
          notes?: string | null
          quantity: number
          size?: Database["public"]["Enums"]["plate_size"]
          unit_cost?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string
          notes?: string | null
          quantity?: number
          size?: Database["public"]["Enums"]["plate_size"]
          unit_cost?: number
        }
        Relationships: []
      }
      commissions: {
        Row: {
          amount: number
          base_amount: number
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["commission_kind"]
          paid_at: string | null
          payment_id: string | null
          percent: number
          sale_id: string | null
          seller_id: string
          status: Database["public"]["Enums"]["commission_status"]
          subscription_id: string | null
        }
        Insert: {
          amount?: number
          base_amount?: number
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["commission_kind"]
          paid_at?: string | null
          payment_id?: string | null
          percent?: number
          sale_id?: string | null
          seller_id: string
          status?: Database["public"]["Enums"]["commission_status"]
          subscription_id?: string | null
        }
        Update: {
          amount?: number
          base_amount?: number
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["commission_kind"]
          paid_at?: string | null
          payment_id?: string | null
          percent?: number
          sale_id?: string | null
          seller_id?: string
          status?: Database["public"]["Enums"]["commission_status"]
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commissions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          owner_id: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          owner_id: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      page_links: {
        Row: {
          active: boolean
          created_at: string
          id: string
          kind: string
          label: string
          page_id: string
          position: number
          updated_at: string
          url: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          kind?: string
          label: string
          page_id: string
          position?: number
          updated_at?: string
          url: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          kind?: string
          label?: string
          page_id?: string
          position?: number
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_links_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      pages: {
        Row: {
          company_id: string
          created_at: string
          google_review_url: string | null
          id: string
          logo_url: string | null
          plate_id: string
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          google_review_url?: string | null
          id?: string
          logo_url?: string | null
          plate_id: string
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          google_review_url?: string | null
          id?: string
          logo_url?: string | null
          plate_id?: string
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pages_plate_id_fkey"
            columns: ["plate_id"]
            isOneToOne: true
            referencedRelation: "plates"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          company_id: string | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["payment_kind"]
          paid_at: string | null
          sale_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          stripe_reference: string | null
          subscription_id: string | null
        }
        Insert: {
          amount?: number
          company_id?: string | null
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["payment_kind"]
          paid_at?: string | null
          sale_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_reference?: string | null
          subscription_id?: string | null
        }
        Update: {
          amount?: number
          company_id?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["payment_kind"]
          paid_at?: string | null
          sale_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_reference?: string | null
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      plates: {
        Row: {
          batch_id: string | null
          blocked_by_admin: boolean
          blocked_by_client: boolean
          company_id: string | null
          cost: number
          generated_at: string
          id: string
          linked_at: string | null
          notes: string | null
          price: number | null
          qr_code: string
          seller_id: string | null
          serial: number
          size: Database["public"]["Enums"]["plate_size"]
          sold_at: string | null
          status: Database["public"]["Enums"]["plate_status"]
          updated_at: string
        }
        Insert: {
          batch_id?: string | null
          blocked_by_admin?: boolean
          blocked_by_client?: boolean
          company_id?: string | null
          cost?: number
          generated_at?: string
          id?: string
          linked_at?: string | null
          notes?: string | null
          price?: number | null
          qr_code: string
          seller_id?: string | null
          serial?: number
          size?: Database["public"]["Enums"]["plate_size"]
          sold_at?: string | null
          status?: Database["public"]["Enums"]["plate_status"]
          updated_at?: string
        }
        Update: {
          batch_id?: string | null
          blocked_by_admin?: boolean
          blocked_by_client?: boolean
          company_id?: string | null
          cost?: number
          generated_at?: string
          id?: string
          linked_at?: string | null
          notes?: string | null
          price?: number | null
          qr_code?: string
          seller_id?: string | null
          serial?: number
          size?: Database["public"]["Enums"]["plate_size"]
          sold_at?: string | null
          status?: Database["public"]["Enums"]["plate_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plates_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plates_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      sales: {
        Row: {
          amount: number
          company_id: string
          cost: number
          created_at: string
          id: string
          payment_method: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          plate_id: string
          seller_id: string | null
          sold_at: string
        }
        Insert: {
          amount?: number
          company_id: string
          cost?: number
          created_at?: string
          id?: string
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          plate_id: string
          seller_id?: string | null
          sold_at?: string
        }
        Update: {
          amount?: number
          company_id?: string
          cost?: number
          created_at?: string
          id?: string
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          plate_id?: string
          seller_id?: string | null
          sold_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_plate_id_fkey"
            columns: ["plate_id"]
            isOneToOne: true
            referencedRelation: "plates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      sellers: {
        Row: {
          active: boolean
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      settings: {
        Row: {
          commission_renewal_percent: number
          commission_sale_percent: number
          id: boolean
          plate_cost: number
          plate_price: number
          subscription_price: number
          updated_at: string
        }
        Insert: {
          commission_renewal_percent?: number
          commission_sale_percent?: number
          id?: boolean
          plate_cost?: number
          plate_price?: number
          subscription_price?: number
          updated_at?: string
        }
        Update: {
          commission_renewal_percent?: number
          commission_sale_percent?: number
          id?: boolean
          plate_cost?: number
          plate_price?: number
          subscription_price?: number
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          expires_at: string
          id: string
          plate_id: string | null
          seller_id: string | null
          starts_at: string
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_reference: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          company_id: string
          created_at?: string
          expires_at: string
          id?: string
          plate_id?: string | null
          seller_id?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_reference?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          plate_id?: string | null
          seller_id?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_reference?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plate_id_fkey"
            columns: ["plate_id"]
            isOneToOne: false
            referencedRelation: "plates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      confirm_admin_payment: {
        Args: { _payment_id: string; _user_id: string }
        Returns: Json
      }
      current_seller_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_company_subscription_active: {
        Args: { _company_id: string }
        Returns: boolean
      }
      owns_company: { Args: { _company_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "seller" | "client"
      commission_kind: "sale" | "renewal"
      commission_status: "pending" | "paid" | "cancelled"
      payment_kind: "plate" | "subscription" | "renewal"
      payment_status: "pending" | "paid" | "failed" | "refunded"
      plate_size: "small" | "medium" | "large"
      plate_status:
        | "available"
        | "reserved"
        | "sold"
        | "linked"
        | "donated"
        | "lost"
        | "blocked"
        | "cancelled"
      subscription_status: "active" | "expired" | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "seller", "client"],
      commission_kind: ["sale", "renewal"],
      commission_status: ["pending", "paid", "cancelled"],
      payment_kind: ["plate", "subscription", "renewal"],
      payment_status: ["pending", "paid", "failed", "refunded"],
      plate_size: ["small", "medium", "large"],
      plate_status: [
        "available",
        "reserved",
        "sold",
        "linked",
        "donated",
        "lost",
        "blocked",
        "cancelled",
      ],
      subscription_status: ["active", "expired", "cancelled"],
    },
  },
} as const
