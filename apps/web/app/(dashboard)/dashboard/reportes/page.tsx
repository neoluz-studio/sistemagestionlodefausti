'use client';

import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type ReportPeriod = 'day' | 'week' | 'month';

function money(v: string | number | null | undefined) {
  return `$${Number(v ?? 0).toFixed(2)}`;
}

export default function ReportesPage() {
  const [tab, setTab] = useState<'ventas' | 'productos' | 'ganancias' | 'cajas' | 'clientes'>('ventas');
  const [period, setPeriod] = useState<ReportPeriod>('day');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [salesSummary, setSalesSummary] = useState<any>(null);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [profitSummary, setProfitSummary] = useState<any>(null);
  const [cashHistory, setCashHistory] = useState<any[]>([]);
  const [frequentCustomers, setFrequentCustomers] = useState<any[]>([]);

  const params = useMemo(() => ({ period, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined }), [period, dateFrom, dateTo]);

  const load = async () => {
    const [a, b, c, d, e] = await Promise.all([
      api.get('/api/v1/reports/sales-summary', { params }),
      api.get('/api/v1/reports/top-products', { params }),
      api.get('/api/v1/reports/profit-summary', { params }),
      api.get('/api/v1/reports/cash-history', { params }),
      api.get('/api/v1/reports/frequent-customers', { params }),
    ]);
    setSalesSummary(a.data.data ?? a.data);
    setTopProducts((b.data.data ?? b.data) as any[]);
    setProfitSummary(c.data.data ?? c.data);
    setCashHistory((d.data.data ?? d.data) as any[]);
    setFrequentCustomers((e.data.data ?? e.data) as any[]);
  };

  const salesChart = (salesSummary?.periods ?? []).map((p: any) => ({
    period: p.period,
    amount: Number(p.amount),
  }));

  const profitChart = (profitSummary?.periods ?? []).map((p: any) => ({
    period: p.period,
    profit: Number(p.profit),
  }));

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold text-brand-deep">Centro de reportes</h1>
        <p className="text-brand-mid">Analitica comercial y financiera por periodo.</p>
      </div>

      <Card>
        <CardContent className="grid gap-3 p-6 md:grid-cols-5">
          <select value={period} onChange={(e) => setPeriod(e.target.value as ReportPeriod)} className="h-10 rounded-md border border-brand-light px-3">
            <option value="day">Dia</option>
            <option value="week">Semana</option>
            <option value="month">Mes</option>
          </select>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          <Button onClick={load}>Aplicar filtros</Button>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {[
          ['ventas', 'Ventas por periodo'],
          ['productos', 'Top productos'],
          ['ganancias', 'Ganancias'],
          ['cajas', 'Historial de cajas'],
          ['clientes', 'Clientes frecuentes'],
        ].map(([k, label]) => (
          <Button key={k} variant={tab === k ? 'default' : 'outline'} onClick={() => setTab(k as any)}>
            {label}
          </Button>
        ))}
      </div>

      {tab === 'ventas' ? (
        <Card>
          <CardHeader>
            <CardTitle>Ventas por periodo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded border border-brand-light p-4">Total ventas: <strong>{salesSummary?.totalSales ?? 0}</strong></div>
              <div className="rounded border border-brand-light p-4">Monto total: <strong>{money(salesSummary?.totalAmount)}</strong></div>
              <div className="rounded border border-brand-light p-4">Ganancia: <strong>{money(salesSummary?.totalProfit)}</strong></div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#DCEFFD" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip formatter={(v) => money(Number(v))} />
                  <Bar dataKey="amount" fill="#2F6FA3" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {tab === 'productos' ? (
        <Card>
          <CardHeader><CardTitle>Productos mas vendidos</CardTitle></CardHeader>
          <CardContent>
            <table className="min-w-full text-sm">
              <thead><tr className="border-b border-brand-light text-left"><th className="p-2">#</th><th className="p-2">Producto</th><th className="p-2">Cantidad</th><th className="p-2">Monto</th></tr></thead>
              <tbody>
                {topProducts.map((p) => (
                  <tr key={p.productId} className="border-b border-brand-light"><td className="p-2">{p.rank}</td><td className="p-2">{p.name}</td><td className="p-2">{p.quantitySold}</td><td className="p-2">{money(p.amount)}</td></tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}

      {tab === 'ganancias' ? (
        <Card>
          <CardHeader><CardTitle>Resumen de ganancias</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded border border-brand-light p-4">Ingresos: <strong>{money(profitSummary?.totalRevenue)}</strong></div>
              <div className="rounded border border-brand-light p-4">Costos: <strong>{money(profitSummary?.totalCost)}</strong></div>
              <div className="rounded border border-brand-light p-4">Ganancia: <strong>{money(profitSummary?.totalProfit)}</strong></div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={profitChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#DCEFFD" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip formatter={(v) => money(Number(v))} />
                  <Bar dataKey="profit" fill="#0EA5E9" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {tab === 'cajas' ? (
        <Card>
          <CardHeader><CardTitle>Historial de cajas</CardTitle></CardHeader>
          <CardContent>
            <table className="min-w-full text-sm">
              <thead><tr className="border-b border-brand-light text-left"><th className="p-2">Apertura</th><th className="p-2">Cierre</th><th className="p-2">Esperado</th><th className="p-2">Diferencia</th></tr></thead>
              <tbody>
                {cashHistory.map((c) => (
                  <tr key={c.id} className="border-b border-brand-light"><td className="p-2">{new Date(c.openedAt).toLocaleString()}</td><td className="p-2">{c.closedAt ? new Date(c.closedAt).toLocaleString() : '-'}</td><td className="p-2">{money(c.expectedAmount)}</td><td className="p-2">{money(c.difference)}</td></tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}

      {tab === 'clientes' ? (
        <Card>
          <CardHeader><CardTitle>Clientes frecuentes</CardTitle></CardHeader>
          <CardContent>
            <table className="min-w-full text-sm">
              <thead><tr className="border-b border-brand-light text-left"><th className="p-2">Cliente</th><th className="p-2">Compras</th><th className="p-2">Monto total</th></tr></thead>
              <tbody>
                {frequentCustomers.map((c) => (
                  <tr key={c.customerId} className="border-b border-brand-light"><td className="p-2">{c.fullName}</td><td className="p-2">{c.purchases}</td><td className="p-2">{money(c.totalAmount)}</td></tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}