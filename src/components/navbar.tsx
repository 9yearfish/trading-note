import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";
import { siteConfig } from "@/config/site";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between mx-auto px-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="font-bold text-lg">
            {siteConfig.name}
          </Link>
          <span className="text-muted-foreground/30 hidden sm:inline">|</span>
          <span className="text-sm text-muted-foreground hidden sm:inline">
            {siteConfig.slogan}
          </span>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
