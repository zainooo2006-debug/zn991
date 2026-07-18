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
      ai_knowledge_base: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          title: string | null
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          title?: string | null
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      branches: {
        Row: {
          address: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          phone: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      cars: {
        Row: {
          brand_id: string | null
          color: string | null
          created_at: string
          customer_id: string
          id: string
          model: string | null
          notes: string | null
          plate_number: string | null
          updated_at: string
          vin: string | null
          year: number | null
        }
        Insert: {
          brand_id?: string | null
          color?: string | null
          created_at?: string
          customer_id: string
          id?: string
          model?: string | null
          notes?: string | null
          plate_number?: string | null
          updated_at?: string
          vin?: string | null
          year?: number | null
        }
        Update: {
          brand_id?: string | null
          color?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          model?: string | null
          notes?: string | null
          plate_number?: string | null
          updated_at?: string
          vin?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cars_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "warranty_brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cars_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      customer_reviews: {
        Row: {
          city: string | null
          comment: string
          created_at: string
          customer_name: string
          id: string
          images: string[]
          is_approved: boolean
          is_featured: boolean
          rating: number
          updated_at: string
        }
        Insert: {
          city?: string | null
          comment: string
          created_at?: string
          customer_name: string
          id?: string
          images?: string[]
          is_approved?: boolean
          is_featured?: boolean
          rating: number
          updated_at?: string
        }
        Update: {
          city?: string | null
          comment?: string
          created_at?: string
          customer_name?: string
          id?: string
          images?: string[]
          is_approved?: boolean
          is_featured?: boolean
          rating?: number
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          notes: string | null
          phone: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          phone: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      film_types: {
        Row: {
          brand_id: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
          warranty_months: number
        }
        Insert: {
          brand_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
          warranty_months?: number
        }
        Update: {
          brand_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
          warranty_months?: number
        }
        Relationships: [
          {
            foreignKeyName: "film_types_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "warranty_brands"
            referencedColumns: ["id"]
          },
        ]
      }
      hero_slides: {
        Row: {
          alt_text: string | null
          created_at: string
          id: string
          image_url: string
          is_active: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          id?: string
          image_url: string
          is_active?: boolean
          sort_order?: number
          updated_at?: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          id?: string
          image_url?: string
          is_active?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      installation_centers: {
        Row: {
          address: string | null
          city: string
          created_at: string
          google_maps_url: string | null
          id: string
          images: string[] | null
          is_active: boolean
          is_approved: boolean
          logo_url: string | null
          name: string
          phone: string | null
          services: string[]
          sort_order: number
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          city: string
          created_at?: string
          google_maps_url?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean
          is_approved?: boolean
          logo_url?: string | null
          name: string
          phone?: string | null
          services?: string[]
          sort_order?: number
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          city?: string
          created_at?: string
          google_maps_url?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean
          is_approved?: boolean
          logo_url?: string | null
          name?: string
          phone?: string | null
          services?: string[]
          sort_order?: number
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          address: string | null
          created_at: string
          customer_name: string
          id: string
          items: Json
          notes: string | null
          payment_ref: string | null
          phone: string
          status: string
          subtotal: number
          total: number
          wallet_id: string | null
          wallet_name: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          customer_name: string
          id?: string
          items?: Json
          notes?: string | null
          payment_ref?: string | null
          phone: string
          status?: string
          subtotal?: number
          total?: number
          wallet_id?: string | null
          wallet_name?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          customer_name?: string
          id?: string
          items?: Json
          notes?: string | null
          payment_ref?: string | null
          phone?: string
          status?: string
          subtotal?: number
          total?: number
          wallet_id?: string | null
          wallet_name?: string | null
        }
        Relationships: []
      }
      packages: {
        Row: {
          badge: string | null
          created_at: string
          description: string | null
          features: string[]
          id: string
          name: string
          old_price: string | null
          price: string
          slug: string
          sort_order: number
        }
        Insert: {
          badge?: string | null
          created_at?: string
          description?: string | null
          features?: string[]
          id?: string
          name: string
          old_price?: string | null
          price: string
          slug: string
          sort_order?: number
        }
        Update: {
          badge?: string | null
          created_at?: string
          description?: string | null
          features?: string[]
          id?: string
          name?: string
          old_price?: string | null
          price?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      product_reviews: {
        Row: {
          comment: string | null
          created_at: string
          customer_name: string
          id: string
          product_id: string
          rating: number
        }
        Insert: {
          comment?: string | null
          created_at?: string
          customer_name: string
          id?: string
          product_id: string
          rating: number
        }
        Update: {
          comment?: string | null
          created_at?: string
          customer_name?: string
          id?: string
          product_id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          images: string[]
          in_stock: boolean
          is_bestseller: boolean
          is_featured: boolean
          name: string
          old_price: number | null
          price: number
          rating: number
          video_url: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          images?: string[]
          in_stock?: boolean
          is_bestseller?: boolean
          is_featured?: boolean
          name: string
          old_price?: number | null
          price?: number
          rating?: number
          video_url?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          images?: string[]
          in_stock?: boolean
          is_bestseller?: boolean
          is_featured?: boolean
          name?: string
          old_price?: number | null
          price?: number
          rating?: number
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      service_categories: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          long_desc: string | null
          name: string
          short_desc: string | null
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          long_desc?: string | null
          name: string
          short_desc?: string | null
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          long_desc?: string | null
          name?: string
          short_desc?: string | null
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      site_content: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          active_theme_json: Json
          created_at: string
          default_theme_json: Json
          id: string
          updated_at: string
        }
        Insert: {
          active_theme_json?: Json
          created_at?: string
          default_theme_json?: Json
          id?: string
          updated_at?: string
        }
        Update: {
          active_theme_json?: Json
          created_at?: string
          default_theme_json?: Json
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          branch_id: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          account_number: string
          created_at: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          account_number: string
          created_at?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          account_number?: string
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      warranties: {
        Row: {
          activation_date: string
          branch_id: string | null
          brand_id: string | null
          car_id: string | null
          created_at: string
          customer_id: string
          employee_id: string | null
          expiry_date: string
          film_type_id: string | null
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["warranty_status"]
          updated_at: string
          vin: string | null
          warranty_number: string
        }
        Insert: {
          activation_date?: string
          branch_id?: string | null
          brand_id?: string | null
          car_id?: string | null
          created_at?: string
          customer_id: string
          employee_id?: string | null
          expiry_date: string
          film_type_id?: string | null
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["warranty_status"]
          updated_at?: string
          vin?: string | null
          warranty_number: string
        }
        Update: {
          activation_date?: string
          branch_id?: string | null
          brand_id?: string | null
          car_id?: string | null
          created_at?: string
          customer_id?: string
          employee_id?: string | null
          expiry_date?: string
          film_type_id?: string | null
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["warranty_status"]
          updated_at?: string
          vin?: string | null
          warranty_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "warranties_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranties_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "warranty_brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranties_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranties_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranties_film_type_id_fkey"
            columns: ["film_type_id"]
            isOneToOne: false
            referencedRelation: "film_types"
            referencedColumns: ["id"]
          },
        ]
      }
      warranty_brands: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      compute_expiry_date: {
        Args: { _activation: string; _months: number }
        Returns: string
      }
      generate_warranty_number: { Args: never; Returns: string }
      get_user_branch: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      verify_warranty_public: {
        Args: { _num: string }
        Returns: {
          activation_date: string
          branch_name: string
          brand_name: string
          customer_name: string
          expiry_date: string
          film_type_name: string
          status: Database["public"]["Enums"]["warranty_status"]
          vin: string
          warranty_number: string
        }[]
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "branch_staff"
        | "customer"
        | "super_admin"
        | "manager"
      warranty_status: "active" | "expired" | "cancelled" | "pending"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["admin", "branch_staff", "customer", "super_admin", "manager"],
      warranty_status: ["active", "expired", "cancelled", "pending"],
    },
  },
} as const
