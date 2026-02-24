import { posts } from "#site/content";
import { PostCard } from "@/components/post-card";
import Link from "next/link";

interface HomeProps {
  searchParams: Promise<{ tag?: string }>;
}

export default async function Home({ searchParams }: HomeProps) {
  const { tag } = await searchParams;

  // Collect all unique tags
  const allTags = Array.from(new Set(posts.flatMap((post) => post.tags))).sort();

  const sortedPosts = posts
    .filter((post) => !tag || post.tags.includes(tag))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div>
      {/* Tag filter bar */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <Link
            href="/"
            className={`px-3 py-1 rounded-full text-sm border transition-colors ${
              !tag
                ? "bg-foreground text-background border-foreground"
                : "bg-transparent text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            All
          </Link>
          {allTags.map((t) => (
            <Link
              key={t}
              href={`/?tag=${encodeURIComponent(t)}`}
              className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                tag === t
                  ? "bg-foreground text-background border-foreground"
                  : "bg-transparent text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              {t}
            </Link>
          ))}
        </div>
      )}

      {/* Post list */}
      {sortedPosts.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-lg">No posts yet</p>
          <p className="text-sm mt-2">
            Add .mdx files to content/posts/ to get started
          </p>
        </div>
      ) : (
        <div>
          {sortedPosts.map((post) => (
            <PostCard
              key={post.slug}
              title={post.title}
              slug={post.slug}
              date={post.date}
              tags={post.tags}
            />
          ))}
        </div>
      )}
    </div>
  );
}
