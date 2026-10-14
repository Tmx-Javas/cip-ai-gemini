import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
const API_URL = process.env.GEMINI_PROXY_URL || "https://api.iroha-api.web.id/v1/gemini/s";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const model = body.model === "gemini-2.5-pro" ? "gemini-2.5-pro" : "gemini-2.5-flash";
    if (!prompt) return NextResponse.json({ error: "Pesan tidak boleh kosong." }, { status: 400 });
    if (prompt.length > 30000) return NextResponse.json({ error: "Pesan terlalu panjang (maksimum 30.000 karakter)." }, { status: 413 });

    const payload: Record<string, unknown> = { prompt, model, messages: Array.isArray(body.messages) ? body.messages.slice(-40) : [], search: Boolean(body.search) };
    // API documentation supports image as a publicly reachable URL, not raw file bytes.
    if (typeof body.image === "string" && /^https?:\/\//i.test(body.image)) payload.image = body.image;

    const upstream = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(55000)
    });
    const raw = await upstream.text();
    let data: any;
    try { data = JSON.parse(raw); } catch { data = { error: "API AI mengembalikan respons yang bukan JSON." }; }
    if (!upstream.ok) return NextResponse.json({ error: data?.message || data?.error || `Layanan AI merespons HTTP ${upstream.status}.` }, { status: 502 });
    if (data?.status === false) return NextResponse.json({ error: data?.message || data?.error || "Permintaan AI gagal." }, { status: 502 });
    const result = data?.data?.result ?? data?.result ?? data?.message;
    if (typeof result !== "string") return NextResponse.json({ error: "Format respons API tidak sesuai dokumentasi. Coba lagi nanti." }, { status: 502 });
    return NextResponse.json({ result, model: data?.data?.model || model, messages: Array.isArray(data?.data?.messages) ? data.data.messages : payload.messages });
  } catch (err: any) {
    const message = err?.name === "TimeoutError" ? "Waktu tunggu AI habis. Coba lagi." : "Tidak dapat menghubungi layanan AI. Pastikan endpoint aktif lalu coba lagi.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
