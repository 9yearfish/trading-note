import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";

const categories = [
  { label: "All", href: "/" },
  { label: "Strategy", href: "/?category=strategy" },
  { label: "Analysis", href: "/?category=analysis" },
  { label: "Journal", href: "/?category=journal" },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between mx-auto px-4">
        <Link href="/" className="font-bold text-lg">
          Trading Notes
        </Link>
        <nav className="flex items-center gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.label}
              href={cat.href}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {cat.label}
            </Link>
          ))}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
