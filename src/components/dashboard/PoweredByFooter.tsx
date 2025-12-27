import { useBranding } from '@/hooks/useBranding';
import { ExternalLink } from 'lucide-react';

interface PoweredByFooterProps {
  className?: string;
  variant?: 'light' | 'dark';
}

/**
 * Displays "Powered by Omanut" footer when white-label is disabled
 * Returns null when white-label is enabled
 */
export function PoweredByFooter({ className = '', variant = 'light' }: PoweredByFooterProps) {
  const { showPoweredBy, vendorName, vendorUrl } = useBranding();

  if (!showPoweredBy) {
    return null;
  }

  const textColor = variant === 'dark' ? 'text-muted-foreground' : 'text-white/50';
  const hoverColor = variant === 'dark' ? 'hover:text-foreground' : 'hover:text-white/80';

  return (
    <div className={`flex items-center justify-center gap-1 text-xs ${textColor} ${className}`}>
      <span>Powered by</span>
      <a
        href={vendorUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-0.5 font-medium ${hoverColor} transition-colors`}
      >
        {vendorName}
        <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  );
}
