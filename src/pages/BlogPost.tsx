import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PageTransition } from "@/components/PageTransition";
import { Loader2, Calendar, ArrowLeft } from "lucide-react";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  featured_image_url: string | null;
  published_at: string | null;
}

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchPost = async () => {
      if (!slug) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .single();

      if (error || !data) {
        setNotFound(true);
      } else {
        setPost(data);
      }
      setIsLoading(false);
    };

    fetchPost();
  }, [slug]);

  if (isLoading) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-gradient-to-b from-white via-[#E8F7FA] to-[#DFF0F5]">
          <Navbar />
          <main className="pt-24 pb-16 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#004B8D]" />
          </main>
          <Footer />
        </div>
      </PageTransition>
    );
  }

  if (notFound || !post) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-gradient-to-b from-white via-[#E8F7FA] to-[#DFF0F5]">
          <Navbar />
          <main className="pt-24 pb-16">
            <div className="container mx-auto px-4 text-center">
              <h1 className="text-3xl font-bold text-[#003366] mb-4">Post Not Found</h1>
              <p className="text-[#004B8D]/70 mb-8">The blog post you're looking for doesn't exist.</p>
              <Link
                to="/blog"
                className="inline-flex items-center text-[#004B8D] hover:underline"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Blog
              </Link>
            </div>
          </main>
          <Footer />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-b from-white via-[#E8F7FA] to-[#DFF0F5]">
        <Navbar />
        <main className="pt-24 pb-16">
          <article className="container mx-auto px-4 max-w-3xl">
            <Link
              to="/blog"
              className="inline-flex items-center text-[#004B8D] hover:underline mb-8"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Blog
            </Link>

            {post.featured_image_url && (
              <div className="aspect-video rounded-xl overflow-hidden mb-8 shadow-lg">
                <img
                  src={post.featured_image_url}
                  alt={post.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {post.published_at && (
              <div className="flex items-center gap-2 text-sm text-[#004B8D]/60 mb-4">
                <Calendar className="h-4 w-4" />
                {new Date(post.published_at).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </div>
            )}

            <h1 className="text-3xl md:text-4xl font-bold text-[#003366] mb-8">
              {post.title}
            </h1>

            <div className="prose prose-lg max-w-none text-[#003366]/80">
              {post.content.split("\n").map((paragraph, index) => (
                <p key={index} className="mb-4">
                  {paragraph}
                </p>
              ))}
            </div>
          </article>
        </main>
        <Footer />
      </div>
    </PageTransition>
  );
};

export default BlogPost;
