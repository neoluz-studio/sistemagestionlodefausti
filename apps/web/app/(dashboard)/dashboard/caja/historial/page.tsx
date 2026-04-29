'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CashMovement, CashSession } from '@/lib/types';

type CashSessionsResponse = { items: CashSession[]; total: number; page: number; limit: number };

function fmt(value: string | null | undefined) {
  return Number(value ?? '0').toFixed(2);
}

export default function HistorialCajaPage() {
  const [sessions, setSessions] = useState<CashSession[]>([]);
  const [selected, setSelected] = useState<CashSession | null>(null);

  const load = async () => {
    const res = await api.get('/api/v1/cash-sessions', { params: { page: 1, limit: 50 } });
    const payload = (res.data.data ?? res.data) as CashSessionsResponse;
    setSessions(payload.items ?? []);
  };

  const loadDetail = async (id: string) => {
    const res = await api.get(`/api/v1/cash-sessions/${id}`);
    setSelected((res.data.data ?? res.data) as CashSession);
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Historial de cajas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-brand-light text-left text-brand-deep">
                  <th className="p-2">Fecha</th>
                  <th className="p-2">Apertura</th>
                  <th className="p-2">Cierre</th>
                  <th className="p-2">Diferencia</th>
                  <th className="p-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr
                    key={s.id}
                    className="cursor-pointer border-b border-brand-light hover:bg-brand-snow"
                    onClick={() => loadDetail(s.id)}
                  >
                    <td className="p-2">{new Date(s.openedAt).toLocaleDateString()}</td>
                    <td className="p-2">${fmt(s.openingAmount)}</td>
                    <td className="p-2">${fmt(s.closingAmount)}</td>
                    <td className="p-2">${fmt(s.difference)}</td>
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
            <CardTitle>Detalle de caja</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded border border-brand-light p-3">Apertura: ${fmt(selected.openingAmount)}</div>
              <div className="rounded border border-brand-light p-3">Ingresos: ${fmt(selected.totalIncomes)}</div>
              <div className="rounded border border-brand-light p-3">Egresos: ${fmt(selected.totalExpenses)}</div>
              <div className="rounded border border-brand-light p-3">Esperado: ${fmt(selected.expectedAmount)}</div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-brand-light text-left text-brand-deep">
                    <th className="p-2">Hora</th>
                    <th className="p-2">Tipo</th>
                    <th className="p-2">Monto</th>
                    <th className="p-2">Descripcion</th>
                  </tr>
                </thead>
                <tbody>
                  {(selected.movements ?? []).map((m: CashMovement) => (
                    <tr key={m.id} className="border-b border-brand-light">
                      <td className="p-2">{new Date(m.createdAt).toLocaleString()}</td>
                      <td className="p-2">{m.type}</td>
                      <td className="p-2">${fmt(m.amount)}</td>
                      <td className="p-2">{m.description ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}