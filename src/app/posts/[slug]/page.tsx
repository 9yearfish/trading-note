import { posts } from "#site/content";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { MDXContent } from "@/components/mdx-content";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { AIQuiz } from "@/components/ai-quiz";

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
  const description = post.excerpt || siteConfig.description;
  return {
    title: post.title,
    description,
    openGraph: {
      title: post.title,
      description,
      type: "article",
      publishedTime: post.date,
      url: `${siteConfig.url}/posts/${slug}`,
    },
    twitter: {
      card: "summary",
      title: post.title,
      description,
    },
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
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        返回
      </Link>
      <header className="mb-10">
        <span className="text-sm text-muted-foreground">
          {new Date(post.date).toLocaleDateString("zh-CN")}
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold mt-3 mb-4 leading-tight">{post.title}</h1>
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {post.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </header>
      <div className="prose prose-neutral dark:prose-invert max-w-none">
        <MDXContent code={post.content} />
      </div>
      <AIQuiz slug={slug} />
    </article>
  );
}
