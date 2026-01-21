import { useState } from "react";
import { Store, Layers } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InventoryAgent } from "./InventoryAgent";
import { VariantsManager } from "./VariantsManager";
import { CollectionsManager } from "./CollectionsManager";
import { FeatureGuard } from "./FeatureGuard";
import { useFeatures } from "@/hooks/useFeatures";
import { useBusinessConfig } from "@/hooks/useBusinessConfig";

export function ShopManager() {
  const [activeTab, setActiveTab] = useState("products");
  const { terminology } = useFeatures();
  const { businessType } = useBusinessConfig();
  
  // Show collections tab for fashion/retail business types
  const showCollections = ['fashion', 'retail'].includes(businessType);

  return (
    <FeatureGuard feature="inventory" featureName="Shop Manager">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-display font-bold text-[#003366] flex items-center gap-2">
              <Store className="w-6 h-6 text-[#0077B6]" />
              Shop Manager
            </h2>
            <p className="text-[#004B8D]/60 mt-1">
              Manage {terminology.productsLabel.toLowerCase()}, {terminology.inventoryLabel.toLowerCase()}, colors, and sizes
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-[#004B8D]/10 border border-[#004B8D]/20">
            <TabsTrigger
              value="products"
              className="data-[state=active]:bg-[#004B8D] data-[state=active]:text-white"
            >
              {terminology.productsLabel} & {terminology.inventoryLabel}
            </TabsTrigger>
            <TabsTrigger
              value="variants"
              className="data-[state=active]:bg-[#004B8D] data-[state=active]:text-white"
            >
              Colors & Sizes
            </TabsTrigger>
            {showCollections && (
              <TabsTrigger
                value="collections"
                className="data-[state=active]:bg-[#004B8D] data-[state=active]:text-white"
              >
                <Layers className="w-4 h-4 mr-1" />
                Collections
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="products" className="mt-6">
            <InventoryAgent />
          </TabsContent>

          <TabsContent value="variants" className="mt-6">
            <VariantsManager />
          </TabsContent>

          {showCollections && (
            <TabsContent value="collections" className="mt-6">
              <CollectionsManager />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </FeatureGuard>
  );
}
