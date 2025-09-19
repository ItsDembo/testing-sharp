import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Search,
  Filter,
  Star,
  Users,
  Settings,
  TrendingUp,
  Target,
  BookOpen,
  Zap
} from 'lucide-react';
import { PresetCard } from '../components/presets/PresetCard';
import { PresetEditor } from '../components/presets/PresetEditor';
import { FeatureGate, useFeatureAccess } from '../components/FeatureGate';
import { BettingPreset, BUILTIN_PRESETS } from '../../../shared/presets';
import { toast } from 'sonner';

export default function PresetTerminal() {
  const [activeTab, setActiveTab] = useState('my-presets');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showEditor, setShowEditor] = useState(false);
  const [editingPreset, setEditingPreset] = useState<BettingPreset | undefined>();

  const queryClient = useQueryClient();
  const { hasFeature, canCreatePreset, getMaxPresets } = useFeatureAccess();

  // Mock data for now - in real app this would come from API
  const [userPresets, setUserPresets] = useState<BettingPreset[]>([]);
  const [favoritePresets, setFavoritePresets] = useState<string[]>([]);

  // Simulate API calls
  const { data: presets = [], isLoading } = useQuery({
    queryKey: ['presets', activeTab],
    queryFn: async () => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));

      switch (activeTab) {
        case 'my-presets':
          return userPresets;
        case 'favorites':
          return [...userPresets, ...BUILTIN_PRESETS].filter(p => favoritePresets.includes(p.id));
        case 'public':
          return BUILTIN_PRESETS;
        case 'community':
          return BUILTIN_PRESETS.filter(p => p.isPublic);
        default:
          return [];
      }
    },
    staleTime: 30000,
  });

  const createPresetMutation = useMutation({
    mutationFn: async (preset: Partial<BettingPreset>) => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      const newPreset: BettingPreset = {
        id: `user-${Date.now()}`,
        name: preset.name!,
        description: preset.description!,
        isPublic: preset.isPublic || false,
        createdBy: 'You',
        createdAt: new Date().toISOString(),
        filters: preset.filters!,
        bookWeighting: preset.bookWeighting!,
      };

      setUserPresets(prev => [...prev, newPreset]);
      return newPreset;
    },
    onSuccess: () => {
      toast.success('Preset created successfully!');
      setShowEditor(false);
      setEditingPreset(undefined);
      queryClient.invalidateQueries({ queryKey: ['presets'] });
    },
    onError: () => {
      toast.error('Failed to create preset');
    },
  });

  const updatePresetMutation = useMutation({
    mutationFn: async ({ id, preset }: { id: string; preset: Partial<BettingPreset> }) => {
      await new Promise(resolve => setTimeout(resolve, 1000));

      setUserPresets(prev => prev.map(p =>
        p.id === id ? { ...p, ...preset } : p
      ));
      return preset;
    },
    onSuccess: () => {
      toast.success('Preset updated successfully!');
      setShowEditor(false);
      setEditingPreset(undefined);
      queryClient.invalidateQueries({ queryKey: ['presets'] });
    },
    onError: () => {
      toast.error('Failed to update preset');
    },
  });

  const deletePresetMutation = useMutation({
    mutationFn: async (id: string) => {
      await new Promise(resolve => setTimeout(resolve, 500));
      setUserPresets(prev => prev.filter(p => p.id !== id));
    },
    onSuccess: () => {
      toast.success('Preset deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['presets'] });
    },
    onError: () => {
      toast.error('Failed to delete preset');
    },
  });

  const handleCreatePreset = () => {
    if (!canCreatePreset(userPresets.length)) {
      const maxPresets = getMaxPresets();
      if (maxPresets === -1) {
        toast.error('Please upgrade to create presets');
      } else {
        toast.error(`You can only create ${maxPresets} presets on your current plan. Upgrade to Pro for unlimited presets.`);
      }
      return;
    }
    setEditingPreset(undefined);
    setShowEditor(true);
  };

  const handleEditPreset = (preset: BettingPreset) => {
    setEditingPreset(preset);
    setShowEditor(true);
  };

  const handleSavePreset = (preset: Partial<BettingPreset>) => {
    if (editingPreset) {
      updatePresetMutation.mutate({ id: editingPreset.id, preset });
    } else {
      createPresetMutation.mutate(preset);
    }
  };

  const handleDeletePreset = (preset: BettingPreset) => {
    if (confirm(`Are you sure you want to delete "${preset.name}"?`)) {
      deletePresetMutation.mutate(preset.id);
    }
  };

  const handleDuplicatePreset = (preset: BettingPreset) => {
    if (!canCreatePreset(userPresets.length)) {
      const maxPresets = getMaxPresets();
      if (maxPresets === -1) {
        toast.error('Please upgrade to duplicate presets');
      } else {
        toast.error(`You can only create ${maxPresets} presets on your current plan. Upgrade to Pro for unlimited presets.`);
      }
      return;
    }

    const duplicated = {
      ...preset,
      name: `${preset.name} (Copy)`,
      id: undefined,
      createdBy: undefined,
      createdAt: undefined,
      isPublic: false,
    };
    createPresetMutation.mutate(duplicated);
  };

  const handleToggleFavorite = (preset: BettingPreset) => {
    setFavoritePresets(prev =>
      prev.includes(preset.id)
        ? prev.filter(id => id !== preset.id)
        : [...prev, preset.id]
    );
  };

  const handleLoadPreset = async (preset: BettingPreset) => {
    // Update last used timestamp
    if (userPresets.find(p => p.id === preset.id)) {
      setUserPresets(prev => prev.map(p =>
        p.id === preset.id ? { ...p, lastUsed: new Date().toISOString() } : p
      ));
    }

    toast.success(`Loaded preset: ${preset.name}`);
    // Here you would apply the preset to the trading terminal
  };

  const filteredPresets = presets.filter(preset => {
    const matchesSearch = preset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         preset.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'all' ||
                           preset.filters.categories.includes(selectedCategory);

    return matchesSearch && matchesCategory;
  });

  if (showEditor) {
    return (
      <div className="min-h-screen bg-white dark:bg-black pt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {editingPreset ? 'Edit Preset' : 'Create New Preset'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {editingPreset ? 'Modify your existing preset' : 'Build a custom trading strategy'}
            </p>
          </div>

          <PresetEditor
            preset={editingPreset}
            onSave={handleSavePreset}
            onCancel={() => {
              setShowEditor(false);
              setEditingPreset(undefined);
            }}
            isLoading={createPresetMutation.isPending || updatePresetMutation.isPending}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black pt-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-black dark:to-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-mono font-bold text-gray-900 dark:text-white">PRESET TERMINAL</h1>
              <p className="text-gray-600 dark:text-gray-400 font-mono text-sm mt-2">
                Advanced strategy builder and preset management system
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {userPresets.length} / {getMaxPresets() === -1 ? '∞' : getMaxPresets()} presets
              </div>
              <FeatureGate
                feature="maxPresets"
                requiredPlan="basic"
                showUpgrade={false}
                fallback={
                  <Button
                    disabled
                    className="bg-gray-400 text-gray-600 cursor-not-allowed"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Preset (Login Required)
                  </Button>
                }
              >
                <Button
                  onClick={handleCreatePreset}
                  disabled={!canCreatePreset(userPresets.length)}
                  className="bg-[#D8AC35] hover:bg-[#c49429] text-gray-900 font-semibold disabled:bg-gray-400 disabled:text-gray-600"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {canCreatePreset(userPresets.length) ? 'Create Preset' : 'Upgrade for More Presets'}
                </Button>
              </FeatureGate>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Tab Navigation */}
          <div className="flex items-center justify-between">
            <TabsList className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <TabsTrigger value="my-presets" className="flex items-center space-x-2">
                <Settings className="h-4 w-4" />
                <span>My Presets</span>
                {userPresets.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {userPresets.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="favorites" className="flex items-center space-x-2">
                <Star className="h-4 w-4" />
                <span>Favorites</span>
                {favoritePresets.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {favoritePresets.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="public" className="flex items-center space-x-2">
                <BookOpen className="h-4 w-4" />
                <span>Built-in</span>
              </TabsTrigger>
              <FeatureGate
                feature="publicPresetBrowsing"
                requiredPlan="basic"
                showUpgrade={false}
                fallback={
                  <TabsTrigger value="community" disabled className="opacity-50">
                    <Users className="h-4 w-4 mr-2" />
                    <span>Community</span>
                    <Badge variant="outline" className="ml-2 text-xs">Basic+</Badge>
                  </TabsTrigger>
                }
              >
                <TabsTrigger value="community" className="flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span>Community</span>
                </TabsTrigger>
              </FeatureGate>
            </TabsList>

            {/* Search and Filters */}
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search presets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <div className="flex space-x-2">
                  {['all', 'ev', 'arbitrage', 'middling'].map((category) => (
                    <Badge
                      key={category}
                      variant={selectedCategory === category ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => setSelectedCategory(category)}
                    >
                      {category === 'all' ? 'All' : category.toUpperCase()}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Tab Content */}
          <TabsContent value="my-presets" className="space-y-6">
            {userPresets.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Target className="h-16 w-16 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    No presets yet
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-center mb-6 max-w-md">
                    Create your first preset to save and reuse your favorite trading strategies.
                  </p>
                  <Button
                    onClick={handleCreatePreset}
                    className="bg-[#D8AC35] hover:bg-[#c49429] text-gray-900 font-semibold"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Preset
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPresets.map((preset) => (
                  <PresetCard
                    key={preset.id}
                    preset={preset}
                    onLoad={handleLoadPreset}
                    onEdit={handleEditPreset}
                    onDuplicate={handleDuplicatePreset}
                    onShare={() => toast.info('Share feature coming soon!')}
                    onDelete={handleDeletePreset}
                    onToggleFavorite={handleToggleFavorite}
                    isOwner={true}
                    isFavorite={favoritePresets.includes(preset.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="favorites" className="space-y-6">
            {favoritePresets.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Star className="h-16 w-16 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    No favorites yet
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-center max-w-md">
                    Star presets to add them to your favorites for quick access.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPresets.map((preset) => (
                  <PresetCard
                    key={preset.id}
                    preset={preset}
                    onLoad={handleLoadPreset}
                    onEdit={handleEditPreset}
                    onDuplicate={handleDuplicatePreset}
                    onShare={() => toast.info('Share feature coming soon!')}
                    onDelete={handleDeletePreset}
                    onToggleFavorite={handleToggleFavorite}
                    isOwner={userPresets.some(p => p.id === preset.id)}
                    isFavorite={true}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="public" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPresets.map((preset) => (
                <PresetCard
                  key={preset.id}
                  preset={preset}
                  onLoad={handleLoadPreset}
                  onEdit={() => {}}
                  onDuplicate={handleDuplicatePreset}
                  onShare={() => toast.info('Share feature coming soon!')}
                  onDelete={() => {}}
                  onToggleFavorite={handleToggleFavorite}
                  isOwner={false}
                  isFavorite={favoritePresets.includes(preset.id)}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="community" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPresets.map((preset) => (
                <PresetCard
                  key={preset.id}
                  preset={preset}
                  onLoad={handleLoadPreset}
                  onEdit={() => {}}
                  onDuplicate={handleDuplicatePreset}
                  onShare={() => toast.info('Share feature coming soon!')}
                  onDelete={() => {}}
                  onToggleFavorite={handleToggleFavorite}
                  isOwner={false}
                  isFavorite={favoritePresets.includes(preset.id)}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}