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
        <CardHeader className="pb-3">
          <span className="text-xs text-muted-foreground">
            {new Date(date).toLocaleDateString("zh-CN")}
          </span>
          <CardTitle className="text-lg leading-tight">{title}</CardTitle>
        </CardHeader>
        {excerpt && (
          <CardContent>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {excerpt}
            </p>
          </CardContent>
        )}
        <CardContent className={excerpt ? "pt-0" : ""}>
          <span className="text-xs text-muted-foreground/0 group-hover:text-muted-foreground transition-colors duration-200">
            阅读全文 →
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}
