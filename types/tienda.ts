export interface Profile {
  id: string;
  slug?: string;
  store_name?: string;
  description?: string;
  avatar_url?: string;
  banner_url?: string;
  primary_color?: string;
  secondary_color?: string;
  social_instagram?: string;
  social_facebook?: string;
  social_tiktok?: string;
  whatsapp_phone?: string;
  yape_image_url?: string;
  plin_image_url?: string;
  // Facturacion SUNAT
  sol_ruc?: string;
  sol_usuario?: string;
  sol_password?: string;
  certificado_digital_url?: string;
  certificado_password?: string;
  // Motor FOMO (Stock Social)
  fomo_enabled?: boolean;
  fomo_min_viewers?: number;
  fomo_max_viewers?: number;
  fomo_message?: string;

  // Multi-Nicho / Plantillas
  template_type?: 'restaurante' | 'comercio' | 'moda';
  horario?: string;
  direccion?: string;
  whatsapp_order_template?: string;

  // Ubicación del local
  store_lat?: number;
  store_lng?: number;
  store_address?: string;

  // Estrategia Horaria
  store_schedule?: Record<string, { active: boolean; open: string; close: string }>;

  // Pasarela de Pagos (Culqi)
  culqi_active?: boolean;
  culqi_public_key?: string;
  culqi_secret_key?: string;
}

export interface ProductModifierOption {
  id: string;
  name: string;
  price_modifier: number;
}

export interface ProductModifierGroup {
  id: string;
  name: string;
  required: boolean;
  min_selections: number;
  max_selections: number;
  options: ProductModifierOption[];
}

export interface Product {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  created_at?: string;
  stock?: number;
  // Advanced Catalog Fields
  brand?: string;
  original_price?: number;
  is_free_shipping?: boolean;
  shipping_today?: boolean;
  is_active?: boolean;
  category?: string;
  rating?: number;
  reviews_count?: number;

  // Restaurante & Moda Extensions
  variants?: any[]; // We'll store ProductModifierGroup[] in here for restaurants
  is_available?: boolean;
  preparation_time?: string;
  gallery?: string[];
}

export interface CartItem {
  product: Product;
  quantity: number;
  variantDetails?: {
    talla?: string;
    color?: string;
    notes?: string;
    // Map of GroupId -> Array of Selected Option IDs
    options?: Record<string, string[]>;
  };
}
