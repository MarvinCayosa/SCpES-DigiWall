"use client"

import type { Tool } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { MousePointer2, Hand, ZoomIn, ZoomOut, RotateCcw } from "lucide-react"

interface ToolbarProps {
  currentTool: Tool
  onToolChange: (tool: Tool) => void
  zoom: number
  onZoomChange: (zoom: number) => void
}

export default function Toolbar({ currentTool, onToolChange, zoom, onZoomChange }: ToolbarProps) {
  const handleZoomIn = () => {
    onZoomChange(Math.min(3, zoom * 1.2))
  }

  const handleZoomOut = () => {
    onZoomChange(Math.max(0.1, zoom / 1.2))
  }

  const handleResetZoom = () => {
    onZoomChange(1)
  }

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-2 flex items-center gap-2 z-40">
      {/* Selection Tools */}
      <Button
        variant={currentTool === "select" ? "default" : "outline"}
        size="sm"
        onClick={() => onToolChange("select")}
      >
        <MousePointer2 className="w-4 h-4" />
      </Button>

      <Button variant={currentTool === "pan" ? "default" : "outline"} size="sm" onClick={() => onToolChange("pan")}>
        <Hand className="w-4 h-4" />
      </Button>

      <div className="w-px h-6 bg-gray-300 mx-2" />

      {/* Zoom Controls */}
      <Button variant="outline" size="sm" onClick={handleZoomOut}>
        <ZoomOut className="w-4 h-4" />
      </Button>

      <span className="text-sm font-mono min-w-[3rem] text-center">{Math.round(zoom * 100)}%</span>

      <Button variant="outline" size="sm" onClick={handleZoomIn}>
        <ZoomIn className="w-4 h-4" />
      </Button>

      <Button variant="outline" size="sm" onClick={handleResetZoom}>
        <RotateCcw className="w-4 h-4" />
      </Button>
    </div>
  )
}
