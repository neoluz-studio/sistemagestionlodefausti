'use client';

import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CashMovement, CashSession } from '@/lib/types';

function fmt(value: string | null | undefined) {
  return Number(value ?? '0').toFixed(2);
}

export default function CajaPage() {
  const [session, setSession] = useState<CashSession | null>(null);
  const [openingAmount, setOpeningAmount] = useState('');
  const [incomeAmount, setIncomeAmount] = useState('');
  const [incomeDescription, setIncomeDescription] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [countedAmount, setCountedAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const res = await api.get('/api/v1/cash-sessions/current');
    setSession((res.data.data ?? res.data) as CashSession | null);
  };

  useEffect(() => {
    void load();
  }, []);

  const movements = useMemo(() => (session?.movements ?? []) as CashMovement[], [session]);

  const openCash = async () => {
    if (!openingAmount) return;
    setLoading(true);
    try {
      await api.post('/api/v1/cash-sessions/open', { openingAmount });
      setOpeningAmount('');
      await load();
    } finally {
      setLoading(false);
    }
  };

  const addIncome = async () => {
    if (!incomeAmount) return;
    await api.post('/api/v1/cash-movements/income', { amount: incomeAmount, description: incomeDescription });
    setIncomeAmount('');
    setIncomeDescription('');
    await load();
  };

  const addExpense = async () => {
    if (!expenseAmount) return;
    await api.post('/api/v1/cash-movements/expense', { amount: expenseAmount, description: expenseDescription });
    setExpenseAmount('');
    setExpenseDescription('');
    await load();
  };

  const closeCash = async () => {
    if (!session || !countedAmount) return;
    await api.post(`/api/v1/cash-sessions/${session.id}/close`, { countedAmount });
    setCountedAmount('');
    await load();
  };

  if (!session) {
    return (
      <div className="space-y-6">
        <Card className="mx-auto max-w-xl">
          <CardHeader>
            <CardTitle className="text-3xl">Caja del dia</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-brand-deep">No hay caja abierta.</p>
            <Input
              className="h-14 text-2xl"
              placeholder="Monto inicial"
              value={openingAmount}
              onChange={(e) => setOpeningAmount(e.target.value)}
            />
            <Button className="h-16 w-full text-2xl" size="lg" onClick={openCash} disabled={loading}>
              {loading ? 'Abriendo...' : 'Abrir Caja'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const difference = Number(session.expectedAmount) - Number(countedAmount || '0');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Caja abierta</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-brand-light bg-brand-snow p-4">
            <p className="text-sm text-brand-mid">Apertura</p>
            <p className="text-3xl font-bold text-brand-deep">${fmt(session.openingAmount)}</p>
          </div>
          <div className="rounded-lg border border-brand-light bg-brand-snow p-4">
            <p className="text-sm text-brand-mid">Ingresos</p>
            <p className="text-3xl font-bold text-brand-deep">${fmt(session.totalIncomes)}</p>
          </div>
          <div className="rounded-lg border border-brand-light bg-brand-snow p-4">
            <p className="text-sm text-brand-mid">Egresos</p>
            <p className="text-3xl font-bold text-brand-deep">${fmt(session.totalExpenses)}</p>
          </div>
          <div className="rounded-lg border border-brand-light bg-brand-snow p-4">
            <p className="text-sm text-brand-mid">Saldo esperado</p>
            <p className="text-3xl font-bold text-brand-deep">${fmt(session.expectedAmount)}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registrar ingreso</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <Input placeholder="Monto" value={incomeAmount} onChange={(e) => setIncomeAmount(e.target.value)} />
          <Input
            placeholder="Descripcion"
            value={incomeDescription}
            onChange={(e) => setIncomeDescription(e.target.value)}
          />
          <Button onClick={addIncome}>Registrar Ingreso</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registrar egreso</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <Input placeholder="Monto" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} />
          <Input
            placeholder="Descripcion"
            value={expenseDescription}
            onChange={(e) => setExpenseDescription(e.target.value)}
          />
          <Button variant="outline" onClick={addExpense}>
            Registrar Egreso
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cerrar caja</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded border border-brand-light p-3">Esperado: ${fmt(session.expectedAmount)}</div>
            <Input placeholder="Monto real contado" value={countedAmount} onChange={(e) => setCountedAmount(e.target.value)} />
            <div className="rounded border border-brand-light p-3">Diferencia: ${difference.toFixed(2)}</div>
          </div>
          <Button className="w-full" onClick={closeCash}>
            Cerrar Caja
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Movimientos del dia</CardTitle>
        </CardHeader>
        <CardContent>
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
                {movements.map((m) => (
                  <tr key={m.id} className="border-b border-brand-light">
                    <td className="p-2">{new Date(m.createdAt).toLocaleTimeString()}</td>
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
    </div>
  );
}