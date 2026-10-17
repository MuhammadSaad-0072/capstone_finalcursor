export type PaperTradeRow = {
  id: string;
  user_id: string;
  asset_symbol: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      paper_trades: {
        Row: PaperTradeRow;
        Insert: Omit<PaperTradeRow, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<PaperTradeRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      record_paper_trade: {
        Args: {
          p_user_id: string;
          p_asset_symbol: string;
          p_side: "buy" | "sell";
          p_quantity: number;
          p_price: number;
        };
        Returns: PaperTradeRow;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
