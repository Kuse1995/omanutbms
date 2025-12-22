import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PageTransition } from "@/components/PageTransition";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Calendar, ArrowRight } from "lucide-react";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  featured_image_url: string | null;
  published_at: string | null;
}

const Blog = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, title, slug, excerpt, content, featured_image_url, published_at")
        .eq("status", "published")
        .order("published_at", { ascending: false });

      if (!error && data) {
        setPosts(data);
      }
      setIsLoading(false);
    };

    fetchPosts();
  }, []);

  const getExcerpt = (post: BlogPost) => {
    if (post.excerpt) return post.excerpt;
    return post.content.substring(0, 150) + (post.content.length > 150 ? "..." : "");
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-b from-white via-[#E8F7FA] to-[#DFF0F5]">
        <Navbar />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold text-[#003366] mb-4">
                Our Blog
              </h1>
              <p className="text-lg text-[#004B8D]/70 max-w-2xl mx-auto">
                Stories, updates, and insights about safe water access in Zambia
              </p>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-[#004B8D]" />
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-[#004B8D]/60 text-lg">No blog posts yet. Check back soon!</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {posts.map((post) => (
                  <Link key={post.id} to={`/blog/${post.slug}`}>
                    <Card className="overflow-hidden bg-white/80 backdrop-blur border-[#004B8D]/10 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 h-full">
                      {post.featured_image_url && (
                        <div className="aspect-video overflow-hidden">
                          <img
                            src={post.featured_image_url}
                            alt={post.title}
                            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                          />
                        </div>
                      )}
                      <CardContent className="p-6">
                        {post.published_at && (
                          <div className="flex items-center gap-2 text-sm text-[#004B8D]/60 mb-3">
                            <Calendar className="h-4 w-4" />
                            {new Date(post.published_at).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                          </div>
                        )}
                        <h2 className="text-xl font-semibold text-[#003366] mb-3 line-clamp-2">
                          {post.title}
                        </h2>
                        <p className="text-[#004B8D]/70 mb-4 line-clamp-3">
                          {getExcerpt(post)}
                        </p>
                        <div className="flex items-center text-[#004B8D] font-medium group">
                          Read More
                          <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-1" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </main>
        <Footer />
      </div>
    </PageTransition>
  );
};

export default Blog;
