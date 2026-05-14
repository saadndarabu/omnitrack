import { NextResponse } from "next/server"
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai"

const TICKET_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    title: { type: SchemaType.STRING, description: "Short, action-oriented ticket title" },
    description: { type: SchemaType.STRING, description: "Clear description of the work" },
    workType: { type: SchemaType.STRING, enum: ["feature", "enhancement", "bug", "task"] },
    status: { type: SchemaType.STRING, enum: ["backlog", "todo", "in_progress", "in_review", "done", "blocked"] },
    priority: { type: SchemaType.STRING, enum: ["critical", "high", "medium", "low"] },
    project: { type: SchemaType.STRING, enum: ["sara", "omniscan", "platform"] },
    area: { type: SchemaType.STRING, enum: ["platform", "product", "integrations"] },
    component: { type: SchemaType.STRING, enum: ["tickets", "github", "routing", "filters", "state"] },
    estimate: { type: SchemaType.STRING, description: "e.g. '2 pts', '1 pt', or empty string if unknown", nullable: true },
    dueDate: { type: SchemaType.STRING, description: "ISO date string YYYY-MM-DD or empty string", nullable: true },
    acceptanceCriteria: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "2-4 clear, testable acceptance criteria"
    },
    labels: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "1-3 lowercase labels relevant to the work"
    }
  },
  required: ["title", "description", "workType", "status", "priority", "project", "area", "component", "acceptanceCriteria", "labels"]
}

// POST /api/ai/create-ticket
// Body: { prompt: string }
export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 503 })
  }

  const { prompt } = await request.json()
  if (!prompt?.trim()) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 })
  }

  try {
    const genAI  = new GoogleGenerativeAI(apiKey)
    const model  = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: TICKET_SCHEMA as import("@google/generative-ai").Schema
      }
    })

    const systemContext = `You are a project management assistant for SIRP, a cybersecurity platform company.
Products: OmniSense Platform, SARA, OmniScan, OmniFlex, OmniUpdate, OmniCollective, OmniStream.
Map the user's request to a structured engineering ticket. Be concise and specific.
Default status to "todo". Infer priority from urgency cues in the text.
Return valid JSON matching the schema exactly.`

    const result = await model.generateContent(`${systemContext}\n\nCreate a ticket for: ${prompt}`)
    const text   = result.response.text()
    const ticket = JSON.parse(text)

    return NextResponse.json(ticket)
  } catch (err) {
    console.error("[POST /api/ai/create-ticket]", err)
    return NextResponse.json({ error: "AI generation failed" }, { status: 500 })
  }
}
