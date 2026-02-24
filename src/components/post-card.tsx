import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface PostCardProps {
  title: string;
  slug: string;
  date: string;
  tags: string[];
}

export function PostCard({ title, slug, date, tags }: PostCardProps) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3 border-b last:border-b-0">
      <div className="flex items-baseline gap-3 min-w-0">
        <Link
          href={`/posts/${slug}`}
          className="font-medium hover:underline truncate shrink-0"
        >
          {title}
        </Link>
        <div className="flex flex-wrap gap-1 shrink-0">
          {tags.map((tag) => (
            <Link key={tag} href={`/?tag=${encodeURIComponent(tag)}`}>
              <Badge
                variant="secondary"
                className="text-xs cursor-pointer hover:bg-secondary/80"
              >
                {tag}
              </Badge>
            </Link>
          ))}
        </div>
      </div>
      <span className="text-sm text-muted-foreground whitespace-nowrap shrink-0">
        {new Date(date).toLocaleDateString("zh-CN")}
      </span>
    </div>
  );
}
