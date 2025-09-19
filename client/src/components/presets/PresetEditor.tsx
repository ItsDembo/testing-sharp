import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Save, 
  X, 
  Plus, 
  Minus, 
  Settings, 
  Target,
  Filter,
  Zap
} from 'lucide-react';
import { BettingPreset, DEFAULT_BOOK_WEIGHTS } from '../../../../shared/presets';
import { FeatureGate } from '@/components/FeatureGate';

interface PresetEditorProps {
  preset?: BettingPreset;
  onSave: (preset: Partial<BettingPreset>) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const AVAILABLE_SPORTS = ['NBA', 'NFL', 'MLB', 'NHL', 'NCAAF', 'NCAAB', 'Soccer', 'Tennis', 'Golf', 'MMA'];
const AVAILABLE_CATEGORIES = ['ev', 'arbitrage', 'middling'];
const AVAILABLE_MARKETS = ['Player Props', 'Game Props', 'Futures', 'Moneyline', 'Spread', 'Total'];
const AVAILABLE_SPORTSBOOKS = Object.keys(DEFAULT_BOOK_WEIGHTS);

export function PresetEditor({ preset, onSave, onCancel, isLoading = false }: PresetEditorProps) {
  const [formData, setFormData] = useState<Partial<BettingPreset>>({
    name: '',
    description: '',
    isPublic: false,
    filters: {
      sports: ['all'],
      categories: ['all'],
      minEV: 0,
      maxEV: undefined,
      oddsRange: { min: -500, max: 500 },
      sportsbooks: ['all'],
      markets: ['all'],
      timeframe: 'today'
    },
    bookWeighting: { ...DEFAULT_BOOK_WEIGHTS }
  });

  useEffect(() => {
    if (preset) {
      setFormData({
        ...preset,
        filters: { ...preset.filters },
        bookWeighting: { ...preset.bookWeighting }
      });
    }
  }, [preset]);

  const handleSave = () => {
    onSave(formData);
  };

  const updateFilters = (key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      filters: {
        ...prev.filters!,
        [key]: value
      }
    }));
  };

  const updateBookWeight = (book: string, weight: number) => {
    setFormData(prev => ({
      ...prev,
      bookWeighting: {
        ...prev.bookWeighting!,
        [book]: weight
      }
    }));
  };

  const toggleArrayItem = (array: string[], item: string) => {
    if (item === 'all') {
      return ['all'];
    }
    
    const filtered = array.filter(i => i !== 'all');
    if (filtered.includes(item)) {
      const result = filtered.filter(i => i !== item);
      return result.length === 0 ? ['all'] : result;
    } else {
      return [...filtered, item];
    }
  };

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5 text-[#D8AC35]" />
            <span>Basic Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Preset Name</Label>
              <Input
                id="name"
                placeholder="My Trading Strategy"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timeframe">Timeframe</Label>
              <Select 
                value={formData.filters?.timeframe} 
                onValueChange={(value) => updateFilters('timeframe', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe your betting strategy..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          <FeatureGate 
            feature="presetSharing" 
            requiredPlan="pro"
            showUpgrade={false}
            fallback={
              <div className="flex items-center justify-between opacity-50">
                <div className="space-y-0.5">
                  <Label>Make Public</Label>
                  <p className="text-sm text-gray-600">Share with community</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch disabled checked={false} />
                  <Badge variant="outline" className="text-xs">Pro</Badge>
                </div>
              </div>
            }
          >
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Make Public</Label>
                <p className="text-sm text-gray-600">Share with community</p>
              </div>
              <Switch
                checked={formData.isPublic}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPublic: checked }))}
              />
            </div>
          </FeatureGate>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-[#D8AC35]" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Sports */}
          <div className="space-y-3">
            <Label>Sports</Label>
            <div className="flex flex-wrap gap-2">
              {['all', ...AVAILABLE_SPORTS].map((sport) => (
                <Badge
                  key={sport}
                  variant={formData.filters?.sports?.includes(sport) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => updateFilters('sports', toggleArrayItem(formData.filters?.sports || [], sport))}
                >
                  {sport === 'all' ? 'All Sports' : sport}
                </Badge>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div className="space-y-3">
            <Label>Categories</Label>
            <div className="flex flex-wrap gap-2">
              {['all', ...AVAILABLE_CATEGORIES].map((category) => (
                <Badge
                  key={category}
                  variant={formData.filters?.categories?.includes(category) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => updateFilters('categories', toggleArrayItem(formData.filters?.categories || [], category))}
                >
                  {category === 'all' ? 'All Categories' : category.toUpperCase()}
                </Badge>
              ))}
            </div>
          </div>

          {/* Markets */}
          <div className="space-y-3">
            <Label>Markets</Label>
            <div className="flex flex-wrap gap-2">
              {['all', ...AVAILABLE_MARKETS].map((market) => (
                <Badge
                  key={market}
                  variant={formData.filters?.markets?.includes(market) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => updateFilters('markets', toggleArrayItem(formData.filters?.markets || [], market))}
                >
                  {market === 'all' ? 'All Markets' : market}
                </Badge>
              ))}
            </div>
          </div>

          {/* EV Range */}
          <div className="space-y-3">
            <Label>Expected Value Range</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Minimum EV (%)</Label>
                <div className="space-y-2">
                  <Slider
                    value={[formData.filters?.minEV || 0]}
                    onValueChange={([value]) => updateFilters('minEV', value)}
                    max={20}
                    step={0.1}
                    className="w-full"
                  />
                  <div className="text-center text-sm font-mono">
                    {(formData.filters?.minEV || 0).toFixed(1)}%
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Maximum EV (%) - Optional</Label>
                <div className="space-y-2">
                  <Slider
                    value={[formData.filters?.maxEV || 50]}
                    onValueChange={([value]) => updateFilters('maxEV', value === 50 ? undefined : value)}
                    max={50}
                    step={0.1}
                    className="w-full"
                  />
                  <div className="text-center text-sm font-mono">
                    {formData.filters?.maxEV ? `${formData.filters.maxEV.toFixed(1)}%` : 'No limit'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Odds Range */}
          <div className="space-y-3">
            <Label>Odds Range</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Minimum Odds</Label>
                <Input
                  type="number"
                  value={formData.filters?.oddsRange?.min || -500}
                  onChange={(e) => updateFilters('oddsRange', {
                    ...formData.filters?.oddsRange,
                    min: parseInt(e.target.value)
                  })}
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Maximum Odds</Label>
                <Input
                  type="number"
                  value={formData.filters?.oddsRange?.max || 500}
                  onChange={(e) => updateFilters('oddsRange', {
                    ...formData.filters?.oddsRange,
                    max: parseInt(e.target.value)
                  })}
                  className="font-mono"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Book Weighting - Pro Feature */}
      <FeatureGate 
        feature="advancedBookWeighting" 
        requiredPlan="pro"
        featureName="Advanced Book Weighting"
        featureDescription="Customize the importance of different sportsbooks in your strategy"
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-[#D8AC35]" />
              <span>Book Weighting</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {AVAILABLE_SPORTSBOOKS.map((book) => (
                <div key={book} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm">{book}</Label>
                    <span className="text-sm font-mono">
                      {(formData.bookWeighting?.[book] || 1).toFixed(1)}x
                    </span>
                  </div>
                  <Slider
                    value={[formData.bookWeighting?.[book] || 1]}
                    onValueChange={([value]) => updateBookWeight(book, value)}
                    min={0.1}
                    max={2}
                    step={0.1}
                    className="w-full"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </FeatureGate>

      {/* Actions */}
      <div className="flex justify-end space-x-3">
        <Button variant="outline" onClick={onCancel} disabled={isLoading}>
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button 
          onClick={handleSave} 
          disabled={isLoading || !formData.name?.trim()}
          className="bg-[#D8AC35] hover:bg-[#c49429] text-gray-900"
        >
          <Save className="h-4 w-4 mr-2" />
          {isLoading ? 'Saving...' : 'Save Preset'}
        </Button>
      </div>
    </div>
  );
}
