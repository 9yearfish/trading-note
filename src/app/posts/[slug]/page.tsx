import { posts } from "#site/content";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { MDXContent } from "@/components/mdx-content";
import Link from "next/link";

interface PostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: PostPageProps) {
  const { slug } = await params;
  const post = posts.find((p) => p.slug === slug);
  if (!post) return {};
  return {
    title: `${post.title} - Trading Notes`,
    description: post.excerpt,
  };
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params;
  const post = posts.find((p) => p.slug === slug);

  if (!post) notFound();

  return (
    <article className="max-w-3xl mx-auto">
      <Link
        href="/"
        className="text-sm text-muted-foreground hover:text-foreground mb-6 inline-block"
      >
        &larr; Back
      </Link>
      <header className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="outline">{post.category}</Badge>
          <span className="text-sm text-muted-foreground">
            {new Date(post.date).toLocaleDateString("zh-CN")}
          </span>
        </div>
        <h1 className="text-3xl font-bold mb-3">{post.title}</h1>
        <div className="flex flex-wrap gap-1">
          {post.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </header>
      <div className="prose prose-neutral dark:prose-invert max-w-none">
        <MDXContent code={post.content} />
      </div>
    </article>
  );
}
