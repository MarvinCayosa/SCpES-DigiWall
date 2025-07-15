"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { Slider } from "@/components/ui/slider"
import type { StickyNote } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X, Check, Type, Brush, Bold, Italic, Underline, Palette, Minus, Plus, RotateCcw, RotateCw } from "lucide-react"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"

interface StickyNoteModalProps {
  note: StickyNote
  isOpen: boolean
  onClose: () => void
  onSave: (note: StickyNote) => void
  onDelete: (noteId: string) => void
}

const STICKY_COLORS = [
  "#FFE4B5",
  "#FFB6C1",
  "#87CEEB",
  "#98FB98",
  "#DDA0DD",
  "#F0E68C",
  "#FFA07A",
  "#20B2AA",
  "#FFCCCB",
  "#E6E6FA",
]

const FONT_FAMILIES = ["Arial", "Helvetica", "Georgia", "Verdana", "Comic Sans MS"]
const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32]

// Common sticky note colors
const COMMON_COLORS = [
  "#FFE066", // yellow
  "#FFB6C1", // pink
  "#87CEEB", // blue
  "#98FB98", // green
  "#FFD166", // orange
  "#A685E2", // purple
  "#FFFFFF", // white
  "#F0E68C", // khaki
  "#FFA07A", // salmon
  "#20B2AA", // teal
]

// Update currentTool type
type ToolType = "text" | "brush" | "eraser";

