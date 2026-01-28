import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import {
  calculateDepreciation,
  generateDepreciationSchedule,
  formatCurrency,
  type Asset,
} from "@/lib/asset-depreciation";

interface AssetDepreciationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: {
    id: string;
    name: string;
    category: string;
    purchase_date: string;
    purchase_cost: number;
    depreciation_method: string;
    useful_life_years: number;
    salvage_value: number;
    status: string;
  };
}

export function AssetDepreciationModal({ open, onOpenChange, asset }: AssetDepreciationModalProps) {
  const result = calculateDepreciation(asset as unknown as Asset);
  const schedule = generateDepreciationSchedule(asset as unknown as Asset);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Depreciation: {asset.name}
            <Badge variant="outline" className="ml-2">
              {asset.depreciation_method === "straight_line" ? "Straight-Line" : "Reducing Balance"}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground">Original Cost</div>
              <div className="text-lg font-bold">{formatCurrency(asset.purchase_cost)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground">Salvage Value</div>
              <div className="text-lg font-bold">{formatCurrency(asset.salvage_value)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground">Accumulated Depreciation</div>
              <div className="text-lg font-bold text-destructive">
                {formatCurrency(result.accumulatedDepreciation)}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-primary/5">
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground">Net Book Value</div>
              <div className="text-lg font-bold text-primary">{formatCurrency(result.netBookValue)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Depreciation Progress */}
        <div className="space-y-2 mb-6">
          <div className="flex justify-between text-sm">
            <span>Depreciation Progress</span>
            <span className="font-medium">{result.percentDepreciated.toFixed(1)}%</span>
          </div>
          <Progress value={result.percentDepreciated} className="h-3" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Purchased: {format(new Date(asset.purchase_date), "dd MMM yyyy")}</span>
            <span>
              {result.isFullyDepreciated
                ? "Fully Depreciated"
                : `${result.yearsRemaining.toFixed(1)} years remaining`}
            </span>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold">{formatCurrency(result.annualDepreciation)}</div>
            <div className="text-xs text-muted-foreground">Annual Depreciation</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{formatCurrency(result.monthlyDepreciation)}</div>
            <div className="text-xs text-muted-foreground">Monthly Depreciation</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{asset.useful_life_years}</div>
            <div className="text-xs text-muted-foreground">Useful Life (Years)</div>
          </div>
        </div>

        {/* Depreciation Schedule */}
        <div className="space-y-2">
          <h4 className="font-medium">Depreciation Schedule</h4>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Year</TableHead>
                  <TableHead className="text-right">Opening Value</TableHead>
                  <TableHead className="text-right">Depreciation</TableHead>
                  <TableHead className="text-right">Accumulated</TableHead>
                  <TableHead className="text-right">Closing Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedule.map((entry, idx) => {
                  const currentYear = new Date().getFullYear();
                  const entryYear = parseInt(entry.yearLabel);
                  const isCurrentYear = entryYear === currentYear;
                  const isPast = entryYear < currentYear;
                  
                  return (
                    <TableRow 
                      key={idx} 
                      className={isCurrentYear ? "bg-primary/5" : isPast ? "text-muted-foreground" : ""}
                    >
                      <TableCell className="font-medium">
                        {entry.yearLabel}
                        {isCurrentYear && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            Current
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(entry.openingValue)}</TableCell>
                      <TableCell className="text-right text-destructive">
                        ({formatCurrency(entry.depreciation)})
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(entry.accumulatedDepreciation)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(entry.closingValue)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Method Explanation */}
        <div className="mt-4 p-3 bg-muted/30 rounded-lg text-sm text-muted-foreground">
          {asset.depreciation_method === "straight_line" ? (
            <p>
              <strong>Straight-Line Method:</strong> Depreciation = (Cost - Salvage) ÷ Useful Life = (
              {formatCurrency(asset.purchase_cost)} - {formatCurrency(asset.salvage_value)}) ÷{" "}
              {asset.useful_life_years} = {formatCurrency(result.annualDepreciation)} per year.
            </p>
          ) : (
            <p>
              <strong>Reducing Balance Method (20%):</strong> Each year, 20% of the current Net Book Value is
              depreciated. This results in higher depreciation in early years and lower depreciation in later
              years, stopping when NBV reaches the salvage value.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
