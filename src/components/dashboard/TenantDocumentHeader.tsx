import { useBusinessConfig } from "@/hooks/useBusinessConfig";

interface TenantDocumentHeaderProps {
  documentType: "INVOICE" | "QUOTATION" | "RECEIPT" | "PAYSLIP" | "EXPENSE RECORD" | "WASH FORUM RECORD" | string;
  documentNumber?: string;
  variant?: "default" | "centered";
  sourceReference?: string | null;
  showBankDetails?: boolean;
}

/**
 * Dynamic document header that uses tenant branding from business profile
 * Replaces hard-coded branding with configurable tenant information
 */
export function TenantDocumentHeader({ 
  documentType, 
  documentNumber, 
  variant = "default",
  sourceReference,
  showBankDetails = false
}: TenantDocumentHeaderProps) {
  const { 
    companyName, 
    tagline, 
    logoUrl, 
    companyEmail, 
    companyPhone,
    companyAddress,
    tpinNumber,
    bankName,
    bankAccountName,
    bankAccountNumber,
    bankBranch,
    bankSwiftCode
  } = useBusinessConfig();

  const displayName = companyName || "Your Company";
  const displayTagline = tagline || "";
  const contactInfo = [companyEmail, companyPhone].filter(Boolean).join(" | ");
  const hasBankDetails = bankName && bankAccountNumber;

  if (variant === "centered") {
    return (
      <div className="text-center border-b pb-4">
        {logoUrl && (
          <div className="flex justify-center mb-3">
            <img src={logoUrl} alt={displayName} className="h-16 w-auto" crossOrigin="anonymous" />
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
          {companyAddress && (
            <p className="text-xs text-gray-500 mt-1">{companyAddress}</p>
          )}
          {contactInfo && (
            <p className="text-xs text-gray-500">{contactInfo}</p>
          )}
          {tpinNumber && (
            <p className="text-xs text-gray-500">TPIN: {tpinNumber}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          {logoUrl && (
            <img src={logoUrl} alt={displayName} className="h-16 w-auto" crossOrigin="anonymous" />
          )}
          <div>
            <h1 className="text-2xl font-bold text-[#004B8D]">{displayName}</h1>
            {displayTagline && (
              <p className="text-gray-600 text-sm">{displayTagline}</p>
            )}
            {companyAddress && (
              <p className="text-gray-500 text-xs mt-1">{companyAddress}</p>
            )}
            {contactInfo && (
              <p className="text-gray-500 text-xs">{contactInfo}</p>
            )}
            {tpinNumber && (
              <p className="text-gray-500 text-xs font-medium">TPIN: {tpinNumber}</p>
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

      {/* Bank Details Section */}
      {showBankDetails && hasBankDetails && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm font-semibold text-gray-700 mb-2">Banking Details</p>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs text-gray-600">
            <div className="flex justify-between">
              <span className="text-gray-500">Bank:</span>
              <span className="font-medium">{bankName}</span>
            </div>
            {bankBranch && (
              <div className="flex justify-between">
                <span className="text-gray-500">Branch:</span>
                <span className="font-medium">{bankBranch}</span>
              </div>
            )}
            {bankAccountName && (
              <div className="flex justify-between">
                <span className="text-gray-500">Account Name:</span>
                <span className="font-medium">{bankAccountName}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Account No:</span>
              <span className="font-medium">{bankAccountNumber}</span>
            </div>
            {bankSwiftCode && (
              <div className="flex justify-between">
                <span className="text-gray-500">SWIFT:</span>
                <span className="font-medium">{bankSwiftCode}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Standalone bank details component for use in document footers
 */
export function DocumentBankDetails() {
  const { 
    bankName,
    bankAccountName,
    bankAccountNumber,
    bankBranch,
    bankSwiftCode
  } = useBusinessConfig();

  const hasBankDetails = bankName && bankAccountNumber;

  if (!hasBankDetails) return null;

  return (
    <div className="mt-6 pt-4 border-t border-gray-200">
      <p className="text-sm font-semibold text-gray-700 mb-2">Banking Details for Payment</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 text-sm text-gray-600">
        <div>
          <span className="text-gray-500">Bank: </span>
          <span className="font-medium">{bankName}</span>
        </div>
        {bankBranch && (
          <div>
            <span className="text-gray-500">Branch: </span>
            <span className="font-medium">{bankBranch}</span>
          </div>
        )}
        {bankAccountName && (
          <div>
            <span className="text-gray-500">Account Name: </span>
            <span className="font-medium">{bankAccountName}</span>
          </div>
        )}
        <div>
          <span className="text-gray-500">Account Number: </span>
          <span className="font-medium">{bankAccountNumber}</span>
        </div>
        {bankSwiftCode && (
          <div>
            <span className="text-gray-500">SWIFT/BIC: </span>
            <span className="font-medium">{bankSwiftCode}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Compliance footer with company address and TPIN for official documents
 */
export function DocumentComplianceFooter() {
  const { 
    companyName,
    companyAddress,
    companyPhone,
    companyEmail,
    tpinNumber
  } = useBusinessConfig();

  const hasComplianceInfo = companyAddress || tpinNumber;

  if (!hasComplianceInfo) return null;

  return (
    <div className="mt-8 pt-4 border-t border-gray-300 text-center text-xs text-gray-500">
      <p className="font-medium text-gray-700">{companyName}</p>
      {companyAddress && <p className="mt-1">{companyAddress}</p>}
      <div className="mt-1 flex flex-wrap justify-center gap-x-4">
        {companyPhone && <span>Tel: {companyPhone}</span>}
        {companyEmail && <span>Email: {companyEmail}</span>}
      </div>
      {tpinNumber && (
        <p className="mt-2 font-medium text-gray-600">TPIN: {tpinNumber}</p>
      )}
    </div>
  );
}
