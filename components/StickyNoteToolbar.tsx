import React from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Type, Brush, Bold, Italic, Underline, RotateCcw, RotateCw } from "lucide-react";
// import ColorPickerPopover from wherever it is defined
import type { Dispatch, SetStateAction } from "react";
import type { ToolType } from "./StickyNoteEditor";

interface StickyNoteToolbarProps {
  currentTool: ToolType;
  setCurrentTool: Dispatch<SetStateAction<ToolType>>;
  brushSize: number;
  setBrushSize: Dispatch<SetStateAction<number>>;
  fontFamily: string;
  setFontFamily: Dispatch<SetStateAction<string>>;
  fontSize: number;
  setFontSize: Dispatch<SetStateAction<number>>;
  textColor: string;
  setTextColor: Dispatch<SetStateAction<string>>;
  backgroundColor: string;
  setBackgroundColor: Dispatch<SetStateAction<string>>;
  handleUndo: () => void;
  handleRedo: () => void;
  historyStep: number;
  drawingHistory: string[];
  handleSave: () => void;
}

const FONT_FAMILIES = ["Arial", "Helvetica", "Georgia", "Verdana", "Comic Sans MS"];
const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32];

export default function StickyNoteToolbar({
  currentTool, setCurrentTool,
  brushSize, setBrushSize,
  fontFamily, setFontFamily,
  fontSize, setFontSize,
  textColor, setTextColor,
  backgroundColor, setBackgroundColor,
  handleUndo, handleRedo, historyStep, drawingHistory,
  handleSave
}: StickyNoteToolbarProps) {
  return (
    <div className="h-full w-28 flex flex-col items-center gap-3 py-6 px-2 bg-white/30 backdrop-blur-xl border-l border-white/40 shadow-2xl rounded-r-2xl z-30 transition-all duration-300" style={{fontFamily: 'SF Pro Display, Arial, Helvetica, sans-serif'}}>
      {/* Tool selection */}
      <Button variant={currentTool === "text" ? "secondary" : "ghost"} size="icon" onClick={() => setCurrentTool("text")} className="mb-2"><Type /></Button>
      <Button variant={currentTool === "brush" ? "secondary" : "ghost"} size="icon" onClick={() => setCurrentTool("brush")} className="mb-2"><Brush /></Button>
      <Button variant={currentTool === "eraser" ? "secondary" : "ghost"} size="icon" onClick={() => setCurrentTool("eraser")} className="mb-4"><svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="3" y="13" width="10" height="4" rx="1" fill="#bbb"/><rect x="5" y="3" width="10" height="10" rx="2" fill="#fff" stroke="#bbb" strokeWidth="2"/></svg></Button>
      {/* Font controls (show only in text mode) */}
      {currentTool === "text" && (
        <>
          <Select value={fontFamily} onValueChange={setFontFamily}>
            <SelectTrigger className="w-full h-8 text-xs bg-gray-800 border-gray-700 text-white font-medium rounded-full mb-2"><SelectValue /></SelectTrigger>
            <SelectContent>{FONT_FAMILIES.map(font => <SelectItem key={font} value={font} className="text-xs" style={{fontFamily: font}}>{font}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={fontSize.toString()} onValueChange={v => setFontSize(Number(v))}>
            <SelectTrigger className="w-full h-8 text-xs bg-gray-800 border-gray-700 text-white font-medium rounded-full mb-2"><SelectValue /></SelectTrigger>
            <SelectContent>{FONT_SIZES.map(size => <SelectItem key={size} value={size.toString()} className="text-xs">{size}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="ghost" size="icon" onClick={() => setTextColor('#000')} className="mb-2"><Bold /></Button>
          <Button variant="ghost" size="icon" onClick={() => setTextColor('#000')} className="mb-2"><Italic /></Button>
          <Button variant="ghost" size="icon" onClick={() => setTextColor('#000')} className="mb-2"><Underline /></Button>
          {/* ColorPickerPopover for textColor here */}
        </>
      )}
      {/* Brush controls (show only in brush mode) */}
      {currentTool === "brush" && (
        <>
          <span className="text-xs text-white mb-1">Brush</span>
          {/* Slider for brushSize here */}
          {/* ColorPickerPopover for textColor here */}
        </>
      )}
      {/* Undo/Redo (brush mode) */}
      {currentTool === "brush" && (
        <>
          <Button variant="ghost" size="icon" onClick={handleUndo} disabled={historyStep <= 0} className="mb-2"><RotateCcw /></Button>
          <Button variant="ghost" size="icon" onClick={handleRedo} disabled={historyStep >= drawingHistory.length - 1} className="mb-4"><RotateCw /></Button>
        </>
      )}
      {/* Note color always visible */}
      {/* ColorPickerPopover for backgroundColor here */}
      <Button onClick={handleSave} size="sm" className="rounded-md bg-green-300 hover:bg-green-400 text-[#18181b] px-4 h-8 text-base font-semibold shadow transition-all duration-150 border border-green-400 mt-auto"><Check className="w-4 h-4 mr-1" /></Button>
    </div>
  );
} 