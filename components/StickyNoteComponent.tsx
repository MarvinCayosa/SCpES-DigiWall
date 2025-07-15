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
  const animationFrameRef = useRef<number | undefined>(undefined)
  const dragStartTime = useRef<number>(0)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isZoomingOut, setIsZoomingOut] = useState(false)

  // Timer ref for distinguishing single vs double click
  const clickTimer = useRef<NodeJS.Timeout | null>(null);

  // Track if a drag occurred to prevent click/double-click after drag
  const didDragRef = useRef(false);

  // Detect if device supports hover
  const [hasHover, setHasHover] = useState(true);
  useEffect(() => {
    if (window.matchMedia('(hover: none)').matches) {
      setHasHover(false);
    }
  }, []);

  // Update handleMouseDown and mouse move/up logic
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
      didDragRef.current = false;

      // Add global mouse event listeners for smoother dragging
      const handleGlobalMouseMove = (e: MouseEvent) => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
        }
        didDragRef.current = true;
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
        document.removeEventListener("mousemove", handleGlobalMouseMove)
        document.removeEventListener("mouseup", handleGlobalMouseUp)
      }

      document.addEventListener("mousemove", handleGlobalMouseMove)
      document.addEventListener("mouseup", handleGlobalMouseUp)
    },
    [note.x, note.y, onMove],
  )

  // Touch support for dragging notes on mobile
  const handleGlobalTouchMoveRef = useRef<(e: TouchEvent) => void | undefined>(undefined);
  const handleGlobalTouchEndRef = useRef<(e: TouchEvent) => void | undefined>(undefined);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    window.dispatchEvent(new Event('note-drag-start'));
    setIsDragging(true);
    dragStartTime.current = Date.now();
    setDragStart({
      x: touch.clientX - note.x,
      y: touch.clientY - note.y,
    });

    handleGlobalTouchMoveRef.current = (te: TouchEvent) => {
      if (te.touches.length !== 1) return;
      te.preventDefault();
      te.stopPropagation();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(() => {
        const t = te.touches[0];
        const newX = t.clientX - dragStart.x;
        const newY = t.clientY - dragStart.y;
        onMove(newX, newY);
      });
    };
    handleGlobalTouchEndRef.current = (te: TouchEvent) => {
      te.preventDefault();
      te.stopPropagation();
      setIsDragging(false);
      window.dispatchEvent(new Event('note-drag-end'));
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (handleGlobalTouchMoveRef.current) {
        document.removeEventListener('touchmove', handleGlobalTouchMoveRef.current, { passive: false } as any);
      }
      if (handleGlobalTouchEndRef.current) {
        document.removeEventListener('touchend', handleGlobalTouchEndRef.current, { passive: false } as any);
      }
    };
    document.addEventListener('touchmove', handleGlobalTouchMoveRef.current!, { passive: false });
    document.addEventListener('touchend', handleGlobalTouchEndRef.current!, { passive: false });
  }, [note.x, note.y, onMove]);

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
          // Scale the drawing proportionally to fit the preview canvas
          const srcW = note.drawingData && note.drawingData.width ? note.drawingData.width : img.width;
          const srcH = note.drawingData && note.drawingData.height ? note.drawingData.height : img.height;
          const destW = canvas.width
          const destH = canvas.height
          // Calculate aspect ratio fit
          let drawW = destW, drawH = destH, offsetX = 0, offsetY = 0;
          const srcAspect = srcW / srcH;
          const destAspect = destW / destH;
          if (srcAspect > destAspect) {
            drawW = destW;
            drawH = destW / srcAspect;
            offsetY = (destH - drawH) / 2;
          } else {
            drawH = destH;
            drawW = destH * srcAspect;
            offsetX = (destW - drawW) / 2;
          }
          ctx.drawImage(img, 0, 0, srcW, srcH, offsetX, offsetY, drawW, drawH)
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
        touchAction: 'none', // Prevent default touch behaviors on mobile
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onClick={(e) => {
        // Only trigger onClick if not clicking a control button or dragging
        if ((e.target as HTMLElement).closest('.note-control-btn')) return;
        if (isDragging) return;
        if (didDragRef.current) return;
        if (clickTimer.current) {
          clearTimeout(clickTimer.current);
          clickTimer.current = null;
        }
        if (!hasHover) {
          // Touch device logic: single tap shows controls, double tap opens view modal
          if (e.detail === 2) {
            // Double tap: open view modal (not edit)
            onClick();
          } else {
            // Single tap: show controls
            setShowControls(true);
          }
        } else {
          // Desktop logic: double click opens edit modal, single click brings to front
          if (e.detail === 2) {
            onEdit();
          } else {
            clickTimer.current = setTimeout(() => {
              onClick();
              clickTimer.current = null;
            }, 200);
          }
        }
      }}
      onMouseEnter={() => hasHover && !isDragging && setShowControls(true)}
      onMouseLeave={() => hasHover && !isDragging && setShowControls(false)}
      onTouchEnd={() => setShowControls(false)}
      onTouchCancel={() => setShowControls(false)}
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
            width={168}
            height={168}
            className="absolute left-1/2 top-1/2 pointer-events-none z-0"
            style={{ opacity: 0.8, transform: 'translate(-50%, -50%)' }}
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
