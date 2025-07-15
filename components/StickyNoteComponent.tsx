"use client"

import type React from "react"

import { useRef, useCallback, useState, useEffect } from "react"
import type { StickyNote } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Edit3, Trash2 } from "lucide-react"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog"

interface StickyNoteComponentProps {
  note: StickyNote
  onClick: () => void // for view modal (double click)
  onEdit: () => void // for edit modal (edit button)
  onMove: (x: number, y: number) => void
  onDelete: (noteId: string) => void
}

export default function StickyNoteComponent({ note, onClick, onEdit, onMove, onDelete }: StickyNoteComponentProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [showControls, setShowControls] = useState(false)
  const noteRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number>()
  const dragStartTime = useRef<number>(0)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isZoomingOut, setIsZoomingOut] = useState(false)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      e.preventDefault()

      window.dispatchEvent(new Event('note-drag-start'));
      setIsDragging(true)
      dragStartTime.current = Date.now()
      setDragStart({
        x: e.clientX - note.x,
        y: e.clientY - note.y,
      })

      // Add global mouse event listeners for smoother dragging
      const handleGlobalMouseMove = (e: MouseEvent) => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
        }

        animationFrameRef.current = requestAnimationFrame(() => {
          const newX = e.clientX - dragStart.x
          const newY = e.clientY - dragStart.y
          onMove(newX, newY)
        })
      }

      const handleGlobalMouseUp = () => {
        setIsDragging(false)
        window.dispatchEvent(new Event('note-drag-end'));

        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
        }

        // Only trigger onMove if we actually dragged (not just a click)
        // No need to call onMove again, already called in real time

        document.removeEventListener("mousemove", handleGlobalMouseMove)
        document.removeEventListener("mouseup", handleGlobalMouseUp)
      }

      document.addEventListener("mousemove", handleGlobalMouseMove)
      document.addEventListener("mouseup", handleGlobalMouseUp)
    },
    [note.x, note.y, onMove],
  )

  const handleEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      e.preventDefault()
      onEdit()
    },
    [onEdit],
  )

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      e.preventDefault()
      setShowDeleteDialog(true)
    },
    []
  )

  const confirmDelete = useCallback(() => {
    setIsZoomingOut(true)
    setTimeout(() => {
      setIsZoomingOut(false)
      setShowDeleteDialog(false)
      onDelete(note.id)
    }, 350)
  }, [note.id, onDelete])

  // Render drawing on canvas
  useEffect(() => {
    if (note.drawingData?.imageData && canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")
      if (ctx) {
        const img = new Image()
        img.crossOrigin = "anonymous"
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          // Scale the drawing to fit the smaller canvas
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        }
        img.src = note.drawingData.imageData
      }
    }
  }, [note.drawingData])

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  // In the sticky note preview, scale the content for WYSIWYG with aspect ratio
  const modalWidth = 400; // was 600
  const modalHeight = 400; // was 600
  const scaleX = note.width / modalWidth;
  const scaleY = note.height / modalHeight;

  return (
    <>
    <div
      ref={noteRef}
      className={`absolute select-none shadow-lg hover:shadow-xl transition-all duration-200 group ${
        isDragging ? "cursor-grabbing z-50 scale-105" : "cursor-grab hover:scale-102"
        } ${isZoomingOut ? "animate-zoomOut" : ""}`}
      style={{
          left: note.x,
          top: note.y,
          width: note.width * 1.25, // 25% bigger
          height: note.height * 1.25, // 25% bigger
        backgroundColor: note.backgroundColor,
        transform: `rotate(-1deg) ${isDragging ? "scale(1.05)" : ""}`,
        borderRadius: "4px",
        willChange: isDragging ? "transform" : "auto",
        transition: isDragging ? "none" : "all 0.2s ease-out",
      }}
      onMouseDown={handleMouseDown}
        onDoubleClick={(e) => {
          // Only trigger onClick if not clicking a control button
          if ((e.target as HTMLElement).closest('.note-control-btn')) return;
          if (!isDragging) onClick();
        }}
      onMouseEnter={() => !isDragging && setShowControls(true)}
      onMouseLeave={() => !isDragging && setShowControls(false)}
    >
      {/* Control Buttons */}
      <div
          className={`absolute -top-3 -right-3 flex gap-2 transition-all duration-300 backdrop-blur-md bg-white/30 border border-white/40 shadow-xl rounded-2xl p-1.5 ${
          showControls && !isDragging ? "opacity-100 scale-100" : "opacity-0 scale-90"
        }`}
          style={{ boxShadow: "0 4px 24px 0 rgba(0,0,0,0.10)", WebkitBackdropFilter: "blur(8px)", backdropFilter: "blur(8px)" }}
      >
          <Tooltip>
            <TooltipTrigger asChild>
        <Button
          size="icon"
          variant="secondary"
                className="note-control-btn w-8 h-8 rounded-full bg-blue-500/80 hover:bg-blue-600/90 text-white shadow-lg transition-all duration-200 hover:scale-110 focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
          onClick={handleEdit}
                tabIndex={0}
                aria-label="Edit note"
        >
                <Edit3 className="w-4 h-4" />
        </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Edit</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
        <Button
          size="icon"
          variant="secondary"
                className="note-control-btn w-8 h-8 rounded-full bg-red-500/80 hover:bg-red-600/90 text-white shadow-lg transition-all duration-200 hover:scale-110 focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
          onClick={handleDelete}
                tabIndex={0}
                aria-label="Delete note"
        >
                <Trash2 className="w-4 h-4" />
        </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Delete</TooltipContent>
          </Tooltip>
      </div>

        {/* In the sticky note preview, scale the content for WYSIWYG with aspect ratio */}
        <div
          className="p-6 h-full flex flex-col justify-between relative pointer-events-none"
          style={{ overflow: 'hidden' }}
        >
        {/* Drawing Canvas - positioned behind text */}
        {note.drawingData?.imageData && (
          <canvas
            ref={canvasRef}
            width={note.width - 32}
            height={note.height - 32}
            className="absolute inset-4 pointer-events-none z-0"
            style={{ opacity: 0.8 }}
          />
        )}
          {/* Scaled WYSIWYG Content */}
          <div
            style={{
              width: modalWidth,
              height: modalHeight,
              transform: `scale(${scaleX}, ${scaleY})`,
              transformOrigin: 'top left',
              pointerEvents: 'none',
              position: 'relative',
            }}
          >
        <div
              className="flex-1 overflow-hidden relative z-10 text-lg font-medium"
          style={{
            color: note.textColor,
                fontSize: note.fontSize,
            fontFamily: note.fontFamily,
            fontWeight: note.fontWeight,
            fontStyle: note.fontStyle,
            textDecoration: note.textDecoration,
                boxShadow: 'none',
                transition: 'font-size 0.2s cubic-bezier(.4,0,.2,1)',
          }}
        >
              {note.text && <div className="whitespace-pre-wrap break-words" dangerouslySetInnerHTML={{ __html: note.text }} />}
            </div>
          </div>
        </div>
      </div>
      {/* Delete Confirmation Modal */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="backdrop-blur-md bg-white/80 border border-white/40 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sticky Note?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this note? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline">Cancel</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button variant="destructive" onClick={confirmDelete} autoFocus>Delete</Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
