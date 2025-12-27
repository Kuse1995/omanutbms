import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { guardTenant } from "@/lib/tenant-utils";
import { Plus, Edit, Trash2, Eye, Upload, Loader2, FileText, Send, Sparkles, Lock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  featured_image_url: string | null;
  status: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export function BlogManager() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiBrief, setAiBrief] = useState("");
  const { toast } = useToast();
  const { canAdd, isAdmin } = useAuth();
  const { tenantId } = useTenant();

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    excerpt: "",
    featured_image_url: "",
  });

  const fetchPosts = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching posts:", error);
      toast({
        title: "Error",
        description: "Failed to fetch blog posts",
        variant: "destructive",
      });
    } else {
      setPosts(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .substring(0, 100);
  };

  const handleOpenModal = (post?: BlogPost) => {
    if (post) {
      setEditingPost(post);
      setFormData({
        title: post.title,
        content: post.content,
        excerpt: post.excerpt || "",
        featured_image_url: post.featured_image_url || "",
      });
    } else {
      setEditingPost(null);
      setFormData({
        title: "",
        content: "",
        excerpt: "",
        featured_image_url: "",
      });
    }
    setIsModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("blog-images")
      .upload(fileName, file);

    if (uploadError) {
      console.error("Upload error:", uploadError);
      toast({
        title: "Upload failed",
        description: "Failed to upload image",
        variant: "destructive",
      });
    } else {
      const { data: { publicUrl } } = supabase.storage
        .from("blog-images")
        .getPublicUrl(fileName);

      setFormData({ ...formData, featured_image_url: publicUrl });
      toast({
        title: "Image uploaded",
        description: "Featured image uploaded successfully",
      });
    }
    setIsUploading(false);
  };

  const handleSave = async (publish: boolean) => {
    if (!guardTenant(tenantId)) return;
    
    if (!formData.title.trim() || !formData.content.trim()) {
      toast({
        title: "Validation Error",
        description: "Title and content are required",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    const { data: userData } = await supabase.auth.getUser();

    const postData = {
      title: formData.title.trim(),
      slug: editingPost?.slug || generateSlug(formData.title),
      content: formData.content.trim(),
      excerpt: formData.excerpt.trim() || null,
      featured_image_url: formData.featured_image_url || null,
      status: publish ? "published" : "draft",
      published_at: publish ? new Date().toISOString() : null,
      author_id: userData.user?.id,
      tenant_id: tenantId,
    };

    try {
      if (editingPost) {
        const { error } = await supabase
          .from("blog_posts")
          .update(postData)
          .eq("id", editingPost.id);

        if (error) throw error;

        toast({
          title: publish ? "Post Published" : "Draft Saved",
          description: `"${formData.title}" has been ${publish ? "published" : "saved as draft"}`,
        });
      } else {
        const { error } = await supabase
          .from("blog_posts")
          .insert(postData);

        if (error) throw error;

        toast({
          title: publish ? "Post Published" : "Draft Created",
          description: `"${formData.title}" has been ${publish ? "published" : "saved as draft"}`,
        });
      }

      setIsModalOpen(false);
      fetchPosts();
    } catch (error: any) {
      console.error("Error saving post:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save post",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAIGenerate = async () => {
    if (!formData.title.trim() && !aiBrief.trim()) {
      toast({
        title: "Add a bit more detail",
        description: "Please enter a title or short brief before asking AI to help.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("blog-writer", {
        body: {
          title: formData.title.trim() || undefined,
          prompt: aiBrief.trim() || undefined,
        },
      });

      if (error) {
        console.error("AI generate error", error);
        toast({
          title: "AI error",
          description: error.message || "Failed to generate a draft.",
          variant: "destructive",
        });
        return;
      }

      if (!data?.content) {
        toast({
          title: "No draft returned",
          description: "The AI did not return any content. Please try again.",
          variant: "destructive",
        });
        return;
      }

      setFormData((prev) => ({
        ...prev,
        content: data.content,
        excerpt: data.excerpt || prev.excerpt,
      }));

      toast({
        title: "Draft generated",
        description: "AI has created a draft. Review and edit before publishing.",
      });
    } catch (err: any) {
      console.error("Unexpected AI error", err);
      const message = err?.message || "Failed to contact AI service.";
      toast({
        title: "AI error",
        description: message.includes("402")
          ? "AI credits may be exhausted. Please check your workspace usage."
          : message.includes("429")
            ? "AI is receiving too many requests. Please try again shortly."
            : message,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };
  const handleDelete = async (post: BlogPost) => {
    if (!confirm(`Are you sure you want to delete "${post.title}"?`)) return;

    const { error } = await supabase
      .from("blog_posts")
      .delete()
      .eq("id", post.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete post",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Post Deleted",
        description: `"${post.title}" has been deleted`,
      });
      fetchPosts();
    }
  };

  const handlePublish = async (post: BlogPost) => {
    const newStatus = post.status === "published" ? "draft" : "published";
    const { error } = await supabase
      .from("blog_posts")
      .update({
        status: newStatus,
        published_at: newStatus === "published" ? new Date().toISOString() : null,
      })
      .eq("id", post.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update post status",
        variant: "destructive",
      });
    } else {
      toast({
        title: newStatus === "published" ? "Post Published" : "Post Unpublished",
        description: `"${post.title}" is now ${newStatus}`,
      });
      fetchPosts();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#003366]">Blog Manager</h2>
          <p className="text-[#004B8D]/60">Create and manage blog posts</p>
        </div>
        {canAdd && (
          <Button
            onClick={() => handleOpenModal()}
            className="bg-[#004B8D] hover:bg-[#003366] text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Post
          </Button>
        )}
      </div>

      <Card className="bg-white border-[#004B8D]/10">
        <CardHeader>
          <CardTitle className="text-[#003366] flex items-center gap-2">
            <FileText className="h-5 w-5" />
            All Posts ({posts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-[#004B8D]" />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-8 text-[#004B8D]/50">
              No blog posts yet. Create your first post!
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[#003366]">Title</TableHead>
                  <TableHead className="text-[#003366]">Status</TableHead>
                  <TableHead className="text-[#003366]">Created</TableHead>
                  <TableHead className="text-[#003366] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell className="font-medium text-[#003366]">
                      {post.title}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={post.status === "published" ? "default" : "secondary"}
                        className={
                          post.status === "published"
                            ? "bg-green-100 text-green-800"
                            : "bg-amber-100 text-amber-800"
                        }
                      >
                        {post.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[#004B8D]/70">
                      {new Date(post.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handlePublish(post)}
                                  className="border-[#004B8D]/20 text-[#004B8D]"
                                  disabled={!isAdmin}
                                >
                                  {post.status === "published" ? (
                                    <Eye className="h-4 w-4" />
                                  ) : (
                                    <Send className="h-4 w-4" />
                                  )}
                                </Button>
                              </span>
                            </TooltipTrigger>
                            {!isAdmin && <TooltipContent>Admin access required</TooltipContent>}
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenModal(post)}
                                  className="border-[#004B8D]/20 text-[#004B8D]"
                                  disabled={!isAdmin}
                                >
                                  {isAdmin ? <Edit className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                                </Button>
                              </span>
                            </TooltipTrigger>
                            {!isAdmin && <TooltipContent>Admin access required</TooltipContent>}
                          </Tooltip>
                        </TooltipProvider>
                        {isAdmin && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(post)}
                            className="border-red-200 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl bg-white border-[#004B8D]/20">
          <DialogHeader>
            <DialogTitle className="text-[#003366]">
              {editingPost ? "Edit Post" : "Create New Post"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-[#003366]">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter post title"
                className="bg-[#f0f7fa] border-[#004B8D]/20 text-[#003366]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="excerpt" className="text-[#003366]">Excerpt</Label>
              <Input
                id="excerpt"
                value={formData.excerpt}
                onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                placeholder="Brief summary for previews"
                className="bg-[#f0f7fa] border-[#004B8D]/20 text-[#003366]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content" className="text-[#003366]">Content *</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Write your blog content here or let AI help you draft it"
                className="bg-[#f0f7fa] border-[#004B8D]/20 text-[#003366] min-h-[200px]"
              />
              <div className="space-y-2 rounded-md border border-dashed border-[#004B8D]/30 bg-[#f0f7fa]/60 p-3">
                <div className="flex items-center gap-2 text-sm text-[#004B8D]">
                  <Sparkles className="h-4 w-4" />
                  <span>Need help drafting? Enter a short brief and let AI suggest a post.</span>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    placeholder="e.g. Impact of LifeStraw Community dispensers in rural schools"
                    value={aiBrief}
                    onChange={(e) => setAiBrief(e.target.value)}
                    className="bg-white/80 border-[#004B8D]/20 text-[#003366]"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAIGenerate}
                    disabled={isGenerating}
                    className="mt-1 sm:mt-0 bg-[#004B8D] hover:bg-[#003366] text-white whitespace-nowrap"
                  >
                    {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {!isGenerating && <Sparkles className="mr-2 h-4 w-4" />}
                    {isGenerating ? "Generating..." : "Generate with AI"}
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[#003366]">Featured Image</Label>
              <div className="flex items-center gap-4">
                <label className="cursor-pointer">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={isUploading}
                  />
                  <div className="flex items-center gap-2 px-4 py-2 border border-[#004B8D]/20 rounded-md hover:bg-[#f0f7fa] text-[#004B8D]">
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    {isUploading ? "Uploading..." : "Upload Image"}
                  </div>
                </label>
                {formData.featured_image_url && (
                  <img
                    src={formData.featured_image_url}
                    alt="Preview"
                    className="h-16 w-24 object-cover rounded border"
                  />
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="border-[#004B8D]/20 text-[#004B8D]"
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={() => handleSave(false)}
                disabled={isSubmitting}
                className="border-[#004B8D]/20 text-[#004B8D]"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Draft
              </Button>
              <Button
                onClick={() => handleSave(true)}
                disabled={isSubmitting}
                className="bg-[#004B8D] hover:bg-[#003366] text-white"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Publish
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
