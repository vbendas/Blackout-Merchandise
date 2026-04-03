export interface CartItem {
  id: string;
  productId: string;
  storeId: string;
  storeName: string;
  name: string;
  price: number; // in cents
  quantity: number;
  mockupUrl: string;
  variant?: string;
  size?: string;
  color?: string;
}

export interface CartState {
  items: CartItem[];
  isOpen: boolean;
}

export interface CartActions {
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
}

export type Cart = CartState & CartActions;

export interface CartSummary {
  itemCount: number;
  subtotal: number; // in cents
  total: number; // in cents
  storeNames: string[];
}
