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
    const animationFrameRef = useRef<number | undefined>(undefined)

    // Pinch-to-zoom and inertia state
    const lastTouchDistance = useRef<number | null>(null);
    const velocity = useRef({ x: 0, y: 0 });
    const inertiaFrame = useRef<number | null>(null);
    // --- NEW: Always use latest zoom and pan for touch gestures ---
    const zoomRef = useRef(zoom);
    const panRef = useRef(pan);
    useEffect(() => { zoomRef.current = zoom; }, [zoom]);
    useEffect(() => { panRef.current = pan; }, [pan]);

    // Listen for note drag events
    useEffect(() => {
      const handleDragStart = () => { isNoteDraggingGlobal = true; };
      const handleDragEnd = () => { isNoteDraggingGlobal = false; };
      
      window.addEventListener('note-drag-start', handleDragStart);
      window.addEventListener('note-drag-end', handleDragEnd);
      return () => {
        window.removeEventListener('note-drag-start', handleDragStart);
        window.removeEventListener('note-drag-end', handleDragEnd);
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

    // Allow single-finger drag panning on mobile
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
      if (isNoteDraggingGlobal) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (e.touches.length === 1) {
        // Allow panning with one finger
        isDragging.current = true;
        lastPanPoint.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        startPan.current = { ...panRef.current };
        velocity.current = { x: 0, y: 0 };

        const handleGlobalTouchMove = (te: TouchEvent) => {
          if (!isDragging.current || isNoteDraggingGlobal) return;
          te.preventDefault();
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
          }
          animationFrameRef.current = requestAnimationFrame(() => {
            if (isNoteDraggingGlobal) return;
            const deltaX = te.touches[0].clientX - lastPanPoint.current.x;
            const deltaY = te.touches[0].clientY - lastPanPoint.current.y;
            velocity.current = { x: deltaX, y: deltaY };
            onPanChange({
              x: startPan.current.x + (te.touches[0].clientX - lastPanPoint.current.x),
              y: startPan.current.y + (te.touches[0].clientY - lastPanPoint.current.y),
            });
          });
        };

        const handleGlobalTouchEnd = () => {
          isDragging.current = false;
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
          }
          document.removeEventListener('touchmove', handleGlobalTouchMove);
          document.removeEventListener('touchend', handleGlobalTouchEnd);
          // --- Reset all refs ---
          isDragging.current = false;
          lastPanPoint.current = { x: 0, y: 0 };
          startPan.current = { x: 0, y: 0 };
          velocity.current = { x: 0, y: 0 };
        };

        document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
        document.addEventListener('touchend', handleGlobalTouchEnd, { passive: false });
      } else if (e.touches.length === 2) {
        // Pinch-to-zoom
        lastTouchDistance.current = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        // --- Use latest zoom for pinch ---
        const initialZoom = zoomRef.current;
        const handlePinchMove = (te: TouchEvent) => {
          if (te.touches.length !== 2) return;
          te.preventDefault();
          const newDistance = Math.hypot(
            te.touches[0].clientX - te.touches[1].clientX,
            te.touches[0].clientY - te.touches[1].clientY
          );
          const scale = newDistance / (lastTouchDistance.current || newDistance);
          onZoomChange(Math.max(0.1, Math.min(3, initialZoom * scale)));
        };
        const handlePinchEnd = () => {
          lastTouchDistance.current = null;
          document.removeEventListener('touchmove', handlePinchMove);
          document.removeEventListener('touchend', handlePinchEnd);
          // --- Reset all refs ---
          isDragging.current = false;
          lastPanPoint.current = { x: 0, y: 0 };
          startPan.current = { x: 0, y: 0 };
          velocity.current = { x: 0, y: 0 };
        };
        document.addEventListener('touchmove', handlePinchMove, { passive: false });
        document.addEventListener('touchend', handlePinchEnd, { passive: false });
      }
    }, [onPanChange, onZoomChange]);

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
          touchAction: 'none', // Prevent default touch behaviors on mobile
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
