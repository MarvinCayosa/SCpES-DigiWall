export interface StickyNote {
  id: string
  x: number
  y: number
  width: number
  height: number
  backgroundColor: string
  text: string
  textColor: string
  fontSize: number
  fontFamily: string
  fontWeight: string
  fontStyle: string
  textDecoration: string
  drawingData: { imageData?: string; width?: number; height?: number } | null
  createdAt: Date
  updatedAt: Date
}

export interface DrawingData {
  strokes: DrawingStroke[]
}

export interface DrawingStroke {
  points: Point[]
  color: string
  width: number
}

export interface Point {
  x: number
  y: number
}

export type Tool = "select" | "pan" | "brush" | "text"
