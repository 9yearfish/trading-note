import { posts } from "#site/content";
import { PostCard } from "@/components/post-card";

interface HomeProps {
  searchParams: Promise<{ category?: string }>;
}

export default async function Home({ searchParams }: HomeProps) {
  const { category } = await searchParams;

  const sortedPosts = posts
    .filter((post) => !category || post.category === category)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div>
      {sortedPosts.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-lg">No posts yet</p>
          <p className="text-sm mt-2">
            Add .mdx files to content/posts/ to get started
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedPosts.map((post) => (
            <PostCard
              key={post.slug}
              title={post.title}
              slug={post.slug}
              date={post.date}
              category={post.category}
              tags={post.tags}
              excerpt={post.excerpt}
            />
          ))}
        </div>
      )}
    </div>
  );
}
