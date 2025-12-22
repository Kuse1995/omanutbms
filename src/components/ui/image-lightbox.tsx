import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageLightboxProps {
  src: string;
  alt: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ImageLightbox({ src, alt, isOpen, onClose }: ImageLightboxProps) {
  const [scale, setScale] = useState(1);

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.5, 3));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.5, 1));
  };

  const handleClose = () => {
    setScale(1);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none overflow-hidden">
        {/* Controls */}
        <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomOut}
            disabled={scale <= 1}
            className="bg-white/10 hover:bg-white/20 text-white"
          >
            <ZoomOut className="w-5 h-5" />
          </Button>
          <span className="text-white text-sm font-medium px-2">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomIn}
            disabled={scale >= 3}
            className="bg-white/10 hover:bg-white/20 text-white"
          >
            <ZoomIn className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="bg-white/10 hover:bg-white/20 text-white ml-2"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Image Container */}
        <div className="w-full h-[90vh] flex items-center justify-center overflow-auto p-8">
          <img
            src={src}
            alt={alt}
            className="max-w-full max-h-full object-contain transition-transform duration-300 ease-out cursor-zoom-in"
            style={{ transform: `scale(${scale})` }}
            onClick={scale < 3 ? handleZoomIn : handleZoomOut}
          />
        </div>

        {/* Hint */}
        <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-sm">
          Click image to zoom • Use controls to adjust
        </p>
      </DialogContent>
    </Dialog>
  );
}
