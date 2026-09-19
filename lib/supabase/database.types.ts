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
          actor_user_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: number
          metadata: Json
          store_id: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: never
          metadata?: Json
          store_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: never
          metadata?: Json
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_domains: {
        Row: {
          created_at: string
          hostname: string
          id: string
          status: string
          store_id: string
          updated_at: string
          verification_method: string
          verification_token_hash: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          hostname: string
          id?: string
          status?: string
          store_id: string
          updated_at?: string
          verification_method?: string
          verification_token_hash: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          hostname?: string
          id?: string
          status?: string
          store_id?: string
          updated_at?: string
          verification_method?: string
          verification_token_hash?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_domains_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_addresses: {
        Row: {
          city: string
          country_code: string
          created_at: string
          customer_id: string
          id: string
          is_default: boolean
          label: string
          line1: string
          line2: string
          phone: string
          postal_code: string
          recipient_name: string
          state: string
          store_id: string
          updated_at: string
        }
        Insert: {
          city?: string
          country_code?: string
          created_at?: string
          customer_id: string
          id?: string
          is_default?: boolean
          label?: string
          line1?: string
          line2?: string
          phone?: string
          postal_code?: string
          recipient_name?: string
          state?: string
          store_id: string
          updated_at?: string
        }
        Update: {
          city?: string
          country_code?: string
          created_at?: string
          customer_id?: string
          id?: string
          is_default?: boolean
          label?: string
          line1?: string
          line2?: string
          phone?: string
          postal_code?: string
          recipient_name?: string
          state?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_addresses_customer_store_fk"
            columns: ["store_id", "customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["store_id", "id"]
          },
          {
            foreignKeyName: "customer_addresses_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          auth_user_id: string | null
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          phone: string
          store_id: string
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          email: string
          first_name?: string
          id?: string
          last_name?: string
          phone?: string
          store_id: string
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          phone?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      order_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          order_id: string
          payload: Json
          store_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          order_id: string
          payload?: Json
          store_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          order_id?: string
          payload?: Json
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_store_fk"
            columns: ["store_id", "order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["store_id", "id"]
          },
          {
            foreignKeyName: "order_events_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          discount_total: number
          id: string
          line_total: number
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          sku: string | null
          store_id: string
          tax_total: number
          unit_price: number
          updated_at: string
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          discount_total?: number
          id?: string
          line_total: number
          order_id: string
          product_id?: string | null
          product_name: string
          quantity: number
          sku?: string | null
          store_id: string
          tax_total?: number
          unit_price: number
          updated_at?: string
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          discount_total?: number
          id?: string
          line_total?: number
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          sku?: string | null
          store_id?: string
          tax_total?: number
          unit_price?: number
          updated_at?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_store_fk"
            columns: ["store_id", "order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["store_id", "id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          billing_address: Json
          checkout_id: string | null
          confirmation_token: string | null
          created_at: string
          currency: string
          customer_email: string
          customer_id: string | null
          customer_phone: string
          discount_total: number
          grand_total: number
          id: string
          notes: string
          order_number: string
          payment_provider: string | null
          payment_reference: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          shipping_address: Json
          shipping_total: number
          status: Database["public"]["Enums"]["order_status"]
          store_id: string
          subtotal: number
          tax_total: number
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          billing_address?: Json
          checkout_id?: string | null
          confirmation_token?: string | null
          created_at?: string
          currency: string
          customer_email: string
          customer_id?: string | null
          customer_phone?: string
          discount_total?: number
          grand_total?: number
          id?: string
          notes?: string
          order_number: string
          payment_provider?: string | null
          payment_reference?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          shipping_address?: Json
          shipping_total?: number
          status?: Database["public"]["Enums"]["order_status"]
          store_id: string
          subtotal?: number
          tax_total?: number
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          billing_address?: Json
          checkout_id?: string | null
          confirmation_token?: string | null
          created_at?: string
          currency?: string
          customer_email?: string
          customer_id?: string | null
          customer_phone?: string
          discount_total?: number
          grand_total?: number
          id?: string
          notes?: string
          order_number?: string
          payment_provider?: string | null
          payment_reference?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          shipping_address?: Json
          shipping_total?: number
          status?: Database["public"]["Enums"]["order_status"]
          store_id?: string
          subtotal?: number
          tax_total?: number
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_store_fk"
            columns: ["store_id", "customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["store_id", "id"]
          },
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_feature_flags: {
        Row: {
          config: Json
          enabled: boolean
          key: string
          updated_at: string
        }
        Insert: {
          config?: Json
          enabled?: boolean
          key: string
          updated_at?: string
        }
        Update: {
          config?: Json
          enabled?: boolean
          key?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_images: {
        Row: {
          alt_text: string
          created_at: string
          height: number | null
          id: string
          is_primary: boolean
          product_id: string
          public_url: string | null
          sort_order: number
          storage_path: string | null
          store_id: string
          updated_at: string
          width: number | null
        }
        Insert: {
          alt_text?: string
          created_at?: string
          height?: number | null
          id?: string
          is_primary?: boolean
          product_id: string
          public_url?: string | null
          sort_order?: number
          storage_path?: string | null
          store_id: string
          updated_at?: string
          width?: number | null
        }
        Update: {
          alt_text?: string
          created_at?: string
          height?: number | null
          id?: string
          is_primary?: boolean
          product_id?: string
          public_url?: string | null
          sort_order?: number
          storage_path?: string | null
          store_id?: string
          updated_at?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_store_fk"
            columns: ["store_id", "product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["store_id", "id"]
          },
          {
            foreignKeyName: "product_images_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          barcode: string | null
          compare_at_price: number | null
          created_at: string
          id: string
          image_url: string | null
          option_values: Json
          price: number
          product_id: string
          sku: string | null
          sort_order: number
          stock: number
          store_id: string
          title: string
          updated_at: string
          weight_grams: number | null
        }
        Insert: {
          barcode?: string | null
          compare_at_price?: number | null
          created_at?: string
          id?: string
          image_url?: string | null
          option_values?: Json
          price: number
          product_id: string
          sku?: string | null
          sort_order?: number
          stock?: number
          store_id: string
          title: string
          updated_at?: string
          weight_grams?: number | null
        }
        Update: {
          barcode?: string | null
          compare_at_price?: number | null
          created_at?: string
          id?: string
          image_url?: string | null
          option_values?: Json
          price?: number
          product_id?: string
          sku?: string | null
          sort_order?: number
          stock?: number
          store_id?: string
          title?: string
          updated_at?: string
          weight_grams?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_store_fk"
            columns: ["store_id", "product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["store_id", "id"]
          },
          {
            foreignKeyName: "product_variants_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand: string | null
          category: string | null
          compare_at_price: number | null
          created_at: string
          currency: string
          description: string | null
          featured: boolean
          id: string
          name: string
          price: number
          primary_image_url: string | null
          seo_description: string | null
          seo_title: string | null
          sku: string | null
          slug: string
          status: Database["public"]["Enums"]["product_status"]
          stock: number
          store_id: string
          updated_at: string
        }
        Insert: {
          brand?: string | null
          category?: string | null
          compare_at_price?: number | null
          created_at?: string
          currency?: string
          description?: string | null
          featured?: boolean
          id?: string
          name: string
          price: number
          primary_image_url?: string | null
          seo_description?: string | null
          seo_title?: string | null
          sku?: string | null
          slug: string
          status?: Database["public"]["Enums"]["product_status"]
          stock?: number
          store_id: string
          updated_at?: string
        }
        Update: {
          brand?: string | null
          category?: string | null
          compare_at_price?: number | null
          created_at?: string
          currency?: string
          description?: string | null
          featured?: boolean
          id?: string
          name?: string
          price?: number
          primary_image_url?: string | null
          seo_description?: string | null
          seo_title?: string | null
          sku?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["product_status"]
          stock?: number
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          default_currency: string
          display_name: string | null
          id: string
          locale: string
          platform_role: Database["public"]["Enums"]["platform_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_currency?: string
          display_name?: string | null
          id: string
          locale?: string
          platform_role?: Database["public"]["Enums"]["platform_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_currency?: string
          display_name?: string | null
          id?: string
          locale?: string
          platform_role?: Database["public"]["Enums"]["platform_role"]
          updated_at?: string
        }
        Relationships: []
      }
      store_feature_flags: {
        Row: {
          config: Json
          enabled: boolean | null
          key: string
          store_id: string
          updated_at: string
        }
        Insert: {
          config?: Json
          enabled?: boolean | null
          key: string
          store_id: string
          updated_at?: string
        }
        Update: {
          config?: Json
          enabled?: boolean | null
          key?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_feature_flags_key_fkey"
            columns: ["key"]
            isOneToOne: false
            referencedRelation: "platform_feature_flags"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "store_feature_flags_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_members: {
        Row: {
          created_at: string
          role: Database["public"]["Enums"]["store_member_role"]
          store_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role?: Database["public"]["Enums"]["store_member_role"]
          store_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: Database["public"]["Enums"]["store_member_role"]
          store_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_members_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_owners: {
        Row: {
          created_at: string
          owner_id: string
          store_id: string
        }
        Insert: {
          created_at?: string
          owner_id: string
          store_id: string
        }
        Update: {
          created_at?: string
          owner_id?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_owners_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_payment_methods: {
        Row: {
          code: string
          created_at: string
          display_name: string
          enabled: boolean
          id: string
          provider: string
          public_config: Json
          secret_key_ref: string | null
          sort_order: number
          store_id: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          display_name: string
          enabled?: boolean
          id?: string
          provider: string
          public_config?: Json
          secret_key_ref?: string | null
          sort_order?: number
          store_id: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          display_name?: string
          enabled?: boolean
          id?: string
          provider?: string
          public_config?: Json
          secret_key_ref?: string | null
          sort_order?: number
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_payment_methods_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_public_settings: {
        Row: {
          announcement: string
          homepage: Json
          seo: Json
          store_id: string
          theme: Json
          updated_at: string
        }
        Insert: {
          announcement?: string
          homepage?: Json
          seo?: Json
          store_id: string
          theme?: Json
          updated_at?: string
        }
        Update: {
          announcement?: string
          homepage?: Json
          seo?: Json
          store_id?: string
          theme?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_public_settings_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_settings: {
        Row: {
          checkout: Json
          integrations: Json
          notifications: Json
          seo: Json
          store_id: string
          theme: Json
          updated_at: string
        }
        Insert: {
          checkout?: Json
          integrations?: Json
          notifications?: Json
          seo?: Json
          store_id: string
          theme?: Json
          updated_at?: string
        }
        Update: {
          checkout?: Json
          integrations?: Json
          notifications?: Json
          seo?: Json
          store_id?: string
          theme?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_settings_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_shipping_methods: {
        Row: {
          code: string
          countries: Json
          created_at: string
          currency: string
          display_name: string
          enabled: boolean
          id: string
          price: number
          provider: string
          sort_order: number
          store_id: string
          updated_at: string
        }
        Insert: {
          code: string
          countries?: Json
          created_at?: string
          currency: string
          display_name: string
          enabled?: boolean
          id?: string
          price?: number
          provider?: string
          sort_order?: number
          store_id: string
          updated_at?: string
        }
        Update: {
          code?: string
          countries?: Json
          created_at?: string
          currency?: string
          display_name?: string
          enabled?: boolean
          id?: string
          price?: number
          provider?: string
          sort_order?: number
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_shipping_methods_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_tax_rules: {
        Row: {
          country_code: string
          created_at: string
          enabled: boolean
          id: string
          rate: number
          store_id: string
          tax_inclusive: boolean
          updated_at: string
        }
        Insert: {
          country_code: string
          created_at?: string
          enabled?: boolean
          id?: string
          rate?: number
          store_id: string
          tax_inclusive?: boolean
          updated_at?: string
        }
        Update: {
          country_code?: string
          created_at?: string
          enabled?: boolean
          id?: string
          rate?: number
          store_id?: string
          tax_inclusive?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_tax_rules_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          country_code: string
          cover_image_url: string | null
          created_at: string
          default_currency: string
          description: string
          id: string
          locale: string
          logo_url: string | null
          name: string
          slug: string
          status: Database["public"]["Enums"]["store_status"]
          timezone: string
          updated_at: string
        }
        Insert: {
          country_code?: string
          cover_image_url?: string | null
          created_at?: string
          default_currency?: string
          description?: string
          id?: string
          locale?: string
          logo_url?: string | null
          name: string
          slug: string
          status?: Database["public"]["Enums"]["store_status"]
          timezone?: string
          updated_at?: string
        }
        Update: {
          country_code?: string
          cover_image_url?: string | null
          created_at?: string
          default_currency?: string
          description?: string
          id?: string
          locale?: string
          logo_url?: string | null
          name?: string
          slug?: string
          status?: Database["public"]["Enums"]["store_status"]
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_guest_order: {
        Args: {
          p_billing_address?: Json
          p_customer: Json
          p_idempotency_key: string
          p_items: Json
          p_shipping_address: Json
          p_store_slug: string
        }
        Returns: Json
      }
      get_guest_order: { Args: { p_confirmation_token: string }; Returns: Json }
    }
    Enums: {
      order_status:
        | "pending"
        | "confirmed"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "returned"
        | "refunded"
      payment_status:
        | "unpaid"
        | "pending"
        | "paid"
        | "failed"
        | "partially_refunded"
        | "refunded"
      platform_role: "user" | "admin" | "support"
      product_status: "draft" | "active" | "archived"
      store_member_role: "owner" | "admin" | "staff"
      store_status: "draft" | "active" | "paused"
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
      order_status: [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "returned",
        "refunded",
      ],
      payment_status: [
        "unpaid",
        "pending",
        "paid",
        "failed",
        "partially_refunded",
        "refunded",
      ],
      platform_role: ["user", "admin", "support"],
      product_status: ["draft", "active", "archived"],
      store_member_role: ["owner", "admin", "staff"],
      store_status: ["draft", "active", "paused"],
    },
  },
} as const

