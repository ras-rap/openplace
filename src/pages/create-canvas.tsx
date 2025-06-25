// pages/create-canvas.tsx
import { useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";
import { ArrowLeft, Palette, Settings, Lock, Eye } from "lucide-react";

const DEFAULT_COLORS = [
  "#FFFFFF", "#E4E4E4", "#888888", "#222222",
  "#FFA7D1", "#E50000", "#E59500", "#A06A42",
  "#E5D900", "#94E044", "#02BE01", "#00D3DD",
  "#0083C7", "#0000EA", "#CF6EE4", "#820080",
];

export default function CreateCanvas() {
  const router = useRouter();
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    width: 1000,
    height: 1000,
    placeCooldown: 5,
    password: "",
    backgroundColor: "#FFFFFF",
    gridColor: "#E0E0E0",
    showGrid: true,
    gridThreshold: 4,
    maxZoom: 32,
    minZoom: 0.1,
    restrictColors: false,
    allowedColors: DEFAULT_COLORS,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isCreating, setIsCreating] = useState(false);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const handleColorToggle = (color: string) => {
    setFormData(prev => ({
      ...prev,
      allowedColors: prev.allowedColors.includes(color)
        ? prev.allowedColors.filter(c => c !== color)
        : [...prev.allowedColors, color]
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Canvas name is required";
    }

    if (formData.width < 10 || formData.width > 5000) {
      newErrors.width = "Width must be between 10 and 5000 pixels";
    }

    if (formData.height < 10 || formData.height > 5000) {
      newErrors.height = "Height must be between 10 and 5000 pixels";
    }

    if (formData.placeCooldown < 0 || formData.placeCooldown > 3600) {
      newErrors.placeCooldown = "Cooldown must be between 0 and 3600 seconds";
    }

    if (formData.minZoom >= formData.maxZoom) {
      newErrors.maxZoom = "Max zoom must be greater than min zoom";
    }

    if (formData.restrictColors && formData.allowedColors.length === 0) {
      newErrors.allowedColors = "At least one color must be selected when restricting colors";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!validateForm()) {
    return;
  }

  setIsCreating(true);

  try {
    const response = await fetch('/api/canvas/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: formData.name,
        width: formData.width,
        height: formData.height,
        placeCooldown: formData.placeCooldown,
        password: formData.password || undefined,
        backgroundColor: formData.backgroundColor,
        gridColor: formData.gridColor,
        showGrid: formData.showGrid,
        gridThreshold: formData.gridThreshold,
        maxZoom: formData.maxZoom,
        minZoom: formData.minZoom,
        allowedColors: formData.restrictColors ? formData.allowedColors : undefined,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create canvas');
    }

    const { canvasId } = await response.json();
    
    // Redirect to the new canvas
    router.push(`/canvas/${canvasId}`);
  } catch (error) {
    console.error('Failed to create canvas:', error);
    setErrors({ submit: error instanceof Error ? error.message : 'Failed to create canvas. Please try again.' });
  } finally {
    setIsCreating(false);
  }
};

  return (
    <>
      <Head>
        <title>Create Canvas - OpenPlace</title>
        <meta name="description" content="Create a new collaborative pixel art canvas" />
      </Head>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <header className="border-b bg-background/80 py-4 backdrop-blur-sm">
          <div className="container mx-auto flex items-center justify-between px-4">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Create Canvas</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Configure your collaborative pixel art canvas
                </p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </header>

        <div className="container mx-auto max-w-4xl px-4 py-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>Basic Settings</span>
                </CardTitle>
                <CardDescription>
                  Configure the basic properties of your canvas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Canvas Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="My Awesome Canvas"
                      className={errors.name ? "border-red-500" : ""}
                    />
                    {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
                  </div>
                  
                  <div>
                    <Label htmlFor="placeCooldown">Place Cooldown (seconds) *</Label>
                    <Input
                      id="placeCooldown"
                      type="number"
                      min="0"
                      max="3600"
                      value={formData.placeCooldown}
                      onChange={(e) => handleInputChange('placeCooldown', parseInt(e.target.value) || 0)}
                      className={errors.placeCooldown ? "border-red-500" : ""}
                    />
                    {errors.placeCooldown && <p className="text-sm text-red-600 mt-1">{errors.placeCooldown}</p>}
                    <p className="text-xs text-gray-500 mt-1">Time between pixel placements (0 = no cooldown)</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="width">Canvas Width (pixels) *</Label>
                    <Input
                      id="width"
                      type="number"
                      min="10"
                      max="5000"
                      value={formData.width}
                      onChange={(e) => handleInputChange('width', parseInt(e.target.value) || 1000)}
                      className={errors.width ? "border-red-500" : ""}
                    />
                    {errors.width && <p className="text-sm text-red-600 mt-1">{errors.width}</p>}
                  </div>
                  
                  <div>
                    <Label htmlFor="height">Canvas Height (pixels) *</Label>
                    <Input
                      id="height"
                      type="number"
                      min="10"
                      max="5000"
                      value={formData.height}
                      onChange={(e) => handleInputChange('height', parseInt(e.target.value) || 1000)}
                      className={errors.height ? "border-red-500" : ""}
                    />
                    {errors.height && <p className="text-sm text-red-600 mt-1">{errors.height}</p>}
                  </div>
                </div>

                <div>
                  <Label htmlFor="password">Password (optional)</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    placeholder="Leave empty for public canvas"
                  />
                  <p className="text-xs text-gray-500 mt-1">Set a password to make this canvas private</p>
                </div>
              </CardContent>
            </Card>

            {/* Appearance Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Eye className="h-5 w-5" />
                  <span>Appearance</span>
                </CardTitle>
                <CardDescription>
                  Customize how your canvas looks and behaves
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="backgroundColor">Background Color</Label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={formData.backgroundColor}
                        onChange={(e) => handleInputChange('backgroundColor', e.target.value)}
                        className="h-10 w-16 cursor-pointer rounded border border-gray-300"
                      />
                      <Input
                        value={formData.backgroundColor}
                        onChange={(e) => handleInputChange('backgroundColor', e.target.value)}
                        placeholder="#FFFFFF"
                        className="flex-1"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="gridColor">Grid Color</Label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={formData.gridColor}
                        onChange={(e) => handleInputChange('gridColor', e.target.value)}
                        className="h-10 w-16 cursor-pointer rounded border border-gray-300"
                      />
                      <Input
                        value={formData.gridColor}
                        onChange={(e) => handleInputChange('gridColor', e.target.value)}
                        placeholder="#E0E0E0"
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="showGrid"
                    checked={formData.showGrid}
                    onCheckedChange={(checked) => handleInputChange('showGrid', checked)}
                  />
                  <Label htmlFor="showGrid">Show grid when zoomed in</Label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="gridThreshold">Grid Zoom Threshold</Label>
                    <Input
                      id="gridThreshold"
                      type="number"
                      min="1"
                      max="10"
                      step="0.1"
                      value={formData.gridThreshold}
                      onChange={(e) => handleInputChange('gridThreshold', parseFloat(e.target.value) || 4)}
                    />
                    <p className="text-xs text-gray-500 mt-1">Zoom level to show grid</p>
                  </div>
                  
                  <div>
                    <Label htmlFor="minZoom">Min Zoom</Label>
                    <Input
                      id="minZoom"
                      type="number"
                      min="0.01"
                      max="1"
                      step="0.01"
                      value={formData.minZoom}
                      onChange={(e) => handleInputChange('minZoom', parseFloat(e.target.value) || 0.1)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="maxZoom">Max Zoom</Label>
                    <Input
                      id="maxZoom"
                      type="number"
                      min="2"
                      max="100"
                      value={formData.maxZoom}
                      onChange={(e) => handleInputChange('maxZoom', parseInt(e.target.value) || 32)}
                      className={errors.maxZoom ? "border-red-500" : ""}
                    />
                    {errors.maxZoom && <p className="text-sm text-red-600 mt-1">{errors.maxZoom}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Color Restrictions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Palette className="h-5 w-5" />
                  <span>Color Palette</span>
                </CardTitle>
                <CardDescription>
                  Control which colors users can place on your canvas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="restrictColors"
                    checked={formData.restrictColors}
                    onCheckedChange={(checked) => handleInputChange('restrictColors', checked)}
                  />
                  <Label htmlFor="restrictColors">Restrict available colors</Label>
                </div>

                {formData.restrictColors && (
                  <div>
                    <Label>Allowed Colors</Label>
                    <div className="grid grid-cols-8 gap-2 mt-2">
                      {DEFAULT_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={`h-10 w-10 rounded border-2 transition-all hover:scale-110 ${
                            formData.allowedColors.includes(color)
                              ? "border-blue-500 ring-2 ring-blue-200 scale-105"
                              : "border-gray-300 hover:border-gray-400 opacity-50"
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => handleColorToggle(color)}
                          title={`${color} - ${formData.allowedColors.includes(color) ? 'Enabled' : 'Disabled'}`}
                        />
                      ))}
                    </div>
                    {errors.allowedColors && <p className="text-sm text-red-600 mt-1">{errors.allowedColors}</p>}
                    <p className="text-xs text-gray-500 mt-2">
                      Click colors to toggle them. Selected colors will be available to users.
                      {formData.allowedColors.length > 0 && ` (${formData.allowedColors.length} selected)`}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Submit */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                * Required fields
              </div>
              <div className="flex items-center space-x-4">
                <Button type="button" variant="outline" asChild>
                  <Link href="/">Cancel</Link>
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? "Creating..." : "Create Canvas"}
                </Button>
              </div>
            </div>

            {errors.submit && (
              <div className="rounded-lg bg-red-50 p-4 border border-red-200 dark:bg-red-900/20 dark:border-red-800">
                <p className="text-red-600 dark:text-red-400">{errors.submit}</p>
              </div>
            )}
          </form>
        </div>
      </div>
    </>
  );
}