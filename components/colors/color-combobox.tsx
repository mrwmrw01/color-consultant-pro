"use client"

import { useState, useMemo, useCallback, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ChevronsUpDown, Check, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface Color {
  id: string
  name: string
  colorCode: string
  manufacturer: string
  hexColor?: string | null
}

interface ColorComboboxProps {
  colors: Color[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  triggerClassName?: string
  allowNone?: boolean
}

const MAX_RESULTS = 50

export function ColorCombobox({
  colors,
  value,
  onValueChange,
  placeholder = "Select color...",
  triggerClassName,
  allowNone = false,
}: ColorComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedColor = useMemo(
    () => colors.find((c) => c.id === value),
    [colors, value]
  )

  const filtered = useMemo(() => {
    if (!search.trim()) return colors.slice(0, MAX_RESULTS)
    const q = search.toLowerCase()
    const matches: Color[] = []
    for (const c of colors) {
      if (
        c.name.toLowerCase().includes(q) ||
        c.colorCode.toLowerCase().includes(q) ||
        c.manufacturer.toLowerCase().includes(q)
      ) {
        matches.push(c)
        if (matches.length >= MAX_RESULTS) break
      }
    }
    return matches
  }, [colors, search])

  const hasMore = useMemo(() => {
    if (!search.trim()) return colors.length > MAX_RESULTS
    let count = 0
    const q = search.toLowerCase()
    for (const c of colors) {
      if (
        c.name.toLowerCase().includes(q) ||
        c.colorCode.toLowerCase().includes(q) ||
        c.manufacturer.toLowerCase().includes(q)
      ) {
        count++
        if (count > MAX_RESULTS) return true
      }
    }
    return false
  }, [colors, search])

  const handleSelect = useCallback(
    (colorId: string) => {
      onValueChange(colorId === value ? "" : colorId)
      setOpen(false)
      setSearch("")
    },
    [onValueChange, value]
  )

  // Focus input when popover opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0)
    } else {
      setSearch("")
    }
  }, [open])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground",
            triggerClassName
          )}
        >
          {selectedColor ? (
            <span className="flex items-center gap-2 truncate">
              <span
                className="w-3.5 h-3.5 rounded border flex-shrink-0"
                style={{ backgroundColor: selectedColor.hexColor || "#f3f4f6" }}
              />
              <span className="truncate text-sm">
                {selectedColor.name} ({selectedColor.manufacturer})
              </span>
            </span>
          ) : (
            <span className="text-sm">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="flex flex-col">
          {/* Search input */}
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Type to search colors..."
              className="flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="ml-1 shrink-0 opacity-50 hover:opacity-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Results list */}
          <div className="max-h-[250px] overflow-y-auto p-1">
            {allowNone && (
              <button
                onClick={() => { onValueChange(""); setOpen(false); setSearch("") }}
                className={cn(
                  "relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                  !value && "bg-accent"
                )}
              >
                <Check className={cn("mr-2 h-4 w-4", value ? "opacity-0" : "opacity-100")} />
                <span className="text-muted-foreground">None</span>
              </button>
            )}
            {filtered.map((color) => (
              <button
                key={color.id}
                onClick={() => handleSelect(color.id)}
                className={cn(
                  "relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                  value === color.id && "bg-accent"
                )}
              >
                <Check
                  className={cn(
                    "mr-2 h-3.5 w-3.5 flex-shrink-0",
                    value === color.id ? "opacity-100" : "opacity-0"
                  )}
                />
                <span
                  className="w-3.5 h-3.5 rounded border flex-shrink-0 mr-2"
                  style={{ backgroundColor: color.hexColor || "#f3f4f6" }}
                />
                <span className="truncate">
                  {color.name} ({color.manufacturer})
                </span>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="py-4 text-center text-sm text-muted-foreground">
                No colors found.
              </div>
            )}
            {hasMore && (
              <div className="py-2 text-center text-xs text-muted-foreground border-t mt-1">
                Type to narrow {colors.length.toLocaleString()} colors...
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
