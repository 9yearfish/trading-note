import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between mx-auto px-4">
        <Link href="/" className="font-bold text-lg">
          Trading Notes
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}
