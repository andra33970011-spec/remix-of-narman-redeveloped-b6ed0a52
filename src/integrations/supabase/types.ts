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
      audit_log: {
        Row: {
          aksi: string
          created_at: string
          data_sebelum: Json | null
          data_sesudah: Json | null
          entitas: string
          entitas_id: string | null
          id: string
          ip_address: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          aksi: string
          created_at?: string
          data_sebelum?: Json | null
          data_sesudah?: Json | null
          entitas: string
          entitas_id?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          aksi?: string
          created_at?: string
          data_sebelum?: Json | null
          data_sesudah?: Json | null
          entitas?: string
          entitas_id?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      job_queue: {
        Row: {
          attempts: number
          created_at: string
          created_by: string | null
          error: string | null
          finished_at: string | null
          id: string
          job_type: string
          max_attempts: number
          payload: Json
          result: Json | null
          scheduled_at: string
          started_at: string | null
          status: Database["public"]["Enums"]["job_status"]
        }
        Insert: {
          attempts?: number
          created_at?: string
          created_by?: string | null
          error?: string | null
          finished_at?: string | null
          id?: string
          job_type: string
          max_attempts?: number
          payload?: Json
          result?: Json | null
          scheduled_at?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
        }
        Update: {
          attempts?: number
          created_at?: string
          created_by?: string | null
          error?: string | null
          finished_at?: string | null
          id?: string
          job_type?: string
          max_attempts?: number
          payload?: Json
          result?: Json | null
          scheduled_at?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
        }
        Relationships: []
      }
      opd: {
        Row: {
          created_at: string
          id: string
          kategori: string[]
          nama: string
          singkatan: string
        }
        Insert: {
          created_at?: string
          id?: string
          kategori?: string[]
          nama: string
          singkatan: string
        }
        Update: {
          created_at?: string
          id?: string
          kategori?: string[]
          nama?: string
          singkatan?: string
        }
        Relationships: []
      }
      permohonan: {
        Row: {
          atas_nama_hp: string | null
          atas_nama_nama: string | null
          atas_nama_nik: string | null
          deskripsi: string | null
          id: string
          judul: string
          kategori: string
          kode: string
          opd_id: string
          pemohon_id: string
          petugas_id: string | null
          prioritas: string
          ringkasan: string | null
          status: Database["public"]["Enums"]["status_permohonan"]
          tanggal_masuk: string
          tenggat: string | null
          untuk_orang_lain: boolean
          updated_at: string
          wakil_ambil_nama: string | null
          wakil_ambil_nik: string | null
        }
        Insert: {
          atas_nama_hp?: string | null
          atas_nama_nama?: string | null
          atas_nama_nik?: string | null
          deskripsi?: string | null
          id?: string
          judul: string
          kategori: string
          kode: string
          opd_id: string
          pemohon_id: string
          petugas_id?: string | null
          prioritas?: string
          ringkasan?: string | null
          status?: Database["public"]["Enums"]["status_permohonan"]
          tanggal_masuk?: string
          tenggat?: string | null
          untuk_orang_lain?: boolean
          updated_at?: string
          wakil_ambil_nama?: string | null
          wakil_ambil_nik?: string | null
        }
        Update: {
          atas_nama_hp?: string | null
          atas_nama_nama?: string | null
          atas_nama_nik?: string | null
          deskripsi?: string | null
          id?: string
          judul?: string
          kategori?: string
          kode?: string
          opd_id?: string
          pemohon_id?: string
          petugas_id?: string | null
          prioritas?: string
          ringkasan?: string | null
          status?: Database["public"]["Enums"]["status_permohonan"]
          tanggal_masuk?: string
          tenggat?: string | null
          untuk_orang_lain?: boolean
          updated_at?: string
          wakil_ambil_nama?: string | null
          wakil_ambil_nik?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "permohonan_opd_id_fkey"
            columns: ["opd_id"]
            isOneToOne: false
            referencedRelation: "opd"
            referencedColumns: ["id"]
          },
        ]
      }
      permohonan_riwayat: {
        Row: {
          aksi: string
          catatan: string | null
          created_at: string
          id: string
          oleh: string | null
          permohonan_id: string
        }
        Insert: {
          aksi: string
          catatan?: string | null
          created_at?: string
          id?: string
          oleh?: string | null
          permohonan_id: string
        }
        Update: {
          aksi?: string
          catatan?: string | null
          created_at?: string
          id?: string
          oleh?: string | null
          permohonan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "permohonan_riwayat_permohonan_id_fkey"
            columns: ["permohonan_id"]
            isOneToOne: false
            referencedRelation: "permohonan"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          nama_lengkap: string
          nik: string | null
          no_hp: string | null
          opd_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          nama_lengkap?: string
          nik?: string | null
          no_hp?: string | null
          opd_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          nama_lengkap?: string
          nik?: string | null
          no_hp?: string | null
          opd_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_opd_id_fkey"
            columns: ["opd_id"]
            isOneToOne: false
            referencedRelation: "opd"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit: {
        Row: {
          bucket: string
          count: number
          id: string
          identifier: string
          window_start: string
        }
        Insert: {
          bucket: string
          count?: number
          id?: string
          identifier: string
          window_start?: string
        }
        Update: {
          bucket?: string
          count?: number
          id?: string
          identifier?: string
          window_start?: string
        }
        Relationships: []
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
      get_user_opd: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "warga" | "admin_opd" | "super_admin" | "admin_desa"
      job_status: "pending" | "running" | "success" | "failed" | "dead"
      status_permohonan: "baru" | "diproses" | "selesai" | "ditolak"
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
      app_role: ["warga", "admin_opd", "super_admin", "admin_desa"],
      job_status: ["pending", "running", "success", "failed", "dead"],
      status_permohonan: ["baru", "diproses", "selesai", "ditolak"],
    },
  },
} as const