export default function StickyNoteModal({ note, isOpen, onClose, onSave, onDelete }: StickyNoteModalProps) {
  const [editedNote, setEditedNote] = useState<StickyNote>(note)
  const editorRef = useRef<HTMLDivElement>(null)
  const [currentTool, setCurrentTool] = useState<ToolType>("text")
  const [brushSize, setBrushSize] = useState(3)
  const [showColorPalette, setShowColorPalette] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)

  // Add drawing history state
  const [drawingHistory, setDrawingHistory] = useState<string[]>([]);
  const [historyStep, setHistoryStep] = useState<number>(-1);

  // Touch drawing state
  const [isTouchDrawing, setIsTouchDrawing] = useState(false);

  // Track last drawing point for smoothing
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setEditedNote(note)
    if (editorRef.current) {
      editorRef.current.innerHTML = note.text || ""
    }
    lastPoint.current = null;
  }, [note])

  // Load existing drawing when modal opens
  useEffect(() => {
    if (isOpen && note.drawingData?.imageData && canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")
      if (ctx) {
        const img = new Image()
        img.crossOrigin = "anonymous"
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        }
        img.src = note.drawingData.imageData
      }
    }
  }, [isOpen, note.drawingData])

  // On modal open, initialize history from note.drawingData
  useEffect(() => {
    if (isOpen && note.drawingData?.imageData) {
      setDrawingHistory([note.drawingData.imageData]);
      setHistoryStep(0);
    } else if (isOpen) {
      setDrawingHistory([]);
      setHistoryStep(-1);
    }
  }, [isOpen, note.drawingData]);

  // Undo/redo logic: always restore correct drawing state
  const pushDrawingToHistory = useCallback(() => {
    if (canvasRef.current) {
      const data = canvasRef.current.toDataURL();
      setDrawingHistory((prev) => {
        const newHistory = prev.slice(0, historyStep + 1);
        newHistory.push(data);
        // Limit history to last 50 states
        if (newHistory.length > 50) newHistory.shift();
        return newHistory;
      });
      setHistoryStep((prev) => Math.min(prev + 1, 49));
    }
  }, [historyStep]);

  // On mouse up after drawing, push to history
  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
    lastPoint.current = null;
    pushDrawingToHistory();
  }, [pushDrawingToHistory]);

  // Undo/Redo handlers
  const handleUndo = () => {
    if (historyStep > 0) {
      setHistoryStep((prev) => prev - 1);
    }
  };
  const handleRedo = () => {
    if (historyStep < drawingHistory.length - 1) {
      setHistoryStep((prev) => prev + 1);
    }
  };
  // When historyStep changes, update canvas
  useEffect(() => {
    if (canvasRef.current && drawingHistory[historyStep]) {
      const ctx = canvasRef.current.getContext('2d');
      const img = new window.Image();
      img.onload = () => {
        ctx?.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
        ctx?.drawImage(img, 0, 0, canvasRef.current!.width, canvasRef.current!.height);
      };
      img.src = drawingHistory[historyStep];
    }
  }, [historyStep, drawingHistory]);

  const handleSave = useCallback(() => {
    // Save HTML content from contenteditable
    const html = editorRef.current?.innerHTML || ""
    // Capture canvas drawing data
    if (canvasRef.current) {
      const canvas = canvasRef.current
      const imageData = canvas.toDataURL()
      // Only save drawing data if there's actual content
      const ctx = canvas.getContext("2d")
      if (ctx) {
        const pixelData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const hasContent = pixelData.data.some((channel, index) => index % 4 === 3 && channel > 0)

        const updatedNote = {
          ...editedNote,
          text: html,
          drawingData: hasContent ? { imageData } : null,
        }
        onSave(updatedNote)
      } else {
        onSave({ ...editedNote, text: html })
      }
    } else {
      onSave({ ...editedNote, text: html })
    }
  }, [editedNote, onSave])

  const updateNote = useCallback((updates: Partial<StickyNote>) => {
    setEditedNote((prev) => ({ ...prev, ...updates }))
  }, [])

  // Rich text commands
  const exec = (command: string, value?: string) => {
    document.execCommand(command, false, value)
    // force update to trigger rerender if needed
    setEditedNote((prev) => ({ ...prev, text: editorRef.current?.innerHTML || "" }))
  }

  // Drawing and erasing logic
  const startDrawing = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (currentTool !== "brush" && currentTool !== "eraser") return;
      setIsDrawing(true);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      lastPoint.current = { x, y };
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.beginPath();
        ctx.moveTo(x, y);
      }
    },
    [currentTool],
  )

  const draw = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing || (currentTool !== "brush" && currentTool !== "eraser")) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        if (lastPoint.current) {
          ctx.beginPath();
          ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
          ctx.quadraticCurveTo(lastPoint.current.x, lastPoint.current.y, x, y);
          ctx.strokeStyle = currentTool === "eraser" ? editedNote.backgroundColor : editedNote.textColor;
          ctx.lineWidth = brushSize * (currentTool === "eraser" ? 3 : 1);
          ctx.lineCap = "round";
          ctx.globalCompositeOperation = "source-over";
          ctx.stroke();
        }
        lastPoint.current = { x, y };
      }
    }, [isDrawing, currentTool, brushSize, editedNote.textColor, editedNote.backgroundColor]);

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
    }
  }

  // Touch drawing handlers
  const startTouchDrawing = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (currentTool !== "brush" && currentTool !== "eraser") return;
    setIsTouchDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    lastPoint.current = { x, y };
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  }, [currentTool]);
  const touchDraw = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isTouchDrawing || (currentTool !== "brush" && currentTool !== "eraser")) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      if (lastPoint.current) {
        ctx.beginPath();
        ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
        ctx.quadraticCurveTo(lastPoint.current.x, lastPoint.current.y, x, y);
        ctx.strokeStyle = currentTool === "eraser" ? editedNote.backgroundColor : editedNote.textColor;
        ctx.lineWidth = brushSize * (currentTool === "eraser" ? 3 : 1);
        ctx.lineCap = "round";
        ctx.globalCompositeOperation = "source-over";
        ctx.stroke();
      }
      lastPoint.current = { x, y };
    }
  }, [isTouchDrawing, currentTool, brushSize, editedNote.textColor, editedNote.backgroundColor]);
  const stopTouchDrawing = useCallback(() => {
    setIsTouchDrawing(false);
    lastPoint.current = null;
    pushDrawingToHistory();
  }, [pushDrawingToHistory]);

  // Utility: check if drawing exists
  function hasDrawing() {
    if (!canvasRef.current) return false;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return false;
    const pixelData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
    return pixelData.data.some((channel, index) => index % 4 === 3 && channel > 0);
  }
  // Utility: check if text is empty (ignoring <br> and whitespace)
  function isTextEmpty() {
    const html = editorRef.current?.innerHTML || '';
    return !html || html === '<br>' || html.replace(/<[^>]+>/g, '').trim() === '';
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center z-50 p-4">
      {/* Modal Content with Padding */}
      <div
        className="relative w-[600px] h-[600px] shadow-2xl transition-all duration-300 ease-out bg-white border border-white/40 rounded-2xl flex flex-col p-6"
        style={{
          backgroundColor: editedNote.backgroundColor,
          fontFamily: 'SF Pro Display, Arial, Helvetica, sans-serif',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.18)',
        }}
      >
        {/* Close Button */}
        <Button
          onClick={onClose}
          variant="ghost"
          size="icon"
          className="absolute -top-4 -right-4 w-10 h-10 rounded-full bg-gray-900/80 hover:bg-gray-800/90 text-white z-10 shadow-lg backdrop-blur-md border border-white/30 transition-all duration-200"
          style={{ fontFamily: 'inherit' }}
        >
          <X className="w-5 h-5" />
        </Button>
        {/* Main Content - now fills the modal with padding */}
        <div className="flex-1 relative overflow-hidden">
          {/* Drawing Canvas - fills modal */}
          <canvas
            ref={canvasRef}
            width={544}
            height={544}
            className={`absolute inset-0 ${currentTool === "brush" || currentTool === "eraser" ? "cursor-crosshair z-20" : "pointer-events-none z-0"} transition-all duration-200`}
            style={{ borderRadius: '16px', touchAction: 'none', width: '100%', height: '100%' }}
            onMouseDown={e => { e.preventDefault(); startDrawing(e); }}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={e => { e.preventDefault(); startTouchDrawing(e); }}
            onTouchMove={e => { e.preventDefault(); touchDraw(e); }}
            onTouchEnd={e => { e.preventDefault(); stopTouchDrawing(); }}
          />
          {/* Text Area - fills modal */}
          <div
            ref={editorRef}
            contentEditable={currentTool === "text"}
            suppressContentEditableWarning
            className="absolute inset-0 border-none bg-transparent focus:ring-0 focus:outline-none focus:border-transparent focus-visible:ring-0 focus-visible:ring-offset-0 z-10 text-lg font-medium overflow-y-auto"
            style={{
              color: editedNote.textColor,
              fontSize: editedNote.fontSize,
              fontFamily: editedNote.fontFamily,
              minHeight: 40,
              fontWeight: editedNote.fontWeight,
              fontStyle: editedNote.fontStyle,
              textDecoration: editedNote.textDecoration,
              boxShadow: 'none',
              pointerEvents: currentTool === "text" ? "auto" : "none",
              transition: 'font-size 0.2s cubic-bezier(.4,0,.2,1)',
              outline: 'none',
              borderRadius: 16,
              overflowX: 'hidden',
              scrollbarWidth: 'thin',
              padding: 8,
            }}
            onInput={() => {
              updateNote({ text: editorRef.current?.innerHTML || "" });
              if (editorRef.current) {
                editorRef.current.style.fontFamily = editedNote.fontFamily;
                editorRef.current.style.fontSize = editedNote.fontSize + 'px';
              }
            }}
          />
          {/* Custom placeholder for contenteditable */}
          {(!editedNote.text || editedNote.text === '<br>') && (
            <div className="absolute inset-0 z-0 pointer-events-none text-gray-400 select-none p-2 text-lg flex items-center justify-center" style={{fontFamily: 'inherit'}}>
              Write your message...
            </div>
          )}
        </div>
      </div>
      {/* Toolbar OUTSIDE the modal, no horizontal scroll, wraps if needed */}
      <div className="mt-4 bg-[#18181b]/90 backdrop-blur-lg border border-white/20 shadow-2xl rounded-xl px-6 py-3 flex flex-wrap items-center gap-3 z-30 transition-all duration-300 max-w-[95vw]" style={{ fontFamily: 'inherit', minHeight: 56, overflowY: 'hidden' }}>
        {/* All children: min-w-0, flex-shrink-0 to prevent wrapping */}
        {/* Tool Toggle */}
        <Button
          variant={currentTool === "text" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setCurrentTool("text")}
          className={`rounded-md w-8 h-8 p-0 transition-all duration-150 ${currentTool === "text" ? "bg-white text-[#18181b]" : "text-white hover:bg-gray-700"} flex-shrink-0`}
          style={{ fontFamily: 'inherit' }}
        >
          <Type className="w-4 h-4" />
        </Button>
        <Button
          variant={currentTool === "brush" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setCurrentTool("brush")}
          className={`rounded-md w-8 h-8 p-0 transition-all duration-150 ${currentTool === "brush" ? "bg-white text-[#18181b]" : "text-white hover:bg-gray-700"} flex-shrink-0`}
          style={{ fontFamily: 'inherit' }}
        >
          <Brush className="w-4 h-4" />
        </Button>
        <Button
          variant={currentTool === "eraser" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setCurrentTool("eraser")}
          className={`rounded-md w-8 h-8 p-0 transition-all duration-150 ${currentTool === "eraser" ? "bg-white text-[#18181b]" : "text-white hover:bg-gray-700"} flex-shrink-0`}
          style={{ fontFamily: 'inherit' }}
          aria-label="Eraser"
        >
          {/* Classic eraser SVG icon */}
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect x="3" y="13" width="10" height="4" rx="1" fill="#bbb"/>
            <rect x="5" y="3" width="10" height="10" rx="2" fill="#fff" stroke="#bbb" strokeWidth="2"/>
          </svg>
        </Button>
        <div className="w-px h-6 bg-gray-700 mx-2 transition-all duration-300 flex-shrink-0" />
        {/* Text Controls (show only in text mode) */}
        <div className={`flex items-center gap-3 transition-all duration-300 ${currentTool === "text" ? 'opacity-100 max-w-[100vw]' : 'opacity-0 max-w-0 overflow-hidden pointer-events-none'}`} style={{ transition: 'all 0.3s cubic-bezier(.4,0,.2,1)' }}>
          <Select value={editedNote.fontFamily} onValueChange={value => { exec('fontName', value); updateNote({ fontFamily: value }); }}>
            <SelectTrigger className="w-28 h-8 text-xs bg-gray-800 border-gray-700 text-white font-medium rounded-full flex items-center justify-between" style={{ fontFamily: editedNote.fontFamily }}>
              <span style={{ fontFamily: editedNote.fontFamily }}>{editedNote.fontFamily}</span>
            </SelectTrigger>
            <SelectContent>
              {FONT_FAMILIES.map((font) => (
                <SelectItem key={font} value={font} className="text-xs" style={{ fontFamily: font, fontWeight: editedNote.fontFamily === font ? 'bold' : 'normal' }}>{font}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={editedNote.fontSize.toString()} onValueChange={value => { const size = FONT_SIZES[parseInt(value)-1] || 16; exec('fontSize', value); updateNote({ fontSize: size }); }}>
            <SelectTrigger className="w-16 h-8 text-xs bg-gray-800 border-gray-700 text-white font-medium rounded-full flex items-center justify-between">
              <span>{editedNote.fontSize}</span>
            </SelectTrigger>
            <SelectContent>
              {FONT_SIZES.map((size, idx) => (
                <SelectItem key={size} value={(idx+1).toString()} className="text-xs">{size}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => exec('bold')}
            className="rounded-md w-8 h-8 p-0 text-white hover:bg-gray-700 transition-all duration-150"
            style={{ fontFamily: 'inherit' }}
          >
            <Bold className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => exec('italic')}
            className="rounded-md w-8 h-8 p-0 text-white hover:bg-gray-700 transition-all duration-150"
            style={{ fontFamily: 'inherit' }}
          >
            <Italic className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => exec('underline')}
            className="rounded-md w-8 h-8 p-0 text-white hover:bg-gray-700 transition-all duration-150"
            style={{ fontFamily: 'inherit' }}
          >
            <Underline className="w-4 h-4" />
          </Button>
          {/* Text Color Picker */}
          <div className="flex items-center gap-2 relative z-[201]">
            <span className="text-xs text-white">Text</span>
            <ColorPickerPopover
              value={editedNote.textColor}
              onChange={color => {
                if (currentTool === "text") {
                  exec('foreColor', color);
                  updateNote({ textColor: color });
                } else {
                  updateNote({ textColor: color });
                }
              }}
              label="Font color"
              colors={["#222222", "#FF5630", "#FFAB00", "#36B37E", "#00B8D9", "#6554C0", "#FFFFFF"]}
            />
          </div>
        </div>
        {/* Brush Controls (show only in brush mode) */}
        <div className={`flex items-center gap-3 transition-all duration-300 ${currentTool === "brush" ? 'opacity-100 max-w-[100vw]' : 'opacity-0 max-w-0 overflow-hidden pointer-events-none'}`} style={{ transition: 'all 0.3s cubic-bezier(.4,0,.2,1)' }}>
          <span className="text-xs text-white">Brush</span>
          <Slider min={1} max={20} step={1} value={[brushSize]} onValueChange={([v]) => setBrushSize(v)} className="w-32 brush-slider" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-white">Color</span>
            <input
              type="color"
              value={editedNote.textColor}
              onChange={(e) => updateNote({ textColor: e.target.value })}
              className="w-8 h-8 rounded-full border-2 border-gray-300 cursor-pointer"
              style={{ fontFamily: 'inherit' }}
            />
          </div>
        </div>
        {currentTool === "brush" && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleUndo}
              className="rounded-md w-8 h-8 p-0 text-white hover:bg-gray-700 transition-all duration-150 flex-shrink-0"
              style={{ fontFamily: 'inherit' }}
              disabled={historyStep <= 0}
              tabIndex={0}
              aria-label="Undo drawing"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRedo}
              className="rounded-md w-8 h-8 p-0 text-white hover:bg-gray-700 transition-all duration-150 flex-shrink-0"
              style={{ fontFamily: 'inherit' }}
              disabled={historyStep >= drawingHistory.length - 1}
              tabIndex={0}
              aria-label="Redo drawing"
            >
              <RotateCw className="w-4 h-4" />
            </Button>
          </>
        )}
        <div className="w-px h-6 bg-gray-700 mx-2 transition-all duration-300" />
        {/* Note Color Controls (always visible) */}
        <div className="relative flex items-center gap-2 flex-shrink-0 min-w-0">
          <ColorPickerPopover
            value={editedNote.backgroundColor}
            onChange={color => updateNote({ backgroundColor: color })}
            label="Sticky note color"
          />
        </div>
        <div className="w-px h-6 bg-gray-700 mx-2 transition-all duration-300" />
        <Button
          onClick={handleSave}
          size="sm"
          className="rounded-md bg-green-300 hover:bg-green-400 text-[#18181b] px-4 h-8 text-base font-semibold shadow transition-all duration-150 border border-green-400"
          style={{ fontFamily: 'inherit', boxShadow: 'none' }}
          disabled={(() => { const html = editorRef.current?.innerHTML || ''; const textEmpty = !html || html === '<br>' || html.replace(/<[^>]+>/g, '').trim() === ''; let drawing = false; if (canvasRef.current) { const ctx = canvasRef.current.getContext('2d'); if (ctx) { const pixelData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height); drawing = pixelData.data.some((channel, index) => index % 4 === 3 && channel > 0); } } return textEmpty && !drawing; })()}
        >
          <Check className="w-4 h-4 mr-1" />
        </Button>
      </div>
    </div>
  )
}

