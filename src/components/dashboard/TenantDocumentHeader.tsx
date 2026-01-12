import { useBusinessConfig } from "@/hooks/useBusinessConfig";

interface TenantDocumentHeaderProps {
  documentType: "INVOICE" | "QUOTATION" | "RECEIPT" | "PAYSLIP" | "EXPENSE RECORD" | "WASH FORUM RECORD" | string;
  documentNumber?: string;
  variant?: "default" | "centered";
  sourceReference?: string | null;
}

/**
 * Dynamic document header that uses tenant branding from business profile
 * Replaces hard-coded branding with configurable tenant information
 */
export function TenantDocumentHeader({ 
  documentType, 
  documentNumber, 
  variant = "default",
  sourceReference 
}: TenantDocumentHeaderProps) {
  const { 
    companyName, 
    tagline, 
    logoUrl, 
    companyEmail, 
    companyPhone 
  } = useBusinessConfig();

  const displayName = companyName || "Your Company";
  const displayTagline = tagline || "";
  const contactInfo = [companyEmail, companyPhone].filter(Boolean).join(" | ");

  if (variant === "centered") {
    return (
      <div className="text-center border-b pb-4">
        {logoUrl && (
          <div className="flex justify-center mb-3">
            <img src={logoUrl} alt={displayName} className="h-16 w-auto" />
          </div>
        )}
        <h2 className="text-2xl font-bold text-[#004B8D]">
          {documentType === "RECEIPT" ? "PAYMENT RECEIPT" : documentType}
        </h2>
        {documentNumber && <p className="text-gray-600">{documentNumber}</p>}
        <div className="mt-2">
          <h3 className="font-bold">{displayName}</h3>
          {displayTagline && (
            <p className="text-sm text-gray-600">{displayTagline}</p>
          )}
          {contactInfo && (
            <p className="text-xs text-gray-500">{contactInfo}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-between items-start mb-8">
      <div className="flex items-center gap-3">
        {logoUrl && (
          <img src={logoUrl} alt={displayName} className="h-16 w-auto" />
        )}
        <div>
          <h1 className="text-2xl font-bold text-[#004B8D]">{displayName}</h1>
          {displayTagline && (
            <p className="text-gray-600 text-sm">{displayTagline}</p>
          )}
          {contactInfo && (
            <p className="text-gray-500 text-xs">{contactInfo}</p>
          )}
        </div>
      </div>
      <div className="text-right">
        <h2 className="text-3xl font-light text-gray-800">{documentType}</h2>
        {documentNumber && <p className="text-gray-500">{documentNumber}</p>}
        {sourceReference && (
          <p className="text-xs text-blue-600 mt-1">Converted from: {sourceReference}</p>
        )}
      </div>
    </div>
  );
}
