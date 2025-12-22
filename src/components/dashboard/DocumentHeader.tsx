import finchLogo from "@/assets/finch-investments-logo.png";

interface DocumentHeaderProps {
  documentType: "INVOICE" | "QUOTATION" | "RECEIPT";
  documentNumber: string;
  variant?: "default" | "centered";
  sourceReference?: string | null;
}

export function DocumentHeader({ 
  documentType, 
  documentNumber, 
  variant = "default",
  sourceReference 
}: DocumentHeaderProps) {
  if (variant === "centered") {
    return (
      <div className="text-center border-b pb-4">
        <div className="flex justify-center mb-3">
          <img src={finchLogo} alt="Finch Investments" className="h-16 w-auto" />
        </div>
        <h2 className="text-2xl font-bold text-[#004B8D]">{documentType === "RECEIPT" ? "PAYMENT RECEIPT" : documentType}</h2>
        <p className="text-gray-600">{documentNumber}</p>
        <div className="mt-2">
          <h3 className="font-bold">Finch Investments Limited</h3>
          <p className="text-sm text-gray-600">LifeStraw Distributor - Zambia</p>
          <p className="text-xs text-gray-500">info.finchinvestments@gmail.com | +260 956 905 652</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-between items-start mb-8">
      <div className="flex items-center gap-3">
        <img src={finchLogo} alt="Finch Investments" className="h-16 w-auto" />
        <div>
          <h1 className="text-2xl font-bold text-[#004B8D]">Finch Investments Ltd</h1>
          <p className="text-gray-600 text-sm">LifeStraw Distributor - Zambia</p>
          <p className="text-gray-500 text-xs">info.finchinvestments@gmail.com | +260 956 905 652</p>
        </div>
      </div>
      <div className="text-right">
        <h2 className="text-3xl font-light text-gray-800">{documentType}</h2>
        <p className="text-gray-500">{documentNumber}</p>
        {sourceReference && (
          <p className="text-xs text-blue-600 mt-1">Converted from: {sourceReference}</p>
        )}
      </div>
    </div>
  );
}
