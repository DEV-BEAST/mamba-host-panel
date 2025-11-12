import Link from 'next/link';
import { Button } from '@gamePanel/ui';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="mb-6 text-6xl font-bold">GamePanel</h1>
        <p className="mb-8 text-xl text-muted-foreground">
          Modern game server management platform
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/login">
            <Button size="lg">Sign In</Button>
          </Link>
          <Link href="/register">
            <Button size="lg" variant="outline">
              Sign Up
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
