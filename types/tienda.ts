export interface Profile {
  id: string;
  store_name?: string;
  description?: string;
  avatar_url?: string;
  banner_url?: string;
  primary_color?: string;
  secondary_color?: string;
  social_instagram?: string;
  social_facebook?: string;
  social_tiktok?: string;
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
}

export interface CartItem {
  product: Product;
  quantity: number;
}
