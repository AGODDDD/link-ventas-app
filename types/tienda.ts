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
  variants?: any[];
  is_available?: boolean;
  preparation_time?: string;
  gallery?: string[];
}

export interface CartItem {
  product: Product;
  quantity: number;
}
