import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

export type ProductCategory = 'Robes' | 'Fleurs' | 'Beauté' | 'Papeterie' | 'Bijoux' | 'Autre';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: ProductCategory;
  active: boolean;
  views: number;
  sales: number;
  imageUri?: string;
  createdAt: string;
}

export interface Reel {
  id: string;
  title: string;
  description?: string;
  duration: string;
  likes: number;
  views: number;
  likedByMe: boolean;
  videoUri?: string;
  thumbnailUri?: string;
  date: string;
}

export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'cancelled';

export interface Order {
  id: string;
  productId: string;
  productName: string;
  buyerName: string;
  buyerEmail: string;
  amount: number;
  status: OrderStatus;
  createdAt: string;
}

interface BoutiqueStats {
  totalViews: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
}

interface BoutiqueContextValue {
  products: Product[];
  reels: Reel[];
  orders: Order[];
  stats: BoutiqueStats;
  // Boutique actions
  addProduct: (p: Omit<Product, 'id' | 'views' | 'sales' | 'createdAt'>) => void;
  updateProduct: (id: string, patch: Partial<Product>) => void;
  removeProduct: (id: string) => void;
  addReel: (r: Omit<Reel, 'id' | 'views' | 'likes' | 'likedByMe' | 'date'>) => void;
  updateOrderStatus: (id: string, status: OrderStatus) => void;
  // Client actions (synchronisation côté client)
  recordProductView: (productId: string) => void;
  recordReelView: (reelId: string) => void;
  toggleReelLike: (reelId: string) => void;
  placeOrder: (order: Omit<Order, 'id' | 'createdAt'>) => void;
}

// ── Context ──────────────────────────────────────────────────────────────────

const BoutiqueContext = createContext<BoutiqueContextValue | null>(null);

let _nextProductId = 1;
let _nextReelId = 1;
let _nextOrderId = 1;

export function BoutiqueProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [reels, setReels] = useState<Reel[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  const stats = useMemo<BoutiqueStats>(() => ({
    totalViews: products.reduce((s, p) => s + p.views, 0) + reels.reduce((s, r) => s + r.views, 0),
    totalProducts: products.filter((p) => p.active).length,
    totalOrders: orders.length,
    totalRevenue: orders
      .filter((o) => o.status === 'paid' || o.status === 'shipped')
      .reduce((s, o) => s + o.amount, 0),
  }), [products, reels, orders]);

  const addProduct = useCallback((p: Omit<Product, 'id' | 'views' | 'sales' | 'createdAt'>) => {
    setProducts((prev) => [
      ...prev,
      { ...p, id: String(_nextProductId++), views: 0, sales: 0, createdAt: new Date().toISOString() },
    ]);
  }, []);

  const updateProduct = useCallback((id: string, patch: Partial<Product>) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

  const removeProduct = useCallback((id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const addReel = useCallback((r: Omit<Reel, 'id' | 'views' | 'likes' | 'likedByMe' | 'date'>) => {
    setReels((prev) => [
      ...prev,
      {
        ...r,
        id: String(_nextReelId++),
        views: 0,
        likes: 0,
        likedByMe: false,
        date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }),
      },
    ]);
  }, []);

  const updateOrderStatus = useCallback((id: string, status: OrderStatus) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
  }, []);

  // ── Client-side sync ──────────────────────────────────────────────────────

  const recordProductView = useCallback((productId: string) => {
    setProducts((prev) => prev.map((p) => p.id === productId ? { ...p, views: p.views + 1 } : p));
  }, []);

  const recordReelView = useCallback((reelId: string) => {
    setReels((prev) => prev.map((r) => r.id === reelId ? { ...r, views: r.views + 1 } : r));
  }, []);

  const toggleReelLike = useCallback((reelId: string) => {
    setReels((prev) =>
      prev.map((r) =>
        r.id === reelId
          ? { ...r, likedByMe: !r.likedByMe, likes: r.likedByMe ? r.likes - 1 : r.likes + 1 }
          : r
      )
    );
  }, []);

  const placeOrder = useCallback((order: Omit<Order, 'id' | 'createdAt'>) => {
    setOrders((prev) => [
      ...prev,
      { ...order, id: `ORD-${String(_nextOrderId++).padStart(3, '0')}`, createdAt: new Date().toISOString() },
    ]);
    // increment sales on product
    setProducts((prev) =>
      prev.map((p) => p.id === order.productId ? { ...p, sales: p.sales + 1 } : p)
    );
  }, []);

  const value = useMemo<BoutiqueContextValue>(
    () => ({
      products, reels, orders, stats,
      addProduct, updateProduct, removeProduct,
      addReel, updateOrderStatus,
      recordProductView, recordReelView, toggleReelLike, placeOrder,
    }),
    [products, reels, orders, stats, addProduct, updateProduct, removeProduct,
      addReel, updateOrderStatus, recordProductView, recordReelView, toggleReelLike, placeOrder]
  );

  return <BoutiqueContext.Provider value={value}>{children}</BoutiqueContext.Provider>;
}

export function useBoutique() {
  const ctx = useContext(BoutiqueContext);
  if (!ctx) throw new Error('useBoutique must be used inside BoutiqueProvider');
  return ctx;
}
