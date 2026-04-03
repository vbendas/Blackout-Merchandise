import { CartProvider } from '@/components/cart/CartProvider';
import { MerchShopsNavbar } from '@/components/layout/MerchShopsNavbar';

export default function MerchShopsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MerchShopsNavbar />
      <main className="pt-16">{children}</main>
      <CartProvider />
    </>
  );
}
