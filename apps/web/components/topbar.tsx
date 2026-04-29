'use client';

import { useRouter } from 'next/navigation';
import { Button } from './ui/button';
import { useAuth } from '@/lib/use-auth';

export function Topbar() {
  const router = useRouter();
  const { user, logout } = useAuth();

  return (
    <header className="mb-6 flex items-center justify-between rounded-xl border border-brand-light bg-white px-4 py-3">
      <div>
        <p className="text-sm text-brand-mid">Usuario</p>
        <p className="font-semibold text-brand-deep">
          {user?.fullName ?? '-'} · {user?.role ?? '-'}
        </p>
      </div>
      <Button
        variant="outline"
        onClick={async () => {
          await logout();
          router.replace('/login');
        }}
      >
        Logout
      </Button>
    </header>
  );
}