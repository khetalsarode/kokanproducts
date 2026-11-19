export type Fulfillment = "internal" | "seller";

export type Category =
  | "kokum"
  | "mango"
  | "coconut"
  | "spices"
  | "seafood"
  | "sweets"
  | "rice"
  | "pickles";

export interface Seller {
  id: string;
  name: string;
  location: string;
  rating: number;
}

export interface Review {
  id: string;
  author: string;
  rating: number;
  date: string;
  comment: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  category: Category;
  description: string;
  price: number;
  mrp: number;
  unit: string;
  weight: string;
  stock: number;
  sellerId: string;
  fulfillment: Fulfillment;
  rating: number;
  reviewCount: number;
  tags: string[];
  accent: string;
  imageHint: string;
  images: string[];
  fssai: boolean;
  reviews: Review[];
}

export interface CartItem {
  productId: string;
  qty: number;
}

export interface Address {
  id: string;
  label: string;
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault?: boolean;
}

export type PaymentMethod = "upi" | "card" | "wallet" | "cod";

export type OrderStatus =
  | "placed"
  | "confirmed"
  | "packed"
  | "shipped"
  | "out_for_delivery"
  | "delivered";

export interface OrderLine {
  productId: string;
  name: string;
  qty: number;
  price: number;
  fulfillment: Fulfillment;
  sellerName: string;
}

export interface Order {
  id: string;
  createdAt: string;
  status: OrderStatus;
  items: OrderLine[];
  address: Address;
  paymentMethod: PaymentMethod;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  couponCode?: string;
  trackingId: string;
  courier: string;
  estimatedDelivery: string;
}

export interface Coupon {
  code: string;
  label: string;
  type: "percent" | "flat";
  value: number;
  minOrder: number;
}
