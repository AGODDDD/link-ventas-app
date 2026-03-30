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
}

export interface Product {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  created_at?: string;
  // Advanced Catalog Fields
  brand?: string;
  original_price?: number;
  is_free_shipping?: boolean;
  shipping_today?: boolean;
  is_active?: boolean;
  category?: string;
  rating?: number;
  reviews_count?: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}