interface ViewStickyNoteModalProps {
  note: StickyNote
  isOpen: boolean
  onClose: () => void
}

export function ViewStickyNoteModal({ note, isOpen, onClose }: ViewStickyNoteModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    // Focus trap or other effects can go here
  }, [isOpen]);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div
        className="relative w-[600px] h-[600px] transition-all duration-300 ease-out bg-white border border-white/40 rounded-2xl flex flex-col p-6 animate-zoomIn"
        style={{
          backgroundColor: note.backgroundColor,
          fontFamily: 'SF Pro Display, Arial, Helvetica, sans-serif',
        }}
      >
        {/* Close Button */}
        <Button
          onClick={onClose}
          variant="ghost"
          size="icon"
          className="absolute -top-4 -right-4 w-10 h-10 rounded-full bg-gray-900/80 hover:bg-gray-800/90 text-white z-10 backdrop-blur-md border border-white/30 transition-all duration-200"
          style={{ fontFamily: 'inherit' }}
        >
          <X className="w-5 h-5" />
        </Button>
        {/* Main Content - same as edit modal */}
        <div className="flex-1 relative overflow-hidden">
          {/* Drawing Canvas - fills modal if present */}
          {note.drawingData?.imageData && (
            <canvas
              width={544}
              height={544}
              className="absolute inset-0 pointer-events-none z-0 rounded-xl"
              style={{ borderRadius: '16px', width: '100%', height: '100%' }}
              ref={el => {
                if (el && note.drawingData?.imageData) {
                  const ctx = el.getContext('2d');
                  const img = new window.Image();
                  img.crossOrigin = 'anonymous';
                  img.onload = () => {
                    ctx?.clearRect(0, 0, el.width, el.height);
                    ctx?.drawImage(img, 0, 0, el.width, el.height);
                  };
                  img.src = note.drawingData.imageData;
                }
              }}
            />
          )}
          {/* Text Content - render as HTML, with padding */}
          <div
            className="absolute inset-0 z-10 text-lg font-medium overflow-y-auto"
            style={{
              color: note.textColor,
              fontSize: note.fontSize,
              fontFamily: note.fontFamily,
              fontWeight: note.fontWeight,
              fontStyle: note.fontStyle,
              textDecoration: note.textDecoration,
              boxShadow: 'none',
              outline: 'none',
              borderRadius: 16,
              overflowX: 'hidden',
              scrollbarWidth: 'thin',
              padding: 8,
            }}
          >
            {note.text && <div className="whitespace-pre-wrap break-words" dangerouslySetInnerHTML={{ __html: note.text }} />}
          </div>
        </div>
      </div>
    </div>
  )
}

// ColorPickerPopover component (inline for now)
type ColorPickerPopoverProps = {
  value: string;
  onChange: (color: string) => void;
  colors?: string[];
  label?: string;
};
function ColorPickerPopover({ value, onChange, colors = COMMON_COLORS, label = "Pick color" }: ColorPickerPopoverProps) {
  const [custom, setCustom] = useState<string>(value || colors[0]);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center bg-white shadow cursor-pointer">
          <span className="w-6 h-6 rounded-full border-2 border-gray-400" style={{ background: value }} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="flex flex-col items-center gap-2 w-auto min-w-[220px] p-3 z-[300]">
        <div className="flex items-center gap-2">
          {colors.map((color: string) => (
            <button
              key={color}
              className={`w-7 h-7 rounded-full border-2 ${value === color ? 'border-black' : 'border-white'} hover:border-gray-400 transition-all duration-100`}
              style={{ background: color }}
              onClick={() => onChange(color)}
              aria-label={label}
            />
          ))}
          {/* Color wheel */}
          <input
            type="color"
            value={custom}
            onChange={e => { setCustom(e.target.value); onChange(e.target.value); }}
            className="w-7 h-7 rounded-full border-2 border-white cursor-pointer"
            aria-label="Custom color"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
