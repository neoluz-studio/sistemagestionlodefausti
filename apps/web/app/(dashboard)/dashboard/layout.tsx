import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const session = cookieStore.get('lf_session');
  if (!session) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-brand-snow">
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 p-6">
          <Topbar />
          {children}
        </main>
      </div>
    </div>
  );
}
