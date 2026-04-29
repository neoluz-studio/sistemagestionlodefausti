'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type Product = {
  id: string;
  sku: string;
  name: string;
  stock: string;
  salePrice: string;
};

export default function ProductosPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ sku: '', name: '', costPrice: '0', salePrice: '0' });

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/v1/products');
      setItems((res.data.data ?? res.data) as Product[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Productos</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <Input placeholder="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
          <Input placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input placeholder="Costo" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} />
          <Input placeholder="Venta" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: e.target.value })} />
          <div className="md:col-span-4">
            <Button
              onClick={async () => {
                await api.post('/api/v1/products', form);
                setForm({ sku: '', name: '', costPrice: '0', salePrice: '0' });
                await load();
              }}
            >
              Crear producto
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? <p>Cargando...</p> : null}
          {items.map((p) => (
            <div key={p.id} className="rounded border border-brand-light p-3 text-sm">
              {p.sku} · {p.name} · Stock {p.stock} · ${p.salePrice}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}