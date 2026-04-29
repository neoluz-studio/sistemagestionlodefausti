'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sale } from '@/lib/types';

export default function VentaDetallePage() {
  const params = useParams<{ id: string }>();
  const [sale, setSale] = useState<Sale | null>(null);
  const [ticketHtml, setTicketHtml] = useState('');

  useEffect(() => {
    const run = async () => {
      const [detail, ticket] = await Promise.all([
        api.get(`/api/v1/sales/${params.id}`),
        api.get(`/api/v1/sales/${params.id}/ticket`),
      ]);
      setSale((detail.data.data ?? detail.data) as Sale);
      setTicketHtml(((ticket.data.data ?? ticket.data) as { html: string }).html);
    };
    void run();
  }, [params.id]);

  if (!sale) return <p>Cargando...</p>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Venta #{sale.saleNumber}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p>Estado: {sale.status}</p>
          <p>Fecha: {new Date(sale.soldAt).toLocaleString()}</p>
          <p>Total: ${sale.total}</p>
          <div className="space-y-1">
            {sale.items?.map((item) => (
              <div key={item.id} className="flex justify-between rounded border border-brand-light p-2 text-sm">
                <span>
                  {item.product.name} x {item.quantity}
                </span>
                <span>${item.subtotal}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Ticket digital</CardTitle>
        </CardHeader>
        <CardContent>
          <iframe title="ticket" srcDoc={ticketHtml} className="h-[34rem] w-full rounded border border-brand-light bg-white" />
        </CardContent>
      </Card>
    </div>
  );
}
