import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PostCardProps {
  title: string;
  slug: string;
  date: string;
  excerpt?: string;
}

export function PostCard({ title, slug, date, excerpt }: PostCardProps) {
  return (
    <Link href={`/posts/${slug}`} className="group">
      <Card className="h-full transition-all duration-200 cursor-pointer hover:border-foreground/20 hover:shadow-md hover:-translate-y-0.5">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg leading-tight">{title}</CardTitle>
            <span className="text-xs text-muted-foreground whitespace-nowrap ml-3">
              {new Date(date).toLocaleDateString("zh-CN")}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {excerpt && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {excerpt}
            </p>
          )}
          <span className="text-xs text-muted-foreground">
            阅读全文 →
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}
