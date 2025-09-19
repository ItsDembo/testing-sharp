import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Download, FileText, Table, Image } from 'lucide-react';
import { FeatureGate } from './FeatureGate';
import { BettingOpportunity } from '../../../shared/schema';
import { toast } from 'sonner';

interface ExportButtonProps {
  opportunities: BettingOpportunity[];
  className?: string;
}

export function ExportButton({ opportunities, className }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const exportToCSV = async () => {
    setIsExporting(true);
    try {
      // Create CSV headers
      const headers = [
        'Game',
        'Market',
        'Bet',
        'My Odds',
        'My Book',
        'Best Field Odds',
        'Best Field Book',
        'EV%',
        'Fair Probability',
        'Implied Probability',
        'Sport',
        'League',
        'Game Time',
        'Status',
        'Last Updated'
      ];

      // Convert opportunities to CSV rows
      const rows = opportunities.map(opp => [
        `"${opp.game || `${opp.event?.away} vs ${opp.event?.home}`}"`,
        `"${opp.market?.type || opp.bet || ''}"`,
        `"${opp.market?.side || opp.bet || ''}"`,
        opp.myPrice?.odds || '',
        `"${opp.myPrice?.book || opp.sportsbook || ''}"`,
        opp.fieldPrices?.[0]?.odds || '',
        `"${opp.fieldPrices?.[0]?.book || ''}"`,
        (opp.evPercent || opp.ev || 0).toFixed(2),
        (((opp as any).fairProbability || 0) * 100).toFixed(1),
        (((1 / ((opp.myPrice?.odds || 100) > 0 ? (opp.myPrice?.odds || 100) / 100 + 1 : 100 / Math.abs(opp.myPrice?.odds || 100) + 1)) * 100)).toFixed(1),
        `"${opp.event?.sport || opp.sport || ''}"`,
        `"${opp.event?.league || opp.league || ''}"`,
        `"${opp.event?.startTime || opp.gameTime || ''}"`,
        `"${opp.event?.status || 'prematch'}"`,
        `"${(opp as any).updatedAt || (opp as any).lastUpdated || ''}"`
      ]);

      // Combine headers and rows
      const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `sharp-shot-opportunities-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Exported ${opportunities.length} opportunities to CSV`);
    } catch (error) {
      toast.error('Failed to export data');
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const exportToJSON = async () => {
    setIsExporting(true);
    try {
      const jsonContent = JSON.stringify(opportunities, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `sharp-shot-opportunities-${new Date().toISOString().split('T')[0]}.json`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Exported ${opportunities.length} opportunities to JSON`);
    } catch (error) {
      toast.error('Failed to export data');
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const exportToTXT = async () => {
    setIsExporting(true);
    try {
      const txtContent = opportunities.map(opp => {
        return [
          `Game: ${opp.game || `${opp.event?.away} vs ${opp.event?.home}`}`,
          `Market: ${opp.market?.type || opp.bet || ''}`,
          `Bet: ${opp.market?.side || opp.bet || ''}`,
          `My Odds: ${opp.myPrice?.odds} (${opp.myPrice?.book || opp.sportsbook})`,
          `Best Field: ${opp.fieldPrices?.[0]?.odds} (${opp.fieldPrices?.[0]?.book})`,
          `EV: ${(opp.evPercent || opp.ev || 0).toFixed(2)}%`,
          `Sport: ${opp.event?.sport || opp.sport || ''}`,
          `Status: ${opp.event?.status || 'prematch'}`,
          `Updated: ${(opp as any).updatedAt || (opp as any).lastUpdated || ''}`,
          '---'
        ].join('\n');
      }).join('\n\n');

      const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `sharp-shot-opportunities-${new Date().toISOString().split('T')[0]}.txt`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Exported ${opportunities.length} opportunities to TXT`);
    } catch (error) {
      toast.error('Failed to export data');
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <FeatureGate 
      feature="exportToCsv" 
      requiredPlan="pro"
      showUpgrade={false}
      fallback={
        <Button 
          variant="outline" 
          size="sm" 
          disabled 
          className={`opacity-50 ${className}`}
        >
          <Download className="h-4 w-4 mr-2" />
          Export (Pro)
        </Button>
      }
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            disabled={isExporting || opportunities.length === 0}
            className={className}
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={exportToCSV} disabled={isExporting}>
            <Table className="h-4 w-4 mr-2" />
            Export as CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={exportToJSON} disabled={isExporting}>
            <FileText className="h-4 w-4 mr-2" />
            Export as JSON
          </DropdownMenuItem>
          <DropdownMenuItem onClick={exportToTXT} disabled={isExporting}>
            <FileText className="h-4 w-4 mr-2" />
            Export as TXT
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled className="text-gray-500">
            <Image className="h-4 w-4 mr-2" />
            Export as PDF (Coming Soon)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </FeatureGate>
  );
}
