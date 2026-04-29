'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, DollarSign, ShoppingBag, Wallet } from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import api from '@/lib/api-client';
import {
  DashboardRecentSale,
  DashboardSummary,
  DashboardWeeklyPoint,
  LowStockProduct,
} from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function money(v: string | number | null | undefined) {
  return `$${Number(v ?? 0).toFixed(2)}`;
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [weekly, setWeekly] = useState<DashboardWeeklyPoint[]>([]);
  const [recent, setRecent] = useState<DashboardRecentSale[]>([]);
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);

  useEffect(() => {
    const load = async () => {
      const [s, w, r, l] = await Promise.all([
        api.get('/api/v1/dashboard/summary'),
        api.get('/api/v1/dashboard/weekly-sales'),
        api.get('/api/v1/dashboard/recent-sales'),
        api.get('/api/v1/dashboard/low-stock'),
      ]);
      setSummary((s.data.data ?? s.data) as DashboardSummary);
      setWeekly((w.data.data ?? w.data) as DashboardWeeklyPoint[]);
      setRecent((r.data.data ?? r.data) as DashboardRecentSale[]);
      setLowStock((l.data.data ?? l.data) as LowStockProduct[]);
    };
    void load();
  }, []);

  const chartData = useMemo(
    () =>
      weekly.map((p) => ({
        ...p,
        day: new Date(`${p.date}T00:00:00`).toLocaleDateString(),
        amount: Number(p.totalAmount),
      })),
    [weekly],
  );

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold text-brand-deep">Dashboard</h1>
        <p className="text-brand-mid">Resumen operativo y comercial en tiempo real.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-l-4 border-l-brand-mid">
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm text-brand-mid">Ventas del dia</p>
              <p className="text-3xl font-bold text-brand-deep">
                {summary?.salesCountToday ?? 0}
              </p>
              <p className="text-sm text-slate-500">{money(summary?.salesAmountToday)}</p>
            </div>
            <ShoppingBag className="text-brand-mid" />
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm text-brand-mid">Caja actual</p>
              <p className="text-3xl font-bold text-brand-deep">
                {summary?.currentCashBalance ? money(summary.currentCashBalance) : '--'}
              </p>
              <p className="text-sm text-slate-500">Solo si hay caja abierta</p>
            </div>
            <Wallet className="text-emerald-500" />
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-sky-500">
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm text-brand-mid">Ganancia estimada</p>
              <p className="text-3xl font-bold text-brand-deep">
                {money(summary?.estimatedProfitToday)}
              </p>
              <p className="text-sm text-slate-500">Ganancia del dia</p>
            </div>
            <DollarSign className="text-sky-500" />
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm text-brand-mid">Stock bajo</p>
              <p className="text-3xl font-bold text-brand-deep">{summary?.lowStockCount ?? 0}</p>
              <p className="text-sm text-slate-500">Productos en alerta</p>
            </div>
            <AlertTriangle className="text-amber-500" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Ventas semanales</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#DCEFFD" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip formatter={(v) => money(Number(v))} />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="#2F6FA3"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Productos con stock bajo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStock.slice(0, 8).map((p) => (
                <div key={p.id} className="rounded-lg border border-brand-light p-3 text-sm">
                  <p className="font-semibold text-brand-deep">{p.name}</p>
                  <p className="text-slate-600">
                    Stock: {p.stock} / Min: {p.minStock}
                  </p>
                </div>
              ))}
              {!lowStock.length ? <p className="text-sm text-slate-500">Sin alertas de stock.</p> : null}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ultimas ventas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-brand-light text-left text-brand-deep">
                  <th className="p-2">Numero</th>
                  <th className="p-2">Total</th>
                  <th className="p-2">Medio de pago</th>
                  <th className="p-2">Hora</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((s) => (
                  <tr key={s.id} className="border-b border-brand-light">
                    <td className="p-2">#{s.saleNumber}</td>
                    <td className="p-2">{money(s.total)}</td>
                    <td className="p-2">{s.paymentMethod}</td>
                    <td className="p-2">{new Date(s.soldAt).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
