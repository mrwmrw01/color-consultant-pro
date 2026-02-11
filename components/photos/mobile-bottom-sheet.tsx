"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { 
  Pen, 
  Type, 
  Tag, 
  Undo, 
  Redo, 
  Trash2,
  ChevronUp,
  ChevronDown,
  Plus
} from "lucide-react"

interface AnnotationTool {
  type: 'pen' | 'text' | 'colorTag'
  color: string
  strokeWidth: number
  opacity: number
}

interface MobileBottomSheetProps {
  currentTool: AnnotationTool
  onToolChange: (tool: AnnotationTool) => void
  onUndo?: () => void
  onRedo?: () => void
  onClear?: () => void
  onQuickAction?: () => void
  canUndo?: boolean
  canRedo?: boolean
  canClear?: boolean
  isOpen?: boolean
  onToggle?: () => void
}

const colors = [
  '#dc2626', '#ea580c', '#ca8a04', '#16a34a',
  '#2563eb', '#9333ea', '#000000', '#6b7280'
]

const strokeWidths = [1, 2, 3, 5, 8]

export function MobileBottomSheet({
  currentTool,
  onToolChange,
  onUndo,
  onRedo,
  onClear,
  onQuickAction,
  canUndo = false,
  canRedo = false,
  canClear = false,
  isOpen = false,
  onToggle
}: MobileBottomSheetProps) {
  const [expanded, setExpanded] = useState(isOpen)
  const [activeTab, setActiveTab] = useState<'tools' | 'colors' | 'settings'>('tools')

  useEffect(() => {
    setExpanded(isOpen)
  }, [isOpen])

  const handleToggle = () => {
    const newState = !expanded
    setExpanded(newState)
    onToggle?.()
    
    // Haptic feedback
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10)
    }
  }

  const updateTool = (updates: Partial<AnnotationTool>) => {
    onToolChange({ ...currentTool, ...updates })
    
    // Haptic feedback on tool change
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(5)
    }
  }

  const handleToolSelect = (type: 'pen' | 'text' | 'colorTag') => {
    updateTool({ type })
    // Keep sheet open for color selection
    setActiveTab('colors')
  }

  const handleAction = (action?: () => void) => {
    if (action) {
      action()
      // Haptic feedback
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(15)
      }
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
      {/* Quick Action Button (FAB style) */}
      <div className="absolute -top-14 right-4">
        <Button
          size="lg"
          className="h-12 w-12 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700"
          onClick={handleToggle}
        >
          {expanded ? (
            <ChevronDown className="h-5 w-5" />
          ) : (
            <Plus className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Bottom Sheet */}
      <div 
        className={`bg-white border-t shadow-2xl transition-all duration-300 ease-out ${
          expanded ? 'max-h-[70vh]' : 'max-h-16'
        }`}
      >
        {/* Handle / Toggle Bar */}
        <div 
          className="flex items-center justify-center py-2 border-b cursor-pointer active:bg-gray-50"
          onClick={handleToggle}
          style={{ minHeight: '44px' }}
        >
          <div className="w-12 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Collapsed State - Quick Tools */}
        {!expanded && (
          <div className="px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Current Tool Indicator */}
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ 
                  backgroundColor: currentTool.type === 'pen' ? currentTool.color : '#f3f4f6',
                  border: '2px solid #e5e7eb'
                }}
              >
                {currentTool.type === 'pen' && <Pen className="h-5 w-5 text-white" />}
                {currentTool.type === 'text' && <Type className="h-5 w-5 text-gray-700" />}
                {currentTool.type === 'colorTag' && <Tag className="h-5 w-5" style={{ color: currentTool.color }} />}
              </div>
              <span className="text-sm font-medium capitalize">{currentTool.type}</span>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onUndo && handleAction(onUndo)}
                disabled={!canUndo}
                className="h-10 w-10 p-0"
                style={{ minWidth: '44px', minHeight: '44px' }}
              >
                <Undo className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRedo && handleAction(onRedo)}
                disabled={!canRedo}
                className="h-10 w-10 p-0"
                style={{ minWidth: '44px', minHeight: '44px' }}
              >
                <Redo className="h-5 w-5" />
              </Button>
            </div>
          </div>
        )}

        {/* Expanded State - Full Toolbar */}
        {expanded && (
          <div className="px-4 py-3 space-y-4 overflow-y-auto max-h-[60vh]">
            {/* Tab Navigation */}
            <div className="flex border-b">
              {(['tools', 'colors', 'settings'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab)
                    if (typeof navigator !== 'undefined' && navigator.vibrate) {
                      navigator.vibrate(5)
                    }
                  }}
                  className={`flex-1 py-3 text-sm font-medium capitalize transition-colors ${
                    activeTab === tab 
                      ? 'text-blue-600 border-b-2 border-blue-600' 
                      : 'text-gray-500'
                  }`}
                  style={{ minHeight: '44px' }}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tools Tab */}
            {activeTab === 'tools' && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => handleToolSelect('pen')}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      currentTool.type === 'pen'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    style={{ minHeight: '80px' }}
                  >
                    <Pen className="h-6 w-6" style={{ color: currentTool.color }} />
                    <span className="text-xs font-medium">Pen</span>
                  </button>
                  <button
                    onClick={() => handleToolSelect('text')}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      currentTool.type === 'text'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    style={{ minHeight: '80px' }}
                  >
                    <Type className="h-6 w-6 text-gray-700" />
                    <span className="text-xs font-medium">Text</span>
                  </button>
                  <button
                    onClick={() => handleToolSelect('colorTag')}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      currentTool.type === 'colorTag'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    style={{ minHeight: '80px' }}
                  >
                    <Tag className="h-6 w-6" style={{ color: currentTool.color }} />
                    <span className="text-xs font-medium">Tag</span>
                  </button>
                </div>

                {/* Stroke Width for Pen */}
                {currentTool.type === 'pen' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Stroke Width</label>
                    <div className="flex items-center gap-3">
                      {strokeWidths.map((width) => (
                        <button
                          key={width}
                          onClick={() => updateTool({ strokeWidth: width })}
                          className={`flex-1 h-12 rounded-lg border-2 flex items-center justify-center transition-all ${
                            currentTool.strokeWidth === width
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200'
                          }`}
                          style={{ minHeight: '44px' }}
                        >
                          <div 
                            className="rounded-full bg-gray-700"
                            style={{ 
                              width: `${width * 3}px`, 
                              height: `${width * 3}px`,
                              maxWidth: '24px',
                              maxHeight: '24px'
                            }} 
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Colors Tab */}
            {activeTab === 'colors' && (
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700">Select Color</label>
                <div className="grid grid-cols-4 gap-3">
                  {colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => updateTool({ color })}
                      className={`aspect-square rounded-xl border-4 transition-all ${
                        currentTool.color === color
                          ? 'border-gray-900 scale-110 shadow-lg'
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                      style={{ 
                        backgroundColor: color,
                        minHeight: '60px'
                      }}
                    >
                      {currentTool.color === color && (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="w-3 h-3 bg-white rounded-full" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-4">
                {/* Opacity Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <label className="text-sm font-medium text-gray-700">Opacity</label>
                    <span className="text-sm text-gray-500">{Math.round(currentTool.opacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="10"
                    value={currentTool.opacity * 100}
                    onChange={(e) => updateTool({ opacity: parseInt(e.target.value) / 100 })}
                    className="w-full h-12"
                    style={{ minHeight: '44px' }}
                  />
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-3 gap-3 pt-2">
                  <button
                    onClick={() => onUndo && handleAction(onUndo)}
                    disabled={!canUndo}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-200 disabled:opacity-40 active:bg-gray-50"
                    style={{ minHeight: '80px' }}
                  >
                    <Undo className="h-6 w-6" />
                    <span className="text-xs font-medium">Undo</span>
                  </button>
                  <button
                    onClick={() => onRedo && handleAction(onRedo)}
                    disabled={!canRedo}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-200 disabled:opacity-40 active:bg-gray-50"
                    style={{ minHeight: '80px' }}
                  >
                    <Redo className="h-6 w-6" />
                    <span className="text-xs font-medium">Redo</span>
                  </button>
                  <button
                    onClick={() => onClear && handleAction(onClear)}
                    disabled={!canClear}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-red-200 text-red-600 disabled:opacity-40 active:bg-red-50"
                    style={{ minHeight: '80px' }}
                  >
                    <Trash2 className="h-6 w-6" />
                    <span className="text-xs font-medium">Clear</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
