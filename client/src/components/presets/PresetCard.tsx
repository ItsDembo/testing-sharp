import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Edit, 
  Copy, 
  Share, 
  Trash2, 
  Star, 
  Users, 
  TrendingUp,
  Calendar,
  Target,
  MoreVertical
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { BettingPreset } from '../../../../shared/presets';
import { formatDistanceToNow } from 'date-fns';

interface PresetCardProps {
  preset: BettingPreset;
  onLoad: (preset: BettingPreset) => void;
  onEdit: (preset: BettingPreset) => void;
  onDuplicate: (preset: BettingPreset) => void;
  onShare: (preset: BettingPreset) => void;
  onDelete: (preset: BettingPreset) => void;
  onToggleFavorite?: (preset: BettingPreset) => void;
  isOwner: boolean;
  isFavorite?: boolean;
  className?: string;
}

export function PresetCard({
  preset,
  onLoad,
  onEdit,
  onDuplicate,
  onShare,
  onDelete,
  onToggleFavorite,
  isOwner,
  isFavorite = false,
  className
}: PresetCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleLoad = async () => {
    setIsLoading(true);
    try {
      await onLoad(preset);
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoryBadgeColor = (categories: string[]) => {
    if (categories.includes('arbitrage')) return 'bg-green-500 text-white';
    if (categories.includes('ev')) return 'bg-blue-500 text-white';
    if (categories.includes('middling')) return 'bg-purple-500 text-white';
    return 'bg-gray-500 text-white';
  };

  const getPerformanceColor = (performance?: { roi: number }) => {
    if (!performance) return 'text-gray-500';
    if (performance.roi > 5) return 'text-green-600';
    if (performance.roi > 0) return 'text-green-500';
    if (performance.roi > -5) return 'text-yellow-600';
    return 'text-red-500';
  };

  return (
    <Card className={`group hover:shadow-lg transition-all duration-200 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold truncate">
              {preset.name}
            </CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
              {preset.description}
            </p>
          </div>
          <div className="flex items-center space-x-2 ml-3">
            {onToggleFavorite && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggleFavorite(preset)}
                className={`p-1 ${isFavorite ? 'text-yellow-500' : 'text-gray-400'}`}
              >
                <Star className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="p-1">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onDuplicate(preset)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                {preset.isPublic && (
                  <DropdownMenuItem onClick={() => onShare(preset)}>
                    <Share className="h-4 w-4 mr-2" />
                    Share
                  </DropdownMenuItem>
                )}
                {isOwner && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onEdit(preset)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onDelete(preset)}
                      className="text-red-600 dark:text-red-400"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Preset Details */}
        <div className="space-y-3">
          {/* Categories */}
          <div className="flex flex-wrap gap-2">
            {preset.filters.categories.map((category) => (
              <Badge 
                key={category} 
                className={`text-xs ${getCategoryBadgeColor(preset.filters.categories)}`}
              >
                {category.toUpperCase()}
              </Badge>
            ))}
            {preset.filters.minEV > 0 && (
              <Badge variant="outline" className="text-xs">
                EV ≥ {preset.filters.minEV}%
              </Badge>
            )}
          </div>

          {/* Sports & Markets */}
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center space-x-4">
              <span>
                <strong>Sports:</strong> {
                  preset.filters.sports.includes('all') 
                    ? 'All Sports' 
                    : preset.filters.sports.slice(0, 3).join(', ') + 
                      (preset.filters.sports.length > 3 ? ` +${preset.filters.sports.length - 3}` : '')
                }
              </span>
            </div>
            <div className="flex items-center space-x-4 mt-1">
              <span>
                <strong>Markets:</strong> {
                  preset.filters.markets.includes('all') 
                    ? 'All Markets' 
                    : preset.filters.markets.slice(0, 2).join(', ') + 
                      (preset.filters.markets.length > 2 ? ` +${preset.filters.markets.length - 2}` : '')
                }
              </span>
            </div>
          </div>

          {/* Performance & Stats */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4">
              {preset.performance && (
                <div className="flex items-center space-x-1">
                  <TrendingUp className="h-4 w-4" />
                  <span className={getPerformanceColor(preset.performance)}>
                    {preset.performance.roi > 0 ? '+' : ''}{preset.performance.roi.toFixed(1)}% ROI
                  </span>
                </div>
              )}
              {preset.isPublic && (
                <div className="flex items-center space-x-1 text-gray-500">
                  <Users className="h-4 w-4" />
                  <span>Public</span>
                </div>
              )}
            </div>
            <div className="text-gray-500 text-xs">
              {preset.lastUsed ? (
                <div className="flex items-center space-x-1">
                  <Calendar className="h-3 w-3" />
                  <span>Used {formatDistanceToNow(new Date(preset.lastUsed))} ago</span>
                </div>
              ) : (
                <span>Never used</span>
              )}
            </div>
          </div>

          {/* Creator */}
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Created by <strong>{preset.createdBy}</strong> • {formatDistanceToNow(new Date(preset.createdAt))} ago
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-2 pt-2">
          <Button 
            onClick={handleLoad}
            disabled={isLoading}
            className="flex-1 bg-[#D8AC35] hover:bg-[#c49429] text-gray-900 font-semibold"
          >
            <Play className="h-4 w-4 mr-2" />
            {isLoading ? 'Loading...' : 'Load Preset'}
          </Button>
          {isOwner && (
            <Button 
              variant="outline" 
              onClick={() => onEdit(preset)}
              className="px-3"
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
