"use client";
import { useState, useEffect } from "react";
import { ref, push } from "firebase/database";
import { db } from "@/lib/firebase";
import StickyNoteEditor from "@/components/StickyNoteEditor";
import type { StickyNote } from "@/lib/types";

const COMMON_COLORS = [
  "#FFE066", "#FFB6C1", "#87CEEB", "#98FB98", "#FFD166", "#A685E2", "#FFFFFF", "#F0E68C", "#FFA07A", "#20B2AA"
];
function getRandomColor() {
  return COMMON_COLORS[Math.floor(Math.random() * COMMON_COLORS.length)];
}
const makeDefaultNote = () => ({
  id: "",
  x: 0,
  y: 0,
  width: 200,
  height: 200,
  backgroundColor: getRandomColor(),
  text: "",
  textColor: "#000000",
  fontSize: 24,
  fontFamily: "Arial",
  fontWeight: "normal",
  fontStyle: "normal",
  textDecoration: "none",
  drawingData: null,
  createdAt: new Date(),
  updatedAt: new Date(),
});

export default function SubmitPage() {
  const [sent, setSent] = useState(false);
  const [note, setNote] = useState<StickyNote>(makeDefaultNote());

  const handleSave = async (note: StickyNote) => {
    try {
      // Generate a random id and random coordinates near the focal point
      const id = Date.now().toString() + Math.floor(Math.random() * 10000).toString();
      const x = 800 + Math.random() * 400; // 800-1200
      const y = 400 + Math.random() * 400; // 400-800
      const { id: _id, x: _x, y: _y, width, height, ...rest } = note;
      await push(ref(db, "notes"), {
        id,
        x,
        y,
        width: width ?? 200,
        height: height ?? 200,
        ...rest,
        author: "anonymous",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      setSent(true); // Only show modal if write succeeded
      setTimeout(() => {
        setSent(false);
        setNote(makeDefaultNote()); // Reset the sticky note after modal disappears
      }, 2000);
    } catch (err: any) {
      alert("Failed to send note: " + (err?.message || err));
    }
  };

  // Remove the useEffect that pushes dummy data to the database every 2 seconds.

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-2">
      {/* Removed the SCpES DigiWall pill/logo at the top */}
      <div className="w-full max-w-lg">
        <h1 className="text-2xl font-bold text-center mb-4">Send a Sticky Note</h1>
        <StickyNoteEditor initialNote={note} onSave={handleSave} mobile sent={sent} setSent={setSent} />
      </div>
      <style jsx global>{`
        @keyframes shimmer {
          0% { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        .typing-effect {
          display: inline-block;
          overflow: hidden;
          border-right: 2px solid #fff;
          white-space: nowrap;
          animation: typing 2.2s steps(10, end), blink-caret 0.75s step-end infinite;
        }
        @keyframes typing {
          from { width: 0 }
          to { width: 7.5ch }
        }
        @keyframes blink-caret {
          from, to { border-color: transparent }
          50% { border-color: #fff; }
        }
      `}</style>
      {/* Subtle copyright footer */}
      <footer className="fixed left-1/2 -translate-x-1/2 bottom-2 z-40 text-xs text-gray-400 select-none pointer-events-none" style={{fontFamily: 'inherit', opacity: 0.7, letterSpacing: '0.01em'}}>
        Society of Computer Engineering Students 2025 -MC
      </footer>
    </div>
  );
} 