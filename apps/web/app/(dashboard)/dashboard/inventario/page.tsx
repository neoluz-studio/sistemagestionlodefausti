'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type Product = { id: string; name: string; sku: string };
type Movement = {
  id: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'RETURN';
  quantity: string;
  createdAt: string;
  product: Product;
};

export default function InventarioPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [form, setForm] = useState({
    productId: '',
    type: 'IN',
    quantity: '1',
    reason: '',
  });

  const load = async () => {
    const [p, m] = await Promise.all([
      api.get('/api/v1/products'),
      api.get('/api/v1/inventory/movements'),
    ]);
    setProducts((p.data.data ?? p.data) as Product[]);
    setMovements((m.data.data ?? m.data) as Movement[]);
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Nuevo movimiento</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <select
            className="h-10 rounded-md border border-brand-light px-3"
            value={form.productId}
            onChange={(e) => setForm({ ...form, productId: e.target.value })}
          >
            <option value="">Selecciona producto</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.sku} - {p.name}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-md border border-brand-light px-3"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as Movement['type'] })}
          >
            <option value="IN">IN</option>
            <option value="OUT">OUT</option>
            <option value="ADJUSTMENT">ADJUSTMENT</option>
            <option value="RETURN">RETURN</option>
          </select>
          <Input
            placeholder="Cantidad"
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
          />
          <Input
            placeholder="Motivo"
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
          />
          <div className="md:col-span-4">
            <Button
              onClick={async () => {
                await api.post('/api/v1/inventory/movements', form);
                setForm({ productId: '', type: 'IN', quantity: '1', reason: '' });
                await load();
              }}
            >
              Registrar movimiento
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Movimientos recientes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {movements.map((m) => (
            <div key={m.id} className="rounded border border-brand-light p-3 text-sm">
              {m.type} · {m.quantity} · {m.product?.name} ·{' '}
              {new Date(m.createdAt).toLocaleString()}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}