import React, { useState, useRef, useEffect, useCallback } from "react";
import { Slider } from "@/components/ui/slider";
import type { StickyNote } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Type, Brush, Bold, Italic, Underline, Palette, RotateCcw, RotateCw } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

const FONT_FAMILIES = ["Arial", "Helvetica", "Georgia", "Verdana", "Comic Sans MS"];
const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32];
const COMMON_COLORS = [
  "#FFD600", // Vivid yellow
  "#FF6F00", // Vivid orange
  "#FF1744", // Vivid red
  "#D500F9", // Vivid purple
  "#00E676", // Vivid green
  "#00B8D4", // Vivid cyan
  "#2979FF", // Vivid blue
  "#F50057", // Hot pink
  "#FFEA00", // Neon yellow
  "#76FF03", // Neon green
];
export type ToolType = "text" | "brush" | "eraser";

type StickyNoteEditorProps = {
  initialNote: StickyNote;
  onSave: (note: StickyNote) => void;
  mobile?: boolean;
  sent?: boolean;
  setSent?: (v: boolean) => void;
};

export default function StickyNoteEditor({ initialNote, onSave, mobile, sent }: StickyNoteEditorProps) {
  const [editedNote, setEditedNote] = useState<StickyNote>(initialNote);
  const editorRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentTool, setCurrentTool] = useState<ToolType>("text");
  const [brushSize, setBrushSize] = useState(3);
  const [brushColor, setBrushColor] = useState("#000000"); // Separate brush color state
  const [fontFamily, setFontFamily] = useState("Arial");
  const [fontSize, setFontSize] = useState(24);
  const [textColor, setTextColor] = useState("#000000");
  const [backgroundColor, setBackgroundColor] = useState("#FFE066");
  const [drawingHistory, setDrawingHistory] = useState<string[]>([]);
  const [historyStep, setHistoryStep] = useState<number>(-1);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Touch drawing state
  const [isTouchDrawing, setIsTouchDrawing] = useState(false);

  // Helper function to determine if a color is light or dark
  const isLightColor = (color: string): boolean => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 140;
  };

  // Get dynamic placeholder color based on background
  const getPlaceholderColor = (): string => {
    return isLightColor(backgroundColor) ? '#555555' : '#dddddd';
  };

  useEffect(() => {
    setEditedNote(initialNote);
    if (editorRef.current) {
      editorRef.current.innerHTML = initialNote.text || "";
    }
  }, [initialNote]);

  // Drawing history logic
  useEffect(() => {
    if (initialNote.drawingData?.imageData && canvasRef.current) {
      setDrawingHistory([initialNote.drawingData.imageData]);
      setHistoryStep(0);
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const img = new window.Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = initialNote.drawingData.imageData;
      }
    } else {
      setDrawingHistory([]);
      setHistoryStep(-1);
    }
  }, [initialNote, setDrawingHistory, setHistoryStep]);

  // When the eraser tool is selected, clear the canvas
  useEffect(() => {
    if (currentTool === "eraser" && canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
      // Also clear drawing history
      setDrawingHistory([]);
      setHistoryStep(-1);
    }
  }, [currentTool]);

  const pushDrawingToHistory = useCallback(() => {
    if (canvasRef.current) {
      const data = canvasRef.current.toDataURL();
      setDrawingHistory((prev: string[]) => {
        const newHistory = prev.slice(0, historyStep + 1);
        newHistory.push(data);
        // Limit history to last 50 states
        if (newHistory.length > 50) newHistory.shift();
        return newHistory;
      });
      setHistoryStep((prev) => Math.min(prev + 1, 49));
    }
  }, [historyStep, setDrawingHistory, setHistoryStep]);

  // Track last drawing point for smoothing
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
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
          ctx.strokeStyle = currentTool === "eraser" ? backgroundColor : brushColor;
          ctx.lineWidth = brushSize * (currentTool === "eraser" ? 3 : 1);
          ctx.lineCap = "round";
          ctx.globalCompositeOperation = "source-over";
          ctx.stroke();
        }
        lastPoint.current = { x, y };
      }
    }, [isDrawing, currentTool, brushSize, brushColor, backgroundColor]);
  const startDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
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
  }, [currentTool]);
  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
    lastPoint.current = null;
    pushDrawingToHistory();
  }, [pushDrawingToHistory]);

  useEffect(() => {
    if (canvasRef.current && drawingHistory[historyStep]) {
      const ctx = canvasRef.current.getContext("2d");
      const img = new window.Image();
      img.onload = () => {
        ctx?.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
        ctx?.drawImage(img, 0, 0, canvasRef.current!.width, canvasRef.current!.height);
      };
      img.src = drawingHistory[historyStep];
    }
  }, [historyStep, drawingHistory]);

  const updateNote = useCallback((updates: Partial<StickyNote>) => {
    setEditedNote((prev) => ({ ...prev, ...updates }));
  }, []);

  const exec = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    setEditedNote((prev) => ({ ...prev, text: editorRef.current?.innerHTML || "" }));
  };

  // Touch drawing handlers
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
        ctx.strokeStyle = currentTool === "eraser" ? backgroundColor : brushColor;
        ctx.lineWidth = brushSize * (currentTool === "eraser" ? 3 : 1);
        ctx.lineCap = "round";
        ctx.globalCompositeOperation = "source-over";
        ctx.stroke();
      }
      lastPoint.current = { x, y };
    }
  }, [isTouchDrawing, currentTool, brushSize, brushColor, backgroundColor]);
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
  const stopTouchDrawing = useCallback(() => {
    setIsTouchDrawing(false);
    lastPoint.current = null;
    pushDrawingToHistory();
  }, [pushDrawingToHistory]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  // Save handler for submit page
  const handleSave = useCallback(() => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const html = editorRef.current?.innerHTML || "";
    let drawingData = null;
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const imageData = canvas.toDataURL();
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const pixelData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const hasContent = pixelData.data.some((channel, index) => index % 4 === 3 && channel > 0);
        drawingData = hasContent ? { imageData, width: canvas.width, height: canvas.height } : null;
      }
    }
    onSave({
      ...editedNote,
      text: html,
      drawingData,
    });
    // Pick a new random color different from the previous one
    let randomColor = COMMON_COLORS[Math.floor(Math.random() * COMMON_COLORS.length)];
    while (randomColor === editedNote.backgroundColor && COMMON_COLORS.length > 1) {
      randomColor = COMMON_COLORS[Math.floor(Math.random() * COMMON_COLORS.length)];
    }
    setEditedNote({
      ...initialNote,
      text: "",
      drawingData: null,
      backgroundColor: randomColor,
    });
    setBackgroundColor(randomColor);
    if (editorRef.current) editorRef.current.innerHTML = "";
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    setTimeout(() => {
      setIsSubmitting(false);
    }, 3000);
  }, [editedNote, onSave, isSubmitting, initialNote]);

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

  return (
    <div className={`w-full max-w-lg mx-auto ${mobile ? "p-2" : "p-8"} flex flex-col gap-4 bg-transparent rounded-2xl`}>
      <div
        className={`relative w-full ${mobile ? 'aspect-square' : ''} rounded-xl overflow-hidden`}
        style={mobile ? { maxWidth: 400, maxHeight: 400, margin: '0 auto', background: `${editedNote.backgroundColor}CC`, padding: 24 } : { background: `${editedNote.backgroundColor}CC` }}
      >
        <canvas
          ref={canvasRef}
          width={mobile ? 352 : 544}
          height={mobile ? 352 : 400}
          className={`absolute inset-0 ${currentTool === "brush" || currentTool === "eraser" ? "cursor-crosshair z-20" : "pointer-events-none z-0"} transition-all duration-200`}
          style={mobile ? { borderRadius: '16px', left: 0, top: 0, right: 0, bottom: 0, margin: 'auto', width: 'calc(100% - 48px)', height: 'calc(100% - 48px)', touchAction: 'none' } : { borderRadius: '16px', touchAction: 'none' }}
          onMouseDown={e => { e.preventDefault(); startDrawing(e); }}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={e => { e.preventDefault(); startTouchDrawing(e); }}
          onTouchMove={e => { e.preventDefault(); touchDraw(e); }}
          onTouchEnd={e => { e.preventDefault(); stopTouchDrawing(); }}
        />
        <div
          ref={editorRef}
          contentEditable={currentTool === "text"}
          suppressContentEditableWarning
          className="absolute inset-0 border-none bg-transparent focus:ring-0 focus:outline-none focus:border-transparent focus-visible:ring-0 focus-visible:ring-offset-0 z-10 text-lg font-medium overflow-y-auto"
          style={mobile ? {
            color: textColor,
            fontSize: fontSize,
            fontFamily: fontFamily,
            minHeight: 40,
            fontWeight: editedNote.fontWeight,
            fontStyle: editedNote.fontStyle,
            textDecoration: editedNote.textDecoration,
            boxShadow: 'none',
            pointerEvents: currentTool === "text" ? "auto" : "none",
            transition: 'font-size 0.2s cubic-bezier(.4,0,.2,1)',
            outline: 'none',
            borderRadius: 8,
            overflowX: 'hidden',
            scrollbarWidth: 'thin',
            padding: 16,
          } : {
            color: textColor,
            fontSize: fontSize,
            fontFamily: fontFamily,
            minHeight: 40,
            fontWeight: editedNote.fontWeight,
            fontStyle: editedNote.fontStyle,
            textDecoration: editedNote.textDecoration,
            boxShadow: 'none',
            pointerEvents: currentTool === "text" ? "auto" : "none",
            transition: 'font-size 0.2s cubic-bezier(.4,0,.2,1)',
            outline: 'none',
            borderRadius: 8,
            overflowX: 'hidden',
            scrollbarWidth: 'thin',
          }}
          onInput={() => {
            updateNote({ text: editorRef.current?.innerHTML || "" });
            if (editorRef.current) {
              editorRef.current.style.fontFamily = fontFamily;
              editorRef.current.style.fontSize = fontSize + 'px';
            }
          }}
        />
        {(!editedNote.text || editedNote.text === '<br>') && (
          <div
            className="absolute top-1 left-1 z-0 pointer-events-none select-none animate-fadeInOut"
            style={{
              color: getPlaceholderColor(),
              fontFamily: 'inherit',
              fontSize: fontSize || 24,
              padding: mobile ? '12px' : '4px',
              opacity: 0.7,
            }}
          >
            Write your message...
          </div>
        )}
      </div>
      {mobile ? (
        <div className="mt-4 flex flex-col gap-2 w-full">
          {/* First row: tool selection, font, text controls, note color */}
          <div className="bg-[#18181b]/90 backdrop-blur-lg border border-white/20 shadow-2xl rounded-xl px-3 py-2 flex flex-nowrap items-center gap-2 z-30 transition-all duration-300 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent overflow-x-auto overflow-y-hidden" style={{ fontFamily: 'inherit', minHeight: 40, fontSize: '12px', width: '100%', maxWidth: '95vw', scrollbarWidth: 'thin', scrollbarColor: '#374151 transparent' }}>
            {/* Fixed width container to prevent layout shifts */}
            <div className="flex items-center gap-2 min-w-max">
                              {/* Tool Toggle */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button variant={currentTool === "text" ? "secondary" : "ghost"} size="icon" onClick={() => setCurrentTool("text")} className={`rounded-md w-7 h-7 p-0 transition-all duration-150 ${currentTool === "text" ? "bg-white text-[#18181b]" : "text-white hover:bg-gray-700"} flex-shrink-0`} style={{ fontFamily: 'inherit', fontSize: '12px' }}><Type className="w-3 h-3" /></Button>
                  <Button variant={currentTool === "brush" ? "secondary" : "ghost"} size="icon" onClick={() => setCurrentTool("brush")} className={`rounded-md w-7 h-7 p-0 transition-all duration-150 ${currentTool === "brush" ? "bg-white text-[#18181b]" : "text-white hover:bg-gray-700"} flex-shrink-0`} style={{ fontFamily: 'inherit', fontSize: '12px' }}><Brush className="w-3 h-3" /></Button>
                  <Button
                    variant={currentTool === "eraser" ? "secondary" : "ghost"}
                    size="icon"
                    onClick={() => setCurrentTool("eraser")}
                    className={`rounded-md w-7 h-7 p-0 transition-all duration-150 ${currentTool === "eraser" ? "bg-white text-[#18181b]" : "text-white hover:bg-gray-700"} flex-shrink-0`}
                    style={{ fontFamily: 'inherit', fontSize: '12px' }}
                    aria-label="Eraser"
                  >
                    {/* Improved eraser SVG icon */}
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-current">
                      <path d="M8.086 2.207a2 2 0 0 1 2.828 0l3.879 3.879a2 2 0 0 1 0 2.828l-5.5 5.5A2 2 0 0 1 7.879 15H5.12a2 2 0 0 1-1.414-.586l-2.5-2.5a2 2 0 0 1 0-2.828l6.879-6.879Z" fill="currentColor" opacity="0.3"/>
                      <path d="M8.086 2.207a2 2 0 0 1 2.828 0l3.879 3.879a2 2 0 0 1 0 2.828l-5.5 5.5A2 2 0 0 1 7.879 15H5.12a2 2 0 0 1-1.414-.586l-2.5-2.5a2 2 0 0 1 0-2.828l6.879-6.879Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                      <path d="m4 11 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </Button>
                </div>
                
                {/* Separator */}
                <div className="w-px h-6 bg-gray-700 flex-shrink-0" />
                
                {/* Tool-specific controls */}
                {/* Text controls: only show in text mode */}
                {currentTool === "text" && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Select value={fontFamily} onValueChange={value => { exec('fontName', value); setFontFamily(value); updateNote({ fontFamily: value }); }}>
                      <SelectTrigger className="w-16 h-7 text-xs bg-gray-800 border-gray-700 text-white font-medium rounded-full flex items-center justify-between" style={{ fontFamily: fontFamily, fontSize: '12px' }}><span style={{ fontFamily: fontFamily }}>{fontFamily}</span></SelectTrigger>
                      <SelectContent>{FONT_FAMILIES.map((font) => (<SelectItem key={font} value={font} className="text-xs" style={{ fontFamily: font, fontWeight: fontFamily === font ? 'bold' : 'normal', fontSize: '12px' }}>{font}</SelectItem>))}</SelectContent>
                    </Select>
                    <Select value={fontSize.toString()} onValueChange={value => { const size = FONT_SIZES[parseInt(value)-1] || 16; exec('fontSize', value); setFontSize(size); updateNote({ fontSize: size }); }}>
                      <SelectTrigger className="w-14 h-7 text-xs bg-gray-800 border-gray-700 text-white font-normal rounded-full flex items-center justify-between" style={{ fontSize: '12px', letterSpacing: '0.01em' }}><span>{fontSize}</span></SelectTrigger>
                      <SelectContent>{FONT_SIZES.map((size, idx) => (<SelectItem key={size} value={(idx+1).toString()} className="text-xs" style={{ fontSize: '12px' }}>{size}</SelectItem>))}</SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" onClick={() => exec('bold')} className="rounded-md w-7 h-7 p-0 text-white hover:bg-gray-700 transition-all duration-150" style={{ fontFamily: 'inherit', fontSize: '12px' }}><Bold className="w-3 h-3" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => exec('italic')} className="rounded-md w-7 h-7 p-0 text-white hover:bg-gray-700 transition-all duration-150" style={{ fontFamily: 'inherit', fontSize: '12px' }}><Italic className="w-3 h-3" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => exec('underline')} className="rounded-md w-7 h-7 p-0 text-white hover:bg-gray-700 transition-all duration-150" style={{ fontFamily: 'inherit', fontSize: '12px' }}><Underline className="w-3 h-3" /></Button>
                    <div className="flex items-center gap-2 relative z-[201]">
                      <ColorPickerPopover value={textColor} onChange={color => { if (currentTool === "text") { exec('foreColor', color); setTextColor(color); updateNote({ textColor: color }); } else { setTextColor(color); updateNote({ textColor: color }); } }} label="Font color" colors={["#222222", "#FF5630", "#FFAB00", "#36B37E", "#00B8D9", "#6554C0", "#FFFFFF"]} />
                    </div>
                  </div>
                )}
                {/* Brush controls: only show in brush mode */}
                {currentTool === "brush" && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-white">Brush</span>
                    <Slider min={1} max={20} step={1} value={[brushSize]} onValueChange={([v]) => setBrushSize(v)} className="w-24 brush-slider" />
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white">Color</span>
                      <input
                        type="color"
                        value={brushColor}
                        onChange={(e) => setBrushColor(e.target.value)}
                        className="w-6 h-6 rounded-full border-2 border-gray-300 cursor-pointer"
                        style={{ fontFamily: 'inherit' }}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => { if (historyStep > 0) setHistoryStep((prev) => prev - 1); }}
                      className="rounded-md w-7 h-7 p-0 text-white hover:bg-gray-700 transition-all duration-150 flex-shrink-0"
                      style={{ fontFamily: 'inherit', fontSize: '12px' }}
                      disabled={historyStep <= 0}
                      tabIndex={0}
                      aria-label="Undo drawing"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => { if (historyStep < drawingHistory.length - 1) setHistoryStep((prev) => prev + 1); }}
                      className="rounded-md w-7 h-7 p-0 text-white hover:bg-gray-700 transition-all duration-150 flex-shrink-0"
                      style={{ fontFamily: 'inherit', fontSize: '12px' }}
                      disabled={historyStep >= drawingHistory.length - 1}
                      tabIndex={0}
                      aria-label="Redo drawing"
                    >
                      <RotateCw className="w-3 h-3" />
                    </Button>
                  </div>
                )}
                {/* Eraser mode: show minimal controls */}
                {currentTool === "eraser" && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-white">Eraser Active</span>
                    <span className="text-xs text-white opacity-75">Click to clear all drawings</span>
                  </div>
                )}
                
                {/* Separator */}
                <div className="w-px h-6 bg-gray-700 flex-shrink-0" />
                
                {/* Note Color Picker */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <ColorPickerPopover value={backgroundColor} onChange={color => { setBackgroundColor(color); updateNote({ backgroundColor: color }); }} label="Sticky note color" />
                </div>
            </div>
          </div>
          {/* Second row: only the Send button, centered and lower */}
          <div className="flex justify-center w-full mt-8 mb-2">
            <Button onClick={() => { handleSave(); }} size="lg" className="rounded-full bg-green-400 hover:bg-green-500 text-[#18181b] px-8 h-12 text-lg font-bold shadow transition-all duration-150 border border-green-400" style={{ fontFamily: 'inherit', boxShadow: 'none' }}
              disabled={isSubmitting || (isTextEmpty() && !hasDrawing())}
            >Send</Button>
          </div>
          {/* Success modal popup with dark overlay */}
          {sent && (
            <div className="fixed inset-0 flex items-center justify-center z-50">
              <div className="absolute inset-0 bg-black bg-opacity-60"></div>
              <div className="relative bg-green-500 text-white font-semibold rounded-2xl px-8 py-5 shadow-2xl text-xl animate-fadeOutModal" style={{ minWidth: 220, maxWidth: 320, textAlign: 'center' }}>
                Note sent successfully!
              </div>
              <style jsx global>{`
                @keyframes fadeOutModal {
                  0% { opacity: 0; transform: scale(0.95); }
                  10% { opacity: 1; transform: scale(1); }
                  80% { opacity: 1; transform: scale(1); }
                  100% { opacity: 0; transform: scale(1.05); }
                }
                .animate-fadeOutModal {
                  animation: fadeOutModal 2s cubic-bezier(.4,0,.2,1) forwards;
                }
              `}</style>
            </div>
          )}
        </div>
      ) : (
        // Desktop: keep single row toolbar as before
        <div className="mt-4 bg-[#18181b]/90 backdrop-blur-lg border border-white/20 shadow-2xl rounded-xl px-6 py-3 z-30 transition-all duration-300 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent" style={{ fontFamily: 'inherit', minHeight: 56, width: '900px', maxWidth: '95vw' }}>
          {/* Fixed width container to prevent layout shifts */}
          <div className="flex items-center justify-between w-full">
            {/* Left section: Tool Toggle */}
            <div className="flex items-center gap-3">
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
                {/* Improved eraser SVG icon */}
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-current">
                  <path d="M8.086 2.207a2 2 0 0 1 2.828 0l3.879 3.879a2 2 0 0 1 0 2.828l-5.5 5.5A2 2 0 0 1 7.879 15H5.12a2 2 0 0 1-1.414-.586l-2.5-2.5a2 2 0 0 1 0-2.828l6.879-6.879Z" fill="currentColor" opacity="0.3"/>
                  <path d="M8.086 2.207a2 2 0 0 1 2.828 0l3.879 3.879a2 2 0 0 1 0 2.828l-5.5 5.5A2 2 0 0 1 7.879 15H5.12a2 2 0 0 1-1.414-.586l-2.5-2.5a2 2 0 0 1 0-2.828l6.879-6.879Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                  <path d="m4 11 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </Button>
              <div className="w-px h-6 bg-gray-700 mx-2 transition-all duration-300" />
            </div>
            {/* Center section: Tool-specific controls with fixed width container */}
            <div className="flex-1 flex items-center justify-center" style={{ minWidth: '400px' }}>
              {/* Text Controls (show only in text mode) */}
              {currentTool === "text" && (
                <div className="flex items-center gap-3">
                  <Select value={fontFamily} onValueChange={value => { exec('fontName', value); setFontFamily(value); updateNote({ fontFamily: value }); }}>
                    <SelectTrigger className="w-28 h-8 text-xs bg-gray-800 border-gray-700 text-white font-medium rounded-full flex items-center justify-between" style={{ fontFamily: fontFamily }}>
                      <span style={{ fontFamily: fontFamily }}>{fontFamily}</span>
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_FAMILIES.map((font) => (
                        <SelectItem key={font} value={font} className="text-xs" style={{ fontFamily: font, fontWeight: fontFamily === font ? 'bold' : 'normal' }}>{font}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={fontSize.toString()} onValueChange={value => { const size = FONT_SIZES[parseInt(value)-1] || 16; exec('fontSize', value); setFontSize(size); updateNote({ fontSize: size }); }}>
                    <SelectTrigger className="w-20 h-8 text-xs bg-gray-800 border-gray-700 text-white font-normal rounded-full flex items-center justify-between" style={{ fontSize: '12px', letterSpacing: '0.01em' }}><span>{fontSize}</span></SelectTrigger>
                    <SelectContent>{FONT_SIZES.map((size, idx) => (<SelectItem key={size} value={(idx+1).toString()} className="text-xs" style={{ fontSize: '12px' }}>{size}</SelectItem>))}</SelectContent>
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
                      value={textColor}
                      onChange={color => {
                        if (currentTool === "text") {
                          exec('foreColor', color);
                          setTextColor(color);
                          updateNote({ textColor: color });
                        } else {
                          setTextColor(color);
                          updateNote({ textColor: color });
                        }
                      }}
                      label="Font color"
                      colors={["#222222", "#FF5630", "#FFAB00", "#36B37E", "#00B8D9", "#6554C0", "#FFFFFF"]}
                    />
                  </div>
                </div>
              )}
              {/* Brush Controls (show only in brush mode) */}
              {currentTool === "brush" && (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-white">Brush</span>
                  <Slider min={1} max={20} step={1} value={[brushSize]} onValueChange={([v]) => setBrushSize(v)} className="w-32 brush-slider" />
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white">Color</span>
                    <input
                      type="color"
                      value={brushColor}
                      onChange={(e) => setBrushColor(e.target.value)}
                      className="w-8 h-8 rounded-full border-2 border-gray-300 cursor-pointer"
                      style={{ fontFamily: 'inherit' }}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { if (historyStep > 0) setHistoryStep((prev) => prev - 1); }}
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
                    onClick={() => { if (historyStep < drawingHistory.length - 1) setHistoryStep((prev) => prev + 1); }}
                    className="rounded-md w-8 h-8 p-0 text-white hover:bg-gray-700 transition-all duration-150 flex-shrink-0"
                    style={{ fontFamily: 'inherit' }}
                    disabled={historyStep >= drawingHistory.length - 1}
                    tabIndex={0}
                    aria-label="Redo drawing"
                  >
                    <RotateCw className="w-4 h-4" />
                  </Button>
                </div>
              )}
              {/* Eraser mode: show minimal controls */}
              {currentTool === "eraser" && (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-white">Eraser Active</span>
                  <span className="text-xs text-white opacity-75">Click to clear all drawings</span>
                </div>
              )}
            </div>
            {/* Right section: Note Color and Save */}
            <div className="flex items-center gap-3">
              <div className="w-px h-6 bg-gray-700 mx-2 transition-all duration-300" />
              <div className="relative flex items-center gap-2 flex-shrink-0 min-w-0">
                <ColorPickerPopover
                  value={backgroundColor}
                  onChange={color => { setBackgroundColor(color); updateNote({ backgroundColor: color }); }}
                  label="Sticky note color"
                />
              </div>
              <div className="w-px h-6 bg-gray-700 mx-2 transition-all duration-300" />
              <Button
                onClick={handleSave}
                size="sm"
                className="rounded-md bg-green-300 hover:bg-green-400 text-[#18181b] px-4 h-8 text-base font-semibold shadow transition-all duration-150 border border-green-400"
                style={{ fontFamily: 'inherit', boxShadow: 'none' }}
                disabled={isSubmitting || (isTextEmpty() && !hasDrawing())}
              >
                <Check className="w-4 h-4 mr-1" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ColorPickerPopover (reuse from StickyNoteModal)
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
        <button className="w-8 h-8 rounded-full border-2 border-gray-400 flex items-center justify-center bg-white shadow cursor-pointer mx-1 align-middle" style={{ verticalAlign: 'middle' }}>
          <span className="w-6 h-6 rounded-full border-2" style={{ background: value, borderColor: value === '#FFFFFF' ? '#bbb' : value, boxShadow: value === '#FFFFFF' ? '0 0 0 2px #bbb' : undefined }} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="flex flex-col items-center gap-2 w-auto min-w-[220px] p-3 z-[300]">
        <div className="flex items-center gap-2">
          {colors.map((color: string) => (
            <button
              key={color}
              className={`w-7 h-7 rounded-full border-2 ${value === color ? 'border-black' : 'border-gray-300'} hover:border-gray-400 transition-all duration-100`}
              style={{ background: color, verticalAlign: 'middle' }}
              onClick={() => onChange(color)}
              aria-label={label}
            />
          ))}
          {/* Color wheel */}
          <input
            type="color"
            value={custom}
            onChange={(e) => { setCustom(e.target.value); onChange(e.target.value); }}
            className="w-7 h-7 rounded-full border-2 border-gray-300 cursor-pointer align-middle"
            aria-label="Custom color"
            style={{ verticalAlign: 'middle' }}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
} 