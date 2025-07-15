"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import type { StickyNote, Tool } from "@/lib/types"
import Canvas from "@/components/Canvas"
import StickyNoteModal, { ViewStickyNoteModal } from "@/components/StickyNoteModal"
import Toolbar from "@/components/Toolbar"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { db } from "@/lib/firebase"
import { ref, onValue, set, update, remove } from "firebase/database"

export default function DigitalFreedomWall() {
  const [stickyNotes, setStickyNotes] = useState<StickyNote[]>([])
  const [selectedNote, setSelectedNote] = useState<StickyNote | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [currentTool, setCurrentTool] = useState<Tool>("select")
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const canvasRef = useRef<HTMLDivElement>(null)

  // Canvas size for bounds
  const CANVAS_SIZE = 5000;

  // Typing effect for Digital Wall
  const TYPING_TEXT = "DigiWall";
  const TYPING_SPEED = 80; // ms per character
  const PAUSE_TIME = 1200; // ms pause at full text
  const DELETE_SPEED = 40; // ms per character
  const LOOP_DELAY = 800; // ms before restarting
  const [typed, setTyped] = useState("");
  const [typing, setTyping] = useState(true);
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (typing) {
      if (typed.length < TYPING_TEXT.length) {
        timeout = setTimeout(() => setTyped(TYPING_TEXT.slice(0, typed.length + 1)), TYPING_SPEED);
      } else {
        timeout = setTimeout(() => setTyping(false), PAUSE_TIME);
      }
    } else {
      if (typed.length > 0) {
        timeout = setTimeout(() => setTyped(TYPING_TEXT.slice(0, typed.length - 1)), DELETE_SPEED);
      } else {
        timeout = setTimeout(() => setTyping(true), LOOP_DELAY);
      }
    }
    return () => clearTimeout(timeout);
  }, [typed, typing]);

  // Load notes from Firebase
  useEffect(() => {
    const notesRef = ref(db, "notes")
    const unsubscribe = onValue(notesRef, (snapshot) => {
      const data = snapshot.val()
      if (!data) {
        setStickyNotes([])
        return
      }
      // Convert Firebase object to array
      const notes: StickyNote[] = Object.entries(data).map(([id, note]: any) => ({
        id: id,
        x: note.x ?? Math.random() * 400 + 100,
        y: note.y ?? Math.random() * 400 + 100,
        width: note.width ?? 200,
        height: note.height ?? 200,
        backgroundColor: note.backgroundColor ?? "#FFE066",
        text: note.text ?? "",
        textColor: note.textColor ?? "#000000",
        fontSize: note.fontSize ?? 24,
        fontFamily: note.fontFamily ?? "Arial",
        fontWeight: note.fontWeight ?? "normal",
        fontStyle: note.fontStyle ?? "normal",
        textDecoration: note.textDecoration ?? "none",
        drawingData: note.drawingData ?? null,
        createdAt: note.createdAt ? new Date(note.createdAt) : new Date(),
        updatedAt: note.updatedAt ? new Date(note.updatedAt) : new Date(),
      }))
      setStickyNotes(notes)
    })
    return () => unsubscribe()
  }, [])

  const createNewNote = useCallback(() => {
    const newNote: StickyNote = {
      id: Date.now().toString(),
      x: Math.random() * 400 + 100,
      y: Math.random() * 400 + 100,
      width: 200,
      height: 200,
      backgroundColor: "#87CEEB",
      text: "",
      textColor: "#000000",
      fontSize: 24, // default to 24
      fontFamily: "Arial",
      fontWeight: "normal",
      fontStyle: "normal",
      textDecoration: "none",
      drawingData: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    setSelectedNote(newNote)
    setIsModalOpen(true)
  }, [])

  const saveNote = useCallback((note: StickyNote) => {
    // Save to Firebase (create or update)
    const noteRef = ref(db, `notes/${note.id}`)
    // Prepare object for Firebase (convert Date to number)
    const noteToSave = {
      ...note,
      createdAt: note.createdAt instanceof Date ? note.createdAt.getTime() : note.createdAt,
      updatedAt: Date.now(),
    }
    set(noteRef, noteToSave)
    setStickyNotes((prev) => {
      const existingIndex = prev.findIndex((n) => n.id === note.id)
      if (existingIndex >= 0) {
        const updated = [...prev]
        updated[existingIndex] = { ...note, updatedAt: new Date() }
        // Move updated note to end (top)
        const [moved] = updated.splice(existingIndex, 1)
        updated.push(moved)
        return updated
      } else {
        return [...prev, note]
      }
    })
    setIsModalOpen(false)
    setSelectedNote(null)
  }, [])

  const deleteNote = useCallback((noteId: string) => {
    // Remove from Firebase
    const noteRef = ref(db, `notes/${noteId}`)
    remove(noteRef)
    setStickyNotes((prev) => prev.filter((note) => note.id !== noteId))
    setIsModalOpen(false)
    setSelectedNote(null)
  }, [])

  const updateNotePosition = useCallback((noteId: string, x: number, y: number) => {
    // Update position in Firebase
    const noteRef = ref(db, `notes/${noteId}`)
    update(noteRef, { x, y, updatedAt: Date.now() })
    setStickyNotes((prev) => {
      const idx = prev.findIndex((n) => n.id === noteId);
      if (idx === -1) return prev.map((note) => (note.id === noteId ? { ...note, x, y, updatedAt: new Date() } : note));
      const updated = [...prev];
      const [moved] = updated.splice(idx, 1);
      updated.push({ ...moved, x, y, updatedAt: new Date() });
      return updated;
    });
  }, [])

  // Open view modal (not edit)
  const openNoteViewModal = useCallback((note: StickyNote) => {
    setStickyNotes((prev) => {
      const idx = prev.findIndex((n) => n.id === note.id);
      if (idx === -1) return prev;
      const updated = [...prev];
      const [moved] = updated.splice(idx, 1);
      updated.push(moved);
      return updated;
    });
    setSelectedNote(note)
    setIsViewModalOpen(true)
  }, [])

  // Open edit modal
  const openNoteEditModal = useCallback((note: StickyNote) => {
    setStickyNotes((prev) => {
      const idx = prev.findIndex((n) => n.id === note.id);
      if (idx === -1) return prev;
      const updated = [...prev];
      const [moved] = updated.splice(idx, 1);
      updated.push(moved);
      return updated;
    });
    setSelectedNote(note)
    setIsModalOpen(true)
  }, [])

  // Center pan on reset
  const handleResetZoom = useCallback(() => {
    setZoom(1);
    // Center the canvas in the viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    setPan({
      x: (viewportWidth - CANVAS_SIZE) / 2,
      y: (viewportHeight - CANVAS_SIZE) / 2,
    });
  }, []);

  // Clamp pan to bounds
  const clampPan = useCallback((pan: { x: number; y: number }) => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const minX = viewportWidth - CANVAS_SIZE;
    const minY = viewportHeight - CANVAS_SIZE;
    const maxX = 0;
    const maxY = 0;
    return {
      x: Math.max(minX, Math.min(maxX, pan.x)),
      y: Math.max(minY, Math.min(maxY, pan.y)),
    };
  }, []);

  return (
    <div className="h-screen w-screen overflow-hidden bg-white relative">
      {/* SCpES Digital Wall Title */}
      <div className="fixed top-6 left-8 z-50 px-5 py-1.5 rounded-xl bg-white/70 backdrop-blur-md shadow-lg border border-white/40 font-extrabold text-xl text-[#18181b] tracking-tight animate-gradient-shimmer" style={{ fontFamily: 'SF Pro Display, Arial, Helvetica, sans-serif', letterSpacing: '-0.01em', boxShadow: '0 2px 8px 0 rgba(0, 123, 255, 0.10)' }}>
        SCpES <span className="bg-gradient-to-r from-blue-300 via-blue-400 to-cyan-300 bg-clip-text text-transparent drop-shadow-[0_0_4px_rgba(0,123,255,0.18)] animate-gradient-shimmer" style={{ transition: 'color 0.2s' }}>{typed}&nbsp;</span>
      </div>
      {/* Main Canvas */}
      <Canvas
        ref={canvasRef}
        stickyNotes={stickyNotes}
        zoom={zoom}
        pan={pan}
        onNoteClick={openNoteViewModal}
        onNoteEdit={openNoteEditModal}
        onNoteMove={(noteId, x, y) => updateNotePosition(noteId, x, y)}
        onNoteDelete={deleteNote}
        onZoomChange={setZoom}
        onPanChange={p => setPan(clampPan(p))}
      />

      {/* Floating Add Button */}
      <Button
        onClick={createNewNote}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-purple-600 hover:bg-purple-700 shadow-lg z-50"
        size="icon"
      >
        <Plus className="w-6 h-6" />
      </Button>

      {/* Toolbar */}
      <Toolbar currentTool={currentTool} onToolChange={setCurrentTool} zoom={zoom} onZoomChange={setZoom} />

      {/* Sticky Note View Modal */}
      {isViewModalOpen && selectedNote && (
        <ViewStickyNoteModal
          note={selectedNote}
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsViewModalOpen(false)
            setSelectedNote(null)
          }}
        />
      )}
      {/* Sticky Note Edit Modal (triggered by edit button) */}
      {isModalOpen && selectedNote && (
        <StickyNoteModal
          note={selectedNote}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setSelectedNote(null)
          }}
          onSave={saveNote}
          onDelete={deleteNote}
        />
      )}
    </div>
  )
}
