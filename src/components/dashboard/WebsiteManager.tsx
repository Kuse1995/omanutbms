import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HeroAnnouncementsManager } from "./HeroAnnouncementsManager";
import { BlogManager } from "./BlogManager";
import { Globe, FileText, Megaphone } from "lucide-react";

export function WebsiteManager() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#003366]">Website Management</h1>
        <p className="text-[#004B8D]/60 mt-1">Manage your website content and blog posts</p>
      </div>

      <Tabs defaultValue="blog" className="w-full">
        <TabsList className="bg-[#004B8D]/10 p-1">
          <TabsTrigger
            value="blog"
            className="data-[state=active]:bg-white data-[state=active]:text-[#004B8D]"
          >
            <FileText className="h-4 w-4 mr-2" />
            Blog Posts
          </TabsTrigger>
          <TabsTrigger
            value="hero"
            className="data-[state=active]:bg-white data-[state=active]:text-[#004B8D]"
          >
            <Megaphone className="h-4 w-4 mr-2" />
            Hero Announcements
          </TabsTrigger>
        </TabsList>

        <TabsContent value="blog" className="mt-6">
          <BlogManager />
        </TabsContent>

        <TabsContent value="hero" className="mt-6">
          <HeroAnnouncementsManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
