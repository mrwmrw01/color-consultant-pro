
"use client"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { 
  Pen, 
  Type, 
  Tag, 
  Undo, 
  Redo, 
  Trash2,
  Circle
} from "lucide-react"

interface AnnotationTool {
  type: 'pen' | 'text' | 'colorTag'
  color: string
  strokeWidth: number
  opacity: number
}

interface AnnotationToolbarProps {
  currentTool: AnnotationTool
  onToolChange: (tool: AnnotationTool) => void
  onUndo?: () => void
  onRedo?: () => void
  onClear?: () => void
  canUndo?: boolean
  canRedo?: boolean
  canClear?: boolean
}

const colors = [
  '#dc2626', // red
  '#ea580c', // orange
  '#ca8a04', // yellow
  '#16a34a', // green
  '#2563eb', // blue
  '#9333ea', // purple
  '#000000', // black
  '#6b7280'  // gray
]

export function AnnotationToolbar({ 
  currentTool, 
  onToolChange,
  onUndo,
  onRedo,
  onClear,
  canUndo = false,
  canRedo = false,
  canClear = false
}: AnnotationToolbarProps) {
  const updateTool = (updates: Partial<AnnotationTool>) => {
    onToolChange({ ...currentTool, ...updates })
  }

  const handleStrokeWidthChange = (value: number[]) => {
    updateTool({ strokeWidth: value[0] })
  }

  const handleOpacityChange = (value: number[]) => {
    updateTool({ opacity: value[0] / 100 })
  }

  return (
    <div className="flex flex-wrap items-center gap-2 md:gap-4">
      {/* Drawing Tools */}
      <div className="flex items-center gap-1 md:gap-2">
        <Label className="text-xs md:text-sm font-medium whitespace-nowrap hidden sm:inline">Tools:</Label>
        <div className="flex items-center gap-0.5 md:gap-1 p-0.5 md:p-1 bg-gray-100 rounded-lg">
          <Button
            size="sm"
            variant={currentTool.type === 'pen' ? 'default' : 'ghost'}
            onClick={() => updateTool({ type: 'pen' })}
            className="h-8 w-8 p-0 md:h-9 md:w-9"
            title="Pen tool"
          >
            <Pen className="h-3.5 w-3.5 md:h-4 md:w-4" />
          </Button>
          <Button
            size="sm"
            variant={currentTool.type === 'text' ? 'default' : 'ghost'}
            onClick={() => updateTool({ type: 'text' })}
            className="h-8 w-8 p-0 md:h-9 md:w-9"
            title="Text tool"
          >
            <Type className="h-3.5 w-3.5 md:h-4 md:w-4" />
          </Button>
          <Button
            size="sm"
            variant={currentTool.type === 'colorTag' ? 'default' : 'ghost'}
            onClick={() => updateTool({ type: 'colorTag' })}
            className="h-8 w-8 p-0 md:h-9 md:w-9"
            title="Color tag tool"
          >
            <Tag className="h-3.5 w-3.5 md:h-4 md:w-4" />
          </Button>
        </div>
      </div>

      <Separator orientation="vertical" className="h-6 md:h-8 hidden sm:block" />

      {/* Color Palette */}
      <div className="flex items-center gap-1 md:gap-2">
        <Label className="text-xs md:text-sm font-medium whitespace-nowrap hidden sm:inline">Color:</Label>
        <div className="flex items-center gap-0.5 md:gap-1">
          {colors.map((color) => (
            <button
              key={color}
              className={`w-6 h-6 md:w-8 md:h-8 rounded-full border-2 transition-all hover:scale-105 ${
                currentTool.color === color 
                  ? 'border-gray-900 scale-110 shadow-md' 
                  : 'border-gray-300 hover:border-gray-500'
              }`}
              style={{ backgroundColor: color }}
              onClick={() => updateTool({ color })}
              title={`Select ${color} color`}
            />
          ))}
        </div>
      </div>

      <Separator orientation="vertical" className="h-6 md:h-8 hidden md:block" />

      {/* Stroke Width - Hidden on mobile for pen tool */}
      {currentTool.type === 'pen' && (
        <>
          <div className="hidden md:flex items-center gap-3 min-w-[140px] lg:min-w-[180px]">
            <Label className="text-sm font-medium whitespace-nowrap">Width:</Label>
            <div className="flex-1 min-w-[80px] lg:min-w-[100px]">
              <Slider
                value={[currentTool.strokeWidth]}
                onValueChange={handleStrokeWidthChange}
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
            </div>
            <span className="text-sm text-gray-600 w-6 text-center font-medium">
              {currentTool.strokeWidth}
            </span>
          </div>
          
          <Separator orientation="vertical" className="h-8 hidden lg:block" />
        </>
      )}

      {/* Opacity - Hidden on small mobile */}
      <div className="hidden sm:flex items-center gap-2 md:gap-3 min-w-[120px] md:min-w-[140px] lg:min-w-[180px]">
        <Label className="text-xs md:text-sm font-medium whitespace-nowrap">Opacity:</Label>
        <div className="flex-1 min-w-[60px] md:min-w-[80px] lg:min-w-[100px]">
          <Slider
            value={[currentTool.opacity * 100]}
            onValueChange={handleOpacityChange}
            min={10}
            max={100}
            step={10}
            className="w-full"
          />
        </div>
        <span className="text-xs md:text-sm text-gray-600 w-8 md:w-10 text-center font-medium">
          {Math.round(currentTool.opacity * 100)}%
        </span>
      </div>

      <Separator orientation="vertical" className="h-6 md:h-8 hidden md:block" />

      {/* Action Buttons */}
      <div className="flex items-center gap-0.5 md:gap-1">
        <Button 
          size="sm" 
          variant="outline" 
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo last action"
          className="h-8 w-8 p-0 md:h-9 md:w-9"
        >
          <Undo className="h-3.5 w-3.5 md:h-4 md:w-4" />
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo last action"
          className="h-8 w-8 p-0 md:h-9 md:w-9"
        >
          <Redo className="h-3.5 w-3.5 md:h-4 md:w-4" />
        </Button>
        <Button 
          size="sm" 
          variant="outline"
          onClick={onClear}
          disabled={!canClear}
          title="Clear all annotations"
          className="h-8 w-8 p-0 md:h-9 md:w-9 text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
        </Button>
      </div>
    </div>
  )
}
