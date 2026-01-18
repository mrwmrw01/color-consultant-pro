

"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, TrendingUp, Eye } from "lucide-react"
import { motion } from "framer-motion"

interface TopColorsDisplayProps {
  colors: any[]
}

export function TopColorsDisplay({ colors }: TopColorsDisplayProps) {
  // Get top 10 most used colors
  const topColors = colors
    .filter(c => c.usageCount > 0)
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, 10)

  if (topColors.length === 0) {
    return null
  }

  return (
    <Card style={{ background: 'linear-gradient(to bottom right, #fef7ed, #fef3e8)', borderColor: '#f97316', borderWidth: '2px' }}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, #f97316, #c47004)' }}>
            <Trophy className="h-6 w-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-xl" style={{ color: '#412501' }}>Top 10 Most Used Colors</CardTitle>
            <CardDescription style={{ color: '#8b4513' }}>Your go-to color selections</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {topColors.map((color, index) => (
            <motion.div
              key={color.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Card 
                style={{
                  borderWidth: index < 3 ? '2px' : '1px',
                  borderColor: index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : '#d2691e',
                  backgroundColor: index === 0 ? '#fffbea' : index === 1 ? '#f7f7f7' : index === 2 ? '#fff4e6' : '#ffffff'
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Rank Badge */}
                    <div 
                      className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg"
                      style={{
                        backgroundColor: index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : '#e5e7eb',
                        color: index < 3 ? '#ffffff' : '#374151'
                      }}
                    >
                      {index + 1}
                    </div>

                    {/* Color Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold" style={{ color: '#111827' }}>{color.colorCode}</h4>
                        <Badge style={{ backgroundColor: '#f97316', color: 'white' }} className="font-bold hover:bg-orange-600">
                          <Eye className="h-3 w-3 mr-1" />
                          {color.usageCount}x
                        </Badge>
                      </div>
                      <p className="text-sm font-medium truncate" style={{ color: '#111827' }}>{color.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs" style={{ color: '#8b4513' }}>{color.manufacturer}</p>
                        {color.colorFamily && (
                          <Badge variant="outline" className="text-xs border-gray-600" style={{ color: '#111827' }}>
                            {color.colorFamily}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* RGB Display */}
                    <div className="flex-shrink-0 rounded p-2" style={{ border: '1px solid #d2691e', backgroundColor: '#ffffff' }}>
                      <div className="text-[10px] font-semibold mb-0.5" style={{ color: '#8b4513' }}>RGB</div>
                      <div className="text-xs font-mono whitespace-nowrap" style={{ color: '#111827' }}>
                        {color.rgbColor || "N/A"}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {topColors.length > 0 && (
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid #f97316' }}>
            <div className="flex items-center justify-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4" style={{ color: '#f97316' }} />
              <span className="font-medium" style={{ color: '#8b4513' }}>
                Total usage across top 10: {topColors.reduce((sum, c) => sum + c.usageCount, 0)} times
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
