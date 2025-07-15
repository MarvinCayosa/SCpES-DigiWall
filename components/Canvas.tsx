"use client"

import type React from "react"

import { forwardRef, useCallback, useRef, useEffect } from "react"
import type { StickyNote } from "@/lib/types"
import StickyNoteComponent from "./StickyNoteComponent"

interface CanvasProps {
  stickyNotes: StickyNote[]
  zoom: number
  pan: { x: number; y: number }
  onNoteClick: (note: StickyNote) => void
  onNoteEdit: (note: StickyNote) => void
  onNoteMove: (noteId: string, x: number, y: number) => void
  onNoteDelete: (noteId: string) => void
  onZoomChange: (zoom: number) => void
  onPanChange: (pan: { x: number; y: number }) => void
}

// Add a global variable to track if a note is being dragged
let isNoteDraggingGlobal = false;

const Canvas = forwardRef<HTMLDivElement, CanvasProps>(
  ({ stickyNotes, zoom, pan, onNoteClick, onNoteEdit, onNoteMove, onNoteDelete, onZoomChange, onPanChange }, ref) => {
    const isDragging = useRef(false)
    const lastPanPoint = useRef({ x: 0, y: 0 })
    const startPan = useRef({ x: 0, y: 0 })
    const animationFrameRef = useRef<number>()

    // Listen for note drag events
    useEffect(() => {
      window.addEventListener('note-drag-start', () => { isNoteDraggingGlobal = true; });
      window.addEventListener('note-drag-end', () => { isNoteDraggingGlobal = false; });
      return () => {
        window.removeEventListener('note-drag-start', () => { isNoteDraggingGlobal = true; });
        window.removeEventListener('note-drag-end', () => { isNoteDraggingGlobal = false; });
      };
    }, []);

    const handleWheel = useCallback(
      (e: React.WheelEvent) => {
        e.preventDefault()

        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
        }

        animationFrameRef.current = requestAnimationFrame(() => {
          if (e.ctrlKey || e.metaKey) {
            // Smooth zoom
            const delta = e.deltaY > 0 ? 0.95 : 1.05
            const newZoom = Math.max(0.1, Math.min(3, zoom * delta))
            onZoomChange(newZoom)
          } else {
            // Smooth pan
            onPanChange({
              x: pan.x - e.deltaX * 0.5,
              y: pan.y - e.deltaY * 0.5,
            })
          }
        })
      },
      [zoom, pan, onZoomChange, onPanChange],
    )

    const handleMouseDown = useCallback(
      (e: React.MouseEvent) => {
        if (isNoteDraggingGlobal) return;
        // Only allow panning with mouse (desktop)
        if (e.type === 'mousedown') {
          isDragging.current = true
          lastPanPoint.current = { x: e.clientX, y: e.clientY }
          startPan.current = { ...pan };

          const handleGlobalMouseMove = (e: MouseEvent) => {
            if (!isDragging.current) return

            if (animationFrameRef.current) {
              cancelAnimationFrame(animationFrameRef.current)
            }

            animationFrameRef.current = requestAnimationFrame(() => {
              const deltaX = e.clientX - lastPanPoint.current.x
              const deltaY = e.clientY - lastPanPoint.current.y
              onPanChange({
                x: startPan.current.x + (e.clientX - lastPanPoint.current.x),
                y: startPan.current.y + (e.clientY - lastPanPoint.current.y),
              })
            })
          }

          const handleGlobalMouseUp = () => {
            isDragging.current = false
            if (animationFrameRef.current) {
              cancelAnimationFrame(animationFrameRef.current)
            }
            document.removeEventListener("mousemove", handleGlobalMouseMove)
            document.removeEventListener("mouseup", handleGlobalMouseUp)
          }

          document.addEventListener("mousemove", handleGlobalMouseMove)
          document.addEventListener("mouseup", handleGlobalMouseUp)
        }
      },
      [pan, onPanChange],
    )

    // Prevent single-finger drag panning on mobile; allow only two-finger (pinch/zoom) for board movement
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
      if (isNoteDraggingGlobal) return;
      if (e.touches.length > 1) {
        // Allow panning/zooming with two fingers
        isDragging.current = true;
        lastPanPoint.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        startPan.current = { ...pan };
        // You can implement pinch/zoom logic here if desired
      } else {
        // Prevent single-finger drag from panning the board
        isDragging.current = false;
      }
    }, [pan]);

    // Cleanup animation frame on unmount
    useEffect(() => {
      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
        }
      }
    }, [])

    return (
      <div
        ref={ref}
        className="w-full h-full cursor-grab active:cursor-grabbing overflow-hidden"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        style={{
          backgroundImage: `radial-gradient(circle, #e5e5e5 1px, transparent 1px)`,
          backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      >
        <div
          style={{
            width: 5000,
            height: 5000,
            position: 'relative',
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
            willChange: "transform",
          }}
        >
          {stickyNotes.map((note) => (
            <StickyNoteComponent
              key={note.id}
              note={note}
              onClick={() => onNoteClick(note)}
              onEdit={() => onNoteEdit(note)}
              onMove={(x, y) => onNoteMove(note.id, x, y)}
              onDelete={onNoteDelete}
            />
          ))}
        </div>
      </div>
    )
  },
)

Canvas.displayName = "Canvas"

export default Canvas
