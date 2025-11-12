import Link from 'next/link';

export function Sidebar() {
  return (
    <aside className="w-64 border-r bg-muted/40 p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold">GamePanel</h2>
      </div>
      <nav className="space-y-2">
        <Link
          href="/servers"
          className="block rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent"
        >
          Servers
        </Link>
        <Link
          href="/settings"
          className="block rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent"
        >
          Settings
        </Link>
      </nav>
    </aside>
  );
}
