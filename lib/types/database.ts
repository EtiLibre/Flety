import type { UserRole } from "./roles";

// Tipado manual espejo de supabase/migrations/0001_init_schema.sql.
// Reemplazar por `supabase gen types typescript` una vez exista el proyecto real.
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          nombre: string | null;
          role: UserRole;
          company_id: string | null;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          nombre?: string | null;
          role?: UserRole;
          company_id?: string | null;
          avatar_url?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
        Relationships: [];
      };
      companies: {
        Row: {
          id: string;
          nombre: string;
          cuit: string | null;
          estado_aprobacion: "pendiente" | "aprobada" | "rechazada";
          comision_pct: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          nombre: string;
          cuit?: string | null;
          estado_aprobacion?: "pendiente" | "aprobada" | "rechazada";
          comision_pct?: number | null;
        };
        Update: Partial<Database["public"]["Tables"]["companies"]["Insert"]>;
        Relationships: [];
      };
      drivers: {
        Row: {
          id: string;
          user_id: string;
          company_id: string;
          disponibilidad: boolean;
          ubicacion_actual: Record<string, unknown> | null;
          vehiculo: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          company_id: string;
          disponibilidad?: boolean;
          ubicacion_actual?: Record<string, unknown> | null;
          vehiculo?: Record<string, unknown> | null;
        };
        Update: Partial<Database["public"]["Tables"]["drivers"]["Insert"]>;
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          cliente_id: string;
          company_id: string | null;
          driver_id: string | null;
          tipo: "flete" | "mudanza" | "larga_distancia";
          origen: Record<string, unknown> | null;
          destino: Record<string, unknown> | null;
          estado: string;
          monto_total: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          cliente_id: string;
          company_id?: string | null;
          driver_id?: string | null;
          tipo: "flete" | "mudanza" | "larga_distancia";
          origen?: Record<string, unknown> | null;
          destino?: Record<string, unknown> | null;
          estado?: string;
          monto_total?: number | null;
        };
        Update: Partial<Database["public"]["Tables"]["orders"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
