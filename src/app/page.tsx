import { posts } from "#site/content";
import { PostCard } from "@/components/post-card";

export default async function Home() {
  const sortedPosts = posts
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
        <div className={`grid gap-6 max-w-4xl mx-auto ${sortedPosts.length <= 2 ? "grid-cols-1 max-w-xl" : "grid-cols-1 md:grid-cols-2"}`}>
          {sortedPosts.map((post) => (
            <PostCard
              key={post.slug}
              title={post.title}
              slug={post.slug}
              date={post.date}
              excerpt={post.excerpt}
            />
          ))}
        </div>
      )}
    </div>
  );
}
