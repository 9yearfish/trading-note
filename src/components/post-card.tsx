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
    <Link href={`/posts/${slug}`}>
      <Card className="h-full hover:border-foreground/20 transition-colors cursor-pointer">
        <CardHeader className="pb-3">
          <span className="text-xs text-muted-foreground">
            {new Date(date).toLocaleDateString("zh-CN")}
          </span>
          <CardTitle className="text-lg leading-tight">{title}</CardTitle>
        </CardHeader>
        {excerpt && (
          <CardContent>
            <p className="text-sm text-muted-foreground">{excerpt}</p>
          </CardContent>
        )}
      </Card>
    </Link>
  );
}
