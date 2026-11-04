// Mirrors supabase/migrations. Update this when the schema changes.

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          sleeper_username: string;
          sleeper_user_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          sleeper_username: string;
          sleeper_user_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          sleeper_username?: string;
          sleeper_user_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      followed_leagues: {
        Row: {
          user_id: string;
          league_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          league_id: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          league_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "followed_leagues_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
