/**
 * LINKVENTAS CORE ARCHITECTURE TYPES
 * Unified schema for multi-template SaaS e-commerce.
 */

export type TemplateType = 'restaurante' | 'comercio' | 'moda';
export type StoreSchedule = Record<string, { active: boolean; open: string; close: string }>;

// --- CORE: IDENTITY ---
export interface Store {
  id: string; // UUID (Store ID)
  owner_id: string; // UUID (Merchant/Auth User ID)
  slug: string;
  name: string;
  description?: string;
  avatar_url?: string;
  banner_url?: string;
  template_type: TemplateType;
  whatsapp_phone?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// --- CORE: CONFIGURATION ---
export interface StoreConfig {
  store_id: string;
  primary_color?: string;
  secondary_color?: string;
  store_lat?: number;
  store_lng?: number;
  store_address?: string;
  store_schedule?: StoreSchedule;
  hero_image_url?: string;
  yape_image_url?: string;
  plin_image_url?: string;
  social_instagram?: string;
  social_facebook?: string;
  social_tiktok?: string;
  horario?: string;
  direccion?: string;
  whatsapp_order_template?: string;
  benefits?: { title: string; description: string }[];
  faqs?: { question: string; answer: string }[];
  promo_title?: string;
  promo_description?: string;
  fomo_enabled?: boolean;
  mercadopago_active?: boolean;
  mercadopago_public_key?: string;
  operations_config?: {
    delivery_enabled?: boolean;
    pickup_enabled?: boolean;
    delivery_radius_km?: number;
    min_order_amount?: number;
    default_preparation_time?: string;
    accepts_orders_always?: boolean;
    shipping_methods?: string;
    coverage_area?: string;
    dispatch_time?: string;
    size_guide?: string;
    returns_policy?: string;
    exchange_days?: number;
  };
  created_at?: string;
  updated_at: string;
}

// --- CORE: UNIFIED ORDERS ---
export type OrderStatus = 
  | 'pendiente' 
  | 'pendiente_pago' 
  | 'en_preparacion' 
  | 'alistando' 
  | 'en_camino' 
  | 'completado' 
  | 'cancelado';

export interface UnifiedOrder {
  id: string; 
  store_id: string;
  order_type: 'delivery' | 'pickup' | 'standard';
  status: OrderStatus;
  
  // Cliente
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  
  // Delivery
  direccion?: string;
  referencia?: string;
  lat?: number;
  lng?: number;
  delivery_fee: number;
  estimated_time?: string;
  
  // Totales
  subtotal: number;
  total: number;
  metodo_pago: string;
  payment_proof_url?: string;
  
  // Trazabilidad
  legacy_id?: string;
  created_at: string;
  updated_at: string;
}

export interface UnifiedOrderItem {
  id: string;
  order_id: string;
  product_id?: string;
  name: string;
  quantity: number;
  price: number; 
  modifiers?: any; 
  created_at: string;
}

// --- EXTENSIONS ---

export interface ExtensionDeliverySettings {
  store_id: string;
  base_fee: number;
  min_order_amount?: number;
  estimated_time?: string;
  is_active: boolean;
}

export interface ExtensionProductVariants {
  product_id: string;
  variants_data: Array<{ talla?: string; color?: string; stock?: number | null; price_delta?: number }>;
}

export interface ExtensionMenuCategories {
  store_id: string;
  name: string;
  orderWeight: number;
  is_active: boolean;
}
