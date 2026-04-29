'use client';

import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PaymentMethod, Product } from '@/lib/types';

type CartItem = Product & { quantity: number };

const paymentButtons: Array<{ key: PaymentMethod; label: string }> = [
  { key: 'CASH', label: 'Efectivo' },
  { key: 'TRANSFER', label: 'Transferencia' },
  { key: 'DEBIT', label: 'Debito' },
  { key: 'CREDIT', label: 'Credito' },
];

export default function VentasPage() {
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [cashReceived, setCashReceived] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const res = await api.get('/api/v1/products', { params: { search } });
      setProducts((res.data.data ?? res.data) as Product[]);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const total = useMemo(
    () => cart.reduce((acc, i) => acc + Number(i.salePrice) * i.quantity, 0),
    [cart],
  );
  const change = method === 'CASH' ? Math.max(0, Number(cashReceived || '0') - total) : 0;

  const add = (p: Product) => {
    setCart((prev) => {
      const found = prev.find((x) => x.id === p.id);
      if (found) return prev.map((x) => (x.id === p.id ? { ...x, quantity: x.quantity + 1 } : x));
      return [...prev, { ...p, quantity: 1 }];
    });
  };

  const confirmSale = async () => {
    if (!cart.length) return;
    setLoading(true);
    try {
      await api.post('/api/v1/sales', {
        items: cart.map((i) => ({ productId: i.id, quantity: i.quantity.toFixed(3) })),
        payments: [{ method, amount: total.toFixed(2) }],
      });
      setCart([]);
      setCashReceived('');
      setSearch('');
      const res = await api.get('/api/v1/products', { params: { search: '' } });
      setProducts((res.data.data ?? res.data) as Product[]);
      alert('Venta confirmada');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Caja Rapida</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Paso 1: Buscar producto por nombre"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-12 text-lg"
          />
          <div className="grid gap-2 md:grid-cols-2">
            {products.map((p) => (
              <Button key={p.id} variant="outline" size="lg" className="justify-between" onClick={() => add(p)}>
                <span>{p.name}</span>
                <span>${p.salePrice}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Paso 2: Carrito</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {cart.map((i) => (
            <div key={i.id} className="flex items-center justify-between rounded border border-brand-light p-3">
              <div>
                <p className="font-semibold text-brand-deep">{i.name}</p>
                <p className="text-sm text-slate-500">
                  ${i.salePrice} x {i.quantity}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setCart((prev) => prev.map((x) => (x.id === i.id ? { ...x, quantity: Math.max(1, x.quantity - 1) } : x)))}>
                  -
                </Button>
                <Button variant="outline" onClick={() => setCart((prev) => prev.map((x) => (x.id === i.id ? { ...x, quantity: x.quantity + 1 } : x)))}>
                  +
                </Button>
              </div>
              <p className="font-semibold">${(Number(i.salePrice) * i.quantity).toFixed(2)}</p>
            </div>
          ))}
          <div className="text-right text-2xl font-bold text-brand-deep">Total: ${total.toFixed(2)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Paso 3: Pago y confirmar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {paymentButtons.map((m) => (
              <Button
                key={m.key}
                size="lg"
                variant={method === m.key ? 'default' : 'outline'}
                onClick={() => setMethod(m.key)}
              >
                {m.label}
              </Button>
            ))}
          </div>
          {method === 'CASH' ? (
            <div className="grid gap-2 md:grid-cols-2">
              <Input
                placeholder="Monto recibido"
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
                className="h-12 text-lg"
              />
              <div className="rounded border border-brand-light p-3 text-lg">
                Vuelto: <strong>${change.toFixed(2)}</strong>
              </div>
            </div>
          ) : null}
          <Button size="lg" className="h-14 w-full text-xl" onClick={confirmSale} disabled={loading || !cart.length}>
            {loading ? 'Confirmando...' : 'Confirmar Venta'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
