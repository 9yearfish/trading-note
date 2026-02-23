import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PostCardProps {
  title: string;
  slug: string;
  date: string;
  category: string;
  tags: string[];
  excerpt?: string;
}

export function PostCard({ title, slug, date, category, tags, excerpt }: PostCardProps) {
  return (
    <Link href={`/posts/${slug}`}>
      <Card className="h-full hover:border-foreground/20 transition-colors cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="text-xs">
              {category}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {new Date(date).toLocaleDateString("zh-CN")}
            </span>
          </div>
          <CardTitle className="text-lg leading-tight">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          {excerpt && (
            <p className="text-sm text-muted-foreground mb-3">{excerpt}</p>
          )}
          <div className="flex flex-wrap gap-1">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
