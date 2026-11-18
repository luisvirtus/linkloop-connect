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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      addon_subscriptions: {
        Row: {
          addon: string
          company_id: string
          created_at: string
          cycle: string
          expires_at: string | null
          id: string
          quantity: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          addon: string
          company_id: string
          created_at?: string
          cycle?: string
          expires_at?: string | null
          id?: string
          quantity?: number
          unit_price?: number
          updated_at?: string
        }
        Update: {
          addon?: string
          company_id?: string
          created_at?: string
          cycle?: string
          expires_at?: string | null
          id?: string
          quantity?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "addon_subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
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
          payment_reference: string | null
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
          payment_reference?: string | null
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
          payment_reference?: string | null
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
          contact: Json
          created_at: string
          deleted_at: string | null
          id: string
          logo_url: string | null
          name: string
          owner_id: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          contact?: Json
          created_at?: string
          deleted_at?: string | null
          id?: string
          logo_url?: string | null
          name: string
          owner_id: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          contact?: Json
          created_at?: string
          deleted_at?: string | null
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
          menu: Json
          menu_enabled: boolean
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
          menu?: Json
          menu_enabled?: boolean
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
          menu?: Json
          menu_enabled?: boolean
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
          addon_cycle: string | null
          addon_id: string | null
          addon_quantity: number | null
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
          addon_cycle?: string | null
          addon_id?: string | null
          addon_quantity?: number | null
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
          addon_cycle?: string | null
          addon_id?: string | null
          addon_quantity?: number | null
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
            foreignKeyName: "payments_addon_id_fkey"
            columns: ["addon_id"]
            isOneToOne: false
            referencedRelation: "addon_subscriptions"
            referencedColumns: ["id"]
          },
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
          annual_consent_amount: number | null
          annual_consent_at: string | null
          annual_consent_version: string | null
          batch_id: string | null
          blocked_by_admin: boolean
          blocked_by_client: boolean
          company_id: string | null
          cost: number
          generated_at: string
          id: string
          label: string | null
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
          annual_consent_amount?: number | null
          annual_consent_at?: string | null
          annual_consent_version?: string | null
          batch_id?: string | null
          blocked_by_admin?: boolean
          blocked_by_client?: boolean
          company_id?: string | null
          cost?: number
          generated_at?: string
          id?: string
          label?: string | null
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
          annual_consent_amount?: number | null
          annual_consent_at?: string | null
          annual_consent_version?: string | null
          batch_id?: string | null
          blocked_by_admin?: boolean
          blocked_by_client?: boolean
          company_id?: string | null
          cost?: number
          generated_at?: string
          id?: string
          label?: string | null
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
          contact: Json
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
          contact?: Json
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
          contact?: Json
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
          menu_annual_price: number
          menu_monthly_price: number
          plate_cost: number
          plate_price: number
          subscription_price: number
          updated_at: string
          waiter_annual_price: number
          waiter_monthly_price: number
        }
        Insert: {
          commission_renewal_percent?: number
          commission_sale_percent?: number
          id?: boolean
          menu_annual_price?: number
          menu_monthly_price?: number
          plate_cost?: number
          plate_price?: number
          subscription_price?: number
          updated_at?: string
          waiter_annual_price?: number
          waiter_monthly_price?: number
        }
        Update: {
          commission_renewal_percent?: number
          commission_sale_percent?: number
          id?: boolean
          menu_annual_price?: number
          menu_monthly_price?: number
          plate_cost?: number
          plate_price?: number
          subscription_price?: number
          updated_at?: string
          waiter_annual_price?: number
          waiter_monthly_price?: number
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
      table_requests: {
        Row: {
          actor: string | null
          chat_id: string
          created_at: string
          id: string
          items: Json
          kind: string
          message_id: number | null
          session_id: string
          status: string
          subtotal: number
        }
        Insert: {
          actor?: string | null
          chat_id: string
          created_at?: string
          id: string
          items?: Json
          kind: string
          message_id?: number | null
          session_id: string
          status?: string
          subtotal?: number
        }
        Update: {
          actor?: string | null
          chat_id?: string
          created_at?: string
          id?: string
          items?: Json
          kind?: string
          message_id?: number | null
          session_id?: string
          status?: string
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "table_requests_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "table_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      table_sessions: {
        Row: {
          closed_at: string | null
          company_id: string
          expires_at: string
          id: string
          plate_id: string
          started_at: string
        }
        Insert: {
          closed_at?: string | null
          company_id: string
          expires_at?: string
          id?: string
          plate_id: string
          started_at?: string
        }
        Update: {
          closed_at?: string | null
          company_id?: string
          expires_at?: string
          id?: string
          plate_id?: string
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "table_sessions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_sessions_plate_id_fkey"
            columns: ["plate_id"]
            isOneToOne: false
            referencedRelation: "plates"
            referencedColumns: ["id"]
          },
        ]
      }
      table_visitors: {
        Row: {
          session_id: string
          token: string
        }
        Insert: {
          session_id: string
          token?: string
        }
        Update: {
          session_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "table_visitors_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "table_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_pairings: {
        Row: {
          chat_id: string
          code_hash: string
          company_id: string
          expires_at: string
          user_id: string
        }
        Insert: {
          chat_id: string
          code_hash: string
          company_id: string
          expires_at: string
          user_id: string
        }
        Update: {
          chat_id?: string
          code_hash?: string
          company_id?: string
          expires_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "telegram_pairings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_service_settings: {
        Row: {
          chat_id: string
          company_id: string
          waiter_enabled: boolean
        }
        Insert: {
          chat_id: string
          company_id: string
          waiter_enabled?: boolean
        }
        Update: {
          chat_id?: string
          company_id?: string
          waiter_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "telegram_service_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
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
      activate_plate: {
        Args: { _code: string; _company_name: string; _review_url?: string }
        Returns: Json
      }
      activate_registered_plate: {
        Args: {
          _accepted: boolean
          _annual_price: number
          _code: string
          _company_name: string
          _contact: Json
          _review_url: string
        }
        Returns: Json
      }
      company_addons: { Args: { _company_id: string }; Returns: Json }
      confirm_admin_payment: {
        Args: { _payment_id: string; _user_id: string }
        Returns: Json
      }
      confirm_commission_payment: {
        Args: { _id: string; _reference: string }
        Returns: Json
      }
      create_table_request: {
        Args: {
          _code: string
          _id: string
          _items: Json
          _kind: string
          _token: string
        }
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
      open_table_session: {
        Args: { _code: string; _token?: string }
        Returns: Json
      }
      owns_company: { Args: { _company_id: string }; Returns: boolean }
      public_company_by_code: {
        Args: { _code: string }
        Returns: {
          logo_url: string
          name: string
          website_url: string
        }[]
      }
      public_plate_state: { Args: { _code: string }; Returns: Json }
      public_service_flags: { Args: { _code: string }; Returns: Json }
      remove_company: { Args: { _company_id: string }; Returns: Json }
      request_addon: {
        Args: { _addon: string; _company_id: string; _cycle: string }
        Returns: Json
      }
      seller_company_names: {
        Args: never
        Returns: {
          id: string
          name: string
        }[]
      }
      telegram_table_action: {
        Args: {
          _action: string
          _actor: string
          _chat: string
          _id: string
          _message: number
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "seller" | "client"
      commission_kind: "sale" | "renewal"
      commission_status: "pending" | "paid" | "cancelled"
      payment_kind: "plate" | "subscription" | "renewal" | "addon"
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
      payment_kind: ["plate", "subscription", "renewal", "addon"],
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
