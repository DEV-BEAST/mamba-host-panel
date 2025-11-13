'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Server, Settings, CreditCard, FileText, Users } from 'lucide-react';
import { TenantSwitcher } from './tenant-switcher';
import { cn } from '@mambaPanel/ui';

const navigation = [
  { name: 'Servers', href: '/servers', icon: Server },
  { name: 'Billing', href: '/billing', icon: CreditCard },
  { name: 'Audit Logs', href: '/audit', icon: FileText },
  { name: 'Team', href: '/team', icon: Users },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r bg-muted/40 flex flex-col">
      <div className="p-6 border-b">
        <h2 className="text-2xl font-bold mb-4">Mamba Host</h2>
        <TenantSwitcher />
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
