'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PaymentMethod, Sale } from '@/lib/types';

type SalesListResponse = { items: Sale[]; total: number; page: number; limit: number };

const methods: Array<{ value: '' | PaymentMethod; label: string }> = [
  { value: '', label: 'Todos' },
  { value: 'CASH', label: 'Efectivo' },
  { value: 'TRANSFER', label: 'Transferencia' },
  { value: 'DEBIT', label: 'Debito' },
  { value: 'CREDIT', label: 'Credito' },
];

export default function HistorialVentasPage() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'' | PaymentMethod>('');
  const [sales, setSales] = useState<Sale[]>([]);
  const [selected, setSelected] = useState<Sale | null>(null);
  const [ticketHtml, setTicketHtml] = useState('');

  const load = useCallback(async () => {
    const res = await api.get('/api/v1/sales', { params: { dateFrom, dateTo, paymentMethod, page: 1, limit: 50 } });
    const payload = (res.data.data ?? res.data) as SalesListResponse;
    setSales(payload.items ?? []);
  }, [dateFrom, dateTo, paymentMethod]);

  const loadDetail = async (saleId: string) => {
    const [detail, ticket] = await Promise.all([
      api.get(`/api/v1/sales/${saleId}`),
      api.get(`/api/v1/sales/${saleId}/ticket`),
    ]);
    setSelected((detail.data.data ?? detail.data) as Sale);
    setTicketHtml(((ticket.data.data ?? ticket.data) as { html: string }).html);
  };

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Historial de ventas</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as '' | PaymentMethod)}
            className="h-10 rounded-md border border-brand-light px-3"
          >
            {methods.map((m) => (
              <option key={m.label} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <Button onClick={load}>Filtrar</Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-brand-light text-left text-brand-deep">
                  <th className="p-2">Fecha</th>
                  <th className="p-2">Numero</th>
                  <th className="p-2">Total</th>
                  <th className="p-2">Medio</th>
                  <th className="p-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr
                    key={s.id}
                    className="cursor-pointer border-b border-brand-light hover:bg-brand-snow"
                    onClick={() => loadDetail(s.id)}
                  >
                    <td className="p-2">{new Date(s.soldAt).toLocaleString()}</td>
                    <td className="p-2">#{s.saleNumber}</td>
                    <td className="p-2">${s.total}</td>
                    <td className="p-2">{s.payments?.[0]?.method ?? '-'}</td>
                    <td className="p-2">{s.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {selected ? (
        <Card>
          <CardHeader>
            <CardTitle>Detalle venta #{selected.saleNumber}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {selected.items?.map((item) => (
                <div key={item.id} className="flex justify-between rounded border border-brand-light p-2">
                  <span>
                    {item.product.name} x {item.quantity}
                  </span>
                  <span>${item.subtotal}</span>
                </div>
              ))}
            </div>
            <div className="space-y-1 text-sm">
              {selected.payments.map((p) => (
                <p key={p.id}>
                  {p.method}: ${p.amount}
                </p>
              ))}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => window.open(`/dashboard/ventas/${selected.id}`, '_blank')}>
                Ver detalle completo
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  await api.post(`/api/v1/sales/${selected.id}/cancel`);
                  await load();
                }}
              >
                Cancelar venta
              </Button>
            </div>
            <div className="rounded border border-brand-light p-3">
              <p className="mb-2 font-semibold">Ticket digital</p>
              <iframe title="ticket" srcDoc={ticketHtml} className="h-80 w-full rounded border border-brand-light bg-white" />
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
