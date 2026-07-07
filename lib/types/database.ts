import type { UserRole } from "./roles";
import type { OrderEstado } from "@/lib/orders/state-machine";

export type GeoPoint = {
  lat: number;
  lng: number;
  direccion: string;
};

// Tipado manual espejo de supabase/migrations/*.sql.
// Reemplazar por `supabase gen types typescript` una vez haga falta.
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
          ubicacion_actual: GeoPoint | null;
          vehiculo: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          company_id: string;
          disponibilidad?: boolean;
          ubicacion_actual?: GeoPoint | null;
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
          origen: GeoPoint | null;
          destino: GeoPoint | null;
          estado: OrderEstado;
          monto_total: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          cliente_id: string;
          company_id?: string | null;
          driver_id?: string | null;
          tipo: "flete" | "mudanza" | "larga_distancia";
          origen?: GeoPoint | null;
          destino?: GeoPoint | null;
          estado?: OrderEstado;
          monto_total?: number | null;
        };
        Update: Partial<Database["public"]["Tables"]["orders"]["Insert"]>;
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
        };
        Update: Partial<Database["public"]["Tables"]["push_subscriptions"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
