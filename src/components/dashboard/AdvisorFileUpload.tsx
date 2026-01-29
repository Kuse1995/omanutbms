import { useRef, useState } from "react";
import { Paperclip, X, FileText, Image, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DOCUMENT_ACCEPT, isFileSupported, detectFileType } from "@/lib/document-parser";

export interface UploadedFile {
  file: File;
  preview?: string;
  type: "word" | "pdf" | "image" | "unknown";
}

interface AdvisorFileUploadProps {
  onFileSelect: (file: UploadedFile) => void;
  onClear: () => void;
  selectedFile: UploadedFile | null;
  disabled?: boolean;
  isProcessing?: boolean;
  className?: string;
}

export function AdvisorFileUpload({
  onFileSelect,
  onClear,
  selectedFile,
  disabled = false,
  isProcessing = false,
  className,
}: AdvisorFileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    if (!disabled && !isProcessing) {
      inputRef.current?.click();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setError(null);

    if (!file) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError("File too large (max 10MB)");
      return;
    }

    // Validate file type
    if (!isFileSupported(file)) {
      setError("Unsupported file type");
      return;
    }

    const fileType = detectFileType(file);
    let preview: string | undefined;

    // Create preview for images
    if (fileType === "image") {
      preview = URL.createObjectURL(file);
    }

    onFileSelect({ file, preview, type: fileType });

    // Reset input
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const getFileIcon = () => {
    if (!selectedFile) return <Paperclip className="h-4 w-4" />;

    switch (selectedFile.type) {
      case "image":
        return <Image className="h-4 w-4" />;
      case "pdf":
      case "word":
        return <FileText className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  if (selectedFile) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="flex items-center gap-2 px-2 py-1 bg-muted rounded-md text-xs max-w-[160px]">
          {isProcessing ? (
            <Loader2 className="h-3 w-3 animate-spin text-primary flex-shrink-0" />
          ) : (
            <span className="text-muted-foreground flex-shrink-0">{getFileIcon()}</span>
          )}
          <span className="truncate">{selectedFile.file.name}</span>
          {!isProcessing && (
            <Button
              size="icon"
              variant="ghost"
              className="h-4 w-4 p-0 flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept={DOCUMENT_ACCEPT}
        onChange={handleChange}
        className="hidden"
        disabled={disabled || isProcessing}
      />
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
        onClick={handleClick}
        disabled={disabled || isProcessing}
        title="Attach document"
      >
        <Paperclip className="h-4 w-4" />
      </Button>
      {error && <span className="text-xs text-destructive ml-1">{error}</span>}
    </div>
  );
}
