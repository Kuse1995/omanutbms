import { useState, useCallback } from "react";
import { Camera, Upload, X, Sparkles, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";

interface SketchUploaderProps {
  sketchUrls: string[];
  referenceNotes: string;
  generatedImages: { view: string; imageUrl: string }[];
  designType: string;
  fabric: string;
  color: string;
  styleNotes: string;
  onSketchUrlsChange: (urls: string[]) => void;
  onReferenceNotesChange: (notes: string) => void;
  onGeneratedImagesChange: (images: { view: string; imageUrl: string }[]) => void;
}

export function SketchUploader({
  sketchUrls,
  referenceNotes,
  generatedImages,
  designType,
  fabric,
  color,
  styleNotes,
  onSketchUrlsChange,
  onReferenceNotesChange,
  onGeneratedImagesChange,
}: SketchUploaderProps) {
  const { toast } = useToast();
  const { tenantId } = useTenant();
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const uploadFile = async (file: File): Promise<string | null> => {
    if (!tenantId) return null;
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${tenantId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('design-assets')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Upload error:', error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('design-assets')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  };

  const handleFiles = async (files: FileList | File[]) => {
    setIsUploading(true);
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => 
      file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024
    );

    if (validFiles.length === 0) {
      toast({
        title: "Invalid files",
        description: "Please upload image files under 10MB",
        variant: "destructive",
      });
      setIsUploading(false);
      return;
    }

    try {
      const uploadPromises = validFiles.map(file => uploadFile(file));
      const urls = await Promise.all(uploadPromises);
      const successfulUrls = urls.filter((url): url is string => url !== null);
      
      if (successfulUrls.length > 0) {
        onSketchUrlsChange([...sketchUrls, ...successfulUrls]);
        toast({
          title: "Upload successful",
          description: `${successfulUrls.length} image(s) uploaded`,
        });
      }
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Could not upload images. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [sketchUrls]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const removeSketch = (index: number) => {
    const newUrls = sketchUrls.filter((_, i) => i !== index);
    onSketchUrlsChange(newUrls);
  };

  const generateOutfitViews = async () => {
    if (!designType || !fabric || !color) {
      toast({
        title: "Missing design details",
        description: "Please fill in design type, fabric, and color first",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      // Convert the first sketch to base64 if available
      let sketchBase64: string | undefined;
      if (sketchUrls.length > 0) {
        try {
          const response = await fetch(sketchUrls[0]);
          const blob = await response.blob();
          const reader = new FileReader();
          sketchBase64 = await new Promise((resolve) => {
            reader.onloadend = () => {
              const result = reader.result as string;
              resolve(result.split(',')[1]);
            };
            reader.readAsDataURL(blob);
          });
        } catch (e) {
          console.warn('Could not convert sketch to base64, using URL');
        }
      }

      const { data, error } = await supabase.functions.invoke('generate-outfit-views', {
        body: {
          sketchUrl: sketchUrls[0],
          sketchBase64,
          designType,
          fabric,
          color,
          styleNotes: `${styleNotes} ${referenceNotes}`.trim(),
        }
      });

      if (error) throw error;

      if (data.images && data.images.length > 0) {
        onGeneratedImagesChange(data.images);
        toast({
          title: "Outfit views generated!",
          description: `Created ${data.images.length} professional views of your design`,
        });
      } else if (data.error) {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: "Generation failed",
        description: error.message || "Could not generate outfit views. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const VIEW_LABELS: Record<string, string> = {
    'front': 'Front View',
    'back': 'Back View',
    'side-left': 'Left Side',
    'side-right': 'Right Side',
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div>
        <Label className="mb-2 block">Upload Sketches & References</Label>
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragActive 
              ? 'border-primary bg-primary/5' 
              : 'border-muted-foreground/30 hover:border-primary/50'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Camera className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground mb-3">
            Drag and drop sketches or reference images here
          </p>
          <label>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileInput}
              disabled={isUploading}
            />
            <Button 
              variant="outline" 
              size="sm" 
              disabled={isUploading}
              asChild
            >
              <span className="cursor-pointer">
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Browse Files
                  </>
                )}
              </span>
            </Button>
          </label>
        </div>
      </div>

      {/* Uploaded Sketches */}
      {sketchUrls.length > 0 && (
        <div>
          <Label className="mb-2 block">Uploaded Sketches ({sketchUrls.length})</Label>
          <div className="grid grid-cols-3 gap-3">
            {sketchUrls.map((url, index) => (
              <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border">
                <img 
                  src={url} 
                  alt={`Sketch ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => removeSketch(index)}
                  className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reference Notes */}
      <div>
        <Label htmlFor="referenceNotes">Reference Notes</Label>
        <Textarea
          id="referenceNotes"
          value={referenceNotes}
          onChange={(e) => onReferenceNotesChange(e.target.value)}
          placeholder="Describe any reference images, celebrity looks, or inspiration..."
          rows={3}
        />
      </div>

      {/* AI Generation Section */}
      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <Label className="text-base font-medium">AI Outfit Visualization</Label>
            <p className="text-sm text-muted-foreground">
              Generate professional mannequin views from your design
            </p>
          </div>
          <Button
            onClick={generateOutfitViews}
            disabled={isGenerating || !designType || !fabric || !color}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Views
              </>
            )}
          </Button>
        </div>

        {/* Generated Images */}
        {generatedImages.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Generated Outfit Views</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={generateOutfitViews}
                disabled={isGenerating}
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Regenerate
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {generatedImages.map((img, index) => (
                <div key={index} className="relative aspect-[3/4] rounded-lg overflow-hidden border bg-muted">
                  <img 
                    src={img.imageUrl} 
                    alt={VIEW_LABELS[img.view] || img.view}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                    <span className="text-xs text-white font-medium">
                      {VIEW_LABELS[img.view] || img.view}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!generatedImages.length && !isGenerating && (
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <Sparkles className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">
              Upload a sketch or just describe your design, then click "Generate Views" to see your outfit on a mannequin from all angles.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
