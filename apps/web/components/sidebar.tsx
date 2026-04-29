import Link from 'next/link';
import { BarChart3, Boxes, LayoutDashboard, Package, Receipt, Users, Wallet } from 'lucide-react';

const links = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/ventas', label: 'Ventas', icon: Receipt },
  { href: '/dashboard/ventas/historial', label: 'Historial Ventas', icon: Receipt },
  { href: '/dashboard/caja', label: 'Caja', icon: Wallet },
  { href: '/dashboard/caja/historial', label: 'Historial Caja', icon: Wallet },
  { href: '/dashboard/productos', label: 'Productos', icon: Package },
  { href: '/dashboard/inventario', label: 'Inventario', icon: Boxes },
  { href: '/dashboard/clientes', label: 'Clientes', icon: Users },
  { href: '/dashboard/reportes', label: 'Reportes', icon: BarChart3 },
];

export function Sidebar() {
  return (
    <aside className="w-64 border-r border-brand-light bg-white p-4">
      <div className="mb-6 rounded-lg bg-brand-deep px-4 py-3 text-lg font-semibold text-white">
        LodeFausti
      </div>
      <nav className="space-y-1">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-brand-deep transition hover:bg-brand-light"
          >
            <Icon size={18} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
