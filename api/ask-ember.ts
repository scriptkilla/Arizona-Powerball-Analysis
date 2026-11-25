// Vercel serverless function: Ask Ember.
// The browser never sees the Meta Model API key. The key lives only in the
// Vercel dashboard as META_MODEL_API_KEY (server-side env var) and is read
// here at request time. Until the hackathon credits/key are added, this
// endpoint answers GET with { configured: false } and POST with a 503 so the
// UI can show the "unlocks soon" state instead of breaking.
//
// Meta Model API, Muse Ember (model id "muse-ember-1.0"):
//   POST https://api.meta.ai/v1/responses
//   Authorization: Bearer $MODEL_API_KEY
//   { "model": "muse-ember-1.0", "input": "...", "max_output_tokens": 300 }

const META_API_URL = "https://api.meta.ai/v1/responses";
const MODEL_ID = "muse-ember-1.0";
const MAX_OUTPUT_TOKENS = 300;

const SYSTEM_PROMPT = `You are the plain-English guide inside Powerball Pro, a Powerball draw-history analyzer. Answer the user's question using ONLY the draw statistics provided below. Keep answers short: 2-4 sentences, plain words, no jargon. Name the actual numbers from the stats when they support the answer. If the stats don't cover what was asked, say so in one sentence instead of guessing. Never invent numbers, draws, or results that aren't in the summary. Do not claim any ticket is guaranteed to win.`;

function extractAnswerText(data: any): string | null {
    if (!data || typeof data !== "object") return null;

    // Responses API convenience field.
    if (typeof data.output_text === "string" && data.output_text.trim()) {
        return data.output_text.trim();
    }

    // Responses API output array: message items hold content parts with text.
    if (Array.isArray(data.output)) {
        const parts: string[] = [];
        for (const item of data.output) {
            if (item && item.type === "message" && Array.isArray(item.content)) {
                for (const c of item.content) {
                    if (c && typeof c.text === "string" && c.text.trim()) {
                        parts.push(c.text);
                    }
                }
            }
        }
        if (parts.length > 0) return parts.join("\n").trim();
    }

    // Chat Completions shape, just in case the endpoint answers that way.
    const choiceText = data?.choices?.[0]?.message?.content;
    if (typeof choiceText === "string" && choiceText.trim()) {
        return choiceText.trim();
    }

    return null;
}

export default async function handler(req: any, res: any) {
    const apiKey = process.env.META_MODEL_API_KEY;

    // Status check so the UI can show the right state before anyone asks.
    if (req.method === "GET") {
        return res.status(200).json({ configured: Boolean(apiKey), model: MODEL_ID });
    }

    if (req.method !== "POST") {
        res.setHeader("Allow", "GET, POST");
        return res.status(405).json({ error: "method_not_allowed" });
    }

    if (!apiKey) {
        return res.status(503).json({
            error: "not_configured",
            message:
                "Ember answers aren't switched on yet. Add META_MODEL_API_KEY in the Vercel dashboard to enable them.",
        });
    }

    const body = typeof req.body === "string" ? safeJsonParse(req.body) : req.body || {};
    const question = typeof body.question === "string" ? body.question.trim() : "";
    const stats = typeof body.stats === "string" ? body.stats.trim() : "";

    if (!question) {
        return res.status(400).json({ error: "missing_question" });
    }
    if (question.length > 500) {
        return res.status(400).json({ error: "question_too_long" });
    }

    const input = `${SYSTEM_PROMPT}\n\nDraw statistics summary (from ${"the loaded draw history"}):\n${stats || "No statistics were provided."}\n\nUser question: ${question}`;

    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 25000);

        const response = await fetch(META_API_URL, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: MODEL_ID,
                input,
                max_output_tokens: MAX_OUTPUT_TOKENS,
            }),
            signal: controller.signal,
        }).finally(() => clearTimeout(timer));

        if (!response.ok) {
            const detail = await response.text().catch(() => "");
            console.error("Meta Model API error:", response.status, detail.slice(0, 500));
            return res.status(502).json({
                error: "ember_failed",
                message: "Ember didn't answer that one. Try again in a moment.",
            });
        }

        const data = await response.json();
        const answer = extractAnswerText(data);

        if (!answer) {
            console.error("Meta Model API returned no usable text:", JSON.stringify(data).slice(0, 500));
            return res.status(502).json({
                error: "ember_failed",
                message: "Ember answered, but the reply came back empty. Try again.",
            });
        }

        return res.status(200).json({ answer, model: MODEL_ID });
    } catch (err: any) {
        console.error("Ask Ember request failed:", err?.message || err);
        return res.status(502).json({
            error: "ember_failed",
            message: "Ember didn't answer that one. Try again in a moment.",
        });
    }
}

function safeJsonParse(text: string): any {
    try {
        return JSON.parse(text);
    } catch {
        return {};
    }
}
