 "use client";
import { useEffect, useRef, useState } from "react";
import { Bot, Plus, MessageSquare, Settings, Moon, Sun, Search, Paperclip, Image as ImageIcon, FileText, Send, PanelLeftClose, PanelLeft, Trash2, ExternalLink, Sparkles, Copy, Check, X, Menu, LoaderCircle, Palette, ChevronDown } from "lucide-react";

type ChatMessage = { role: "user" | "assistant"; content: string; attachment?: string };
type Chat = { id: string; title: string; messages: ChatMessage[]; apiMessages: any[]; updated: number };
const LOGO = "https://i.ibb.co.com/wF3rXBJR/Screenshot-20260925-182528-Gallery.jpg";
const initialChat = (): Chat => ({ id: crypto.randomUUID(), title: "Chat baru", messages: [], apiMessages: [], updated: Date.now() });

export default function Home() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeId, setActiveId] = useState("");
  const [input, setInput] = useState("");
  const [model, setModel] = useState("gemini-2.5-flash");
  const [search, setSearch] = useState(false);
  const [busy, setBusy] = useState(false);
  const [settings, setSettings] = useState(false);
  const [sidebar, setSidebar] = useState(true);
  const [dark, setDark] = useState(true);
  const [accent, setAccent] = useState("#7757ff");
  const [customAccent, setCustomAccent] = useState("#7757ff");
  const [file, setFile] = useState<File | null>(null);
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState(-1);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const active = chats.find(c => c.id === activeId);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("cip-ai-chats-v1");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.chats) && parsed.chats.length) {
          setChats(parsed.chats); setActiveId(parsed.activeId || parsed.chats[0].id);
          setModel(parsed.model || "gemini-2.5-flash"); setDark(parsed.dark !== false); setAccent(parsed.accent || "#7757ff");
          return;
        }
      }
    } catch {}
    const c = initialChat(); setChats([c]); setActiveId(c.id);
  }, []);
  useEffect(() => {
    if (!chats.length) return;
    try { localStorage.setItem("cip-ai-chats-v1", JSON.stringify({ chats, activeId, model, dark, accent })); } catch {}
  }, [chats, activeId, model, dark, accent]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [active?.messages, busy]);
  useEffect(() => { document.documentElement.style.setProperty("--accent", accent); }, [accent]);

  function newChat() { const c = initialChat(); setChats(old => [c, ...old]); setActiveId(c.id); setInput(""); setFile(null); setNotice(""); }
  function patchChat(id: string, patch: Partial<Chat>) { setChats(old => old.map(c => c.id === id ? { ...c, ...patch, updated: Date.now() } : c).sort((a,b) => b.updated-a.updated)); }
  function clearHistory() {
    if (!confirm("Hapus semua riwayat chat yang tersimpan di browser ini?")) return;
    localStorage.removeItem("cip-ai-chats-v1"); const c = initialChat(); setChats([c]); setActiveId(c.id); setNotice("Riwayat lokal dihapus.");
  }
  async function extractFile(f: File): Promise<{text?: string; imageUrl?: string; label: string}> {
    const name = f.name.toLowerCase();
    if (f.type.startsWith("image/")) {
      return { label: f.name, text: `Saya melampirkan gambar lokal bernama ${f.name}. API saat ini menerima gambar melalui URL publik, bukan data file langsung. Mohon minta pengguna mengirim URL gambar publik agar dapat dianalisis.` };
    }
    if (name.endsWith(".txt") || name.endsWith(".md") || name.endsWith(".csv") || f.type.startsWith("text/")) {
      return { label: f.name, text: (await f.text()).slice(0, 18000) };
    }
    if (name.endsWith(".pdf") || f.type === "application/pdf") {
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      const bytes = new Uint8Array(await f.arrayBuffer());
      const pdf = await pdfjs.getDocument({ data: bytes, useWorkerFetch: false, isEvalSupported: false, useSystemFonts: true }).promise;
      let text = "";
      for (let p = 1; p <= Math.min(pdf.numPages, 20); p++) {
        const page = await pdf.getPage(p); const content = await page.getTextContent();
        text += `\n[Halaman ${p}]\n` + content.items.map((it: any) => it.str || "").join(" ") + "\n";
        if (text.length > 18000) break;
      }
      return { label: f.name, text: text.slice(0,18000) || "PDF tidak memiliki teks yang dapat diekstrak (mungkin hasil scan)." };
    }
    if (name.endsWith(".docx")) {
      const mammoth = await import("mammoth/mammoth.browser");
      const result = await mammoth.extractRawText({ arrayBuffer: await f.arrayBuffer() });
      return { label: f.name, text: result.value.slice(0,18000) };
    }
    throw new Error("Format file belum didukung. Gunakan gambar, PDF, DOCX, TXT, MD, atau CSV.");
  }
  async function send() {
    const text = input.trim();
    if ((!text && !file) || busy || !active) return;
    setBusy(true); setNotice(""); setInput("");
    const current = active;
    let userText = text;
    let attachmentName = "";
    try {
      if (file) {
        const extracted = await extractFile(file);
        attachmentName = extracted.label;
        if (extracted.text) userText += `\n\n[Isi lampiran: ${extracted.label}]\n${extracted.text}`;
      }
      if (!userText.trim()) userText = file ? `Tolong analisis lampiran ${file.name}.` : text;
      const displayText = text || `Tolong analisis file ${attachmentName}.`;
      const updatedMessages: ChatMessage[] = [...current.messages, { role: "user", content: displayText, attachment: attachmentName || undefined }];
      patchChat(current.id, { messages: updatedMessages, title: current.messages.length ? current.title : displayText.slice(0, 36) });
      const response = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userText, model, messages: current.apiMessages, search })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Permintaan AI gagal.");
      const nextMessages = [...updatedMessages, { role: "assistant" as const, content: data.result }];
      patchChat(current.id, { messages: nextMessages, apiMessages: Array.isArray(data.messages) ? data.messages : current.apiMessages });
      setFile(null);
    } catch (e: any) {
      patchChat(current.id, { messages: [...current.messages, { role: "user", content: text || `Lampiran: ${file?.name || "file"}`, attachment: file?.name }, { role: "assistant", content: `⚠️ ${e?.message || "Terjadi kesalahan."}\n\nCoba lagi atau periksa koneksi API.` }] });
      setNotice(e?.message || "Gagal mengirim pesan.");
    } finally { setBusy(false); }
  }
  async function copyText(text: string, i: number) { try { await navigator.clipboard.writeText(text); setCopied(i); setTimeout(() => setCopied(-1), 1500); } catch { setNotice("Tidak bisa menyalin otomatis di browser ini."); } }

  return <main className={dark ? "app dark" : "app light"} style={{ "--accent": accent } as React.CSSProperties}>
    {sidebar && <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><img src={LOGO} alt="Logo VortexCipher" onError={e => { (e.currentTarget as HTMLImageElement).style.display="none"; }} /><span>V</span></div><div><div className="brand-name">CIP - AI</div><div className="brand-sub">Powered by VortexCipher</div></div><button className="icon-btn sidebar-close" onClick={() => setSidebar(false)} aria-label="Tutup sidebar"><PanelLeftClose size={18}/></button></div>
      <button className="new-chat" onClick={newChat}><Plus size={18}/> Chat Baru</button>
      <div className="side-label"><span>RIWAYAT CHAT</span><span>{chats.length}</span></div>
      <div className="history">{chats.map(c => <button key={c.id} className={`history-item ${c.id===activeId?"selected":""}`} onClick={() => {setActiveId(c.id);setNotice("");}}><MessageSquare size={16}/><span>{c.title}</span></button>)}</div>
      <div className="sidebar-bottom">
        <div className="creator"><div className="mini-mark">V</div><div><b>VortexCipher</b><small>Developer & Creator</small><strong>✦ JAVAS</strong></div></div>
        <a className="contact" href="https://wa.me/6285719195951" target="_blank" rel="noreferrer"><span className="wa-dot">↗</span><span><b>Hubungi Admin</b><small>WhatsApp · JAVAS</small></span><ExternalLink size={15}/></a>
        <div className="version">CIP - AI <span>v1.0</span></div>
      </div>
    </aside>}
    <section className="workspace">
      <header className="topbar">
        <div className="top-left"><button className="icon-btn" onClick={() => setSidebar(!sidebar)} aria-label="Sidebar"><PanelLeft size={19}/></button><div><b>CIP - AI</b><small>Asisten AI cerdas dari VortexCipher</small></div></div>
        <div className="top-actions"><label className="model-select"><Sparkles size={15}/><select value={model} onChange={e => setModel(e.target.value)} aria-label="Pilih model"><option value="gemini-2.5-flash">Gemini 2.5 Flash</option><option value="gemini-2.5-pro">Gemini 2.5 Pro</option></select><ChevronDown size={14}/></label><button className={`search-toggle ${search?"on":""}`} onClick={() => setSearch(!search)} title="Aktifkan pencarian web"><Search size={15}/><span>Search</span><span className="switch"/></button><button className="icon-btn settings-trigger" onClick={() => setSettings(!settings)} aria-label="Pengaturan"><Settings size={18}/></button></div>
      </header>
      <div className="content-layout">
        <section className="chat-panel">
          <div className="messages">
            {!active?.messages.length && <div className="welcome"><div className="welcome-orb"><img src={LOGO} alt="" onError={e => (e.currentTarget.style.display="none")}/><span>V</span></div><div className="eyebrow"><Sparkles size={13}/> ASISTEN AI GENERATIF</div><h1>Halo, saya <span>CIP - AI</span></h1><p>Asisten AI cerdas berbasis Gemini dari VortexCipher.<br/>Tanyakan apa saja, saya siap membantu.</p><div className="welcome-links">Dibuat oleh <b>JAVAS</b><i>·</i><a href="https://wa.me/6285719195951" target="_blank" rel="noreferrer">Hubungi Admin ↗</a></div><div className="suggestions">{["Jelaskan apa yang bisa kamu lakukan","Bantu saya menulis kode","Ringkas dokumen saya"].map((s,i)=><button key={s} onClick={() => setInput(s)}><span>{["✧","⌘","▤"][i]}</span>{s}</button>)}</div></div>}
            {active?.messages.map((m,i)=><div className={`message-row ${m.role}`} key={i}><div className={`avatar ${m.role==="assistant"?"ai-avatar":"user-avatar"}`}>{m.role==="assistant"?<img src={LOGO} alt="" onError={e => (e.currentTarget.style.display="none")}/>:<span>U</span>}</div><div className="message-content"><div className="message-author">{m.role==="assistant"?"CIP - AI":"Anda"} <span>{m.role==="assistant"?"· AI Assistant":"· Pesan Anda"}</span></div><div className="bubble">{m.attachment && <div className="attachment-chip"><FileText size={14}/>{m.attachment}</div>}<div className="markdown-text">{m.content}</div></div>{m.role==="assistant"&&<div className="message-tools"><button onClick={() => copyText(m.content,i)}>{copied===i?<Check size={14}/>:<Copy size={14}/>} {copied===i?"Tersalin":"Salin"}</button></div>}</div></div>)}
            {busy && <div className="message-row assistant"><div className="avatar ai-avatar"><img src={LOGO} alt=""/></div><div className="thinking"><span className="thinking-icon"><Sparkles size={15}/></span><span>Berpikir</span><span className="dots"><i/><i/><i/></span></div></div>}
            <div ref={endRef}/>
          </div>
          <div className="composer-wrap">
            {file && <div className="file-preview"><FileText size={16}/><span>{file.name}</span><small>{(file.size/1024).toFixed(0)} KB</small><button onClick={() => setFile(null)} aria-label="Hapus lampiran"><X size={15}/></button></div>}
            {notice && <div className="notice">{notice}<button onClick={() => setNotice("")}><X size={13}/></button></div>}
            <div className="composer"><textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => {if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}} placeholder="Ketik pesan untuk CIP - AI..." rows={1} aria-label="Pesan untuk AI"/><div className="composer-bottom"><div className="composer-tools"><button onClick={() => fileRef.current?.click()} title="Lampirkan gambar atau dokumen"><Paperclip size={18}/></button><button onClick={() => fileRef.current?.click()} title="Kirim gambar"><ImageIcon size={18}/></button><span className="hint">Enter untuk kirim · Shift + Enter baris baru</span></div><button className="send-btn" disabled={busy||(!input.trim()&&!file)} onClick={send} aria-label="Kirim pesan">{busy?<LoaderCircle className="spin" size={18}/>:<Send size={18}/>}</button></div><input ref={fileRef} type="file" hidden accept="image/*,.pdf,.docx,.txt,.md,.csv" onChange={e => setFile(e.target.files?.[0]||null)}/></div>
            <div className="disclaimer">CIP - AI dapat membuat kesalahan. Periksa kembali informasi penting.</div>
          </div>
        </section>
        {settings && <aside className="settings-panel"><div className="settings-head"><div><Settings size={17}/><b>Pengaturan</b></div><button className="icon-btn" onClick={() => setSettings(false)} aria-label="Tutup pengaturan"><X size={17}/></button></div>
          <div className="setting-group"><label>Model AI</label><div className="setting-select"><select value={model} onChange={e=>setModel(e.target.value)}><option value="gemini-2.5-flash">Gemini 2.5 Flash</option><option value="gemini-2.5-pro">Gemini 2.5 Pro</option></select><ChevronDown size={14}/></div><small>Ubah model kapan saja.</small></div>
          <div className="setting-group"><label><Palette size={15}/> Warna aksen</label><div className="swatches">{["#7757ff","#168cff","#16b8a6","#f59e0b","#f05275","#64748b"].map(c=><button key={c} className={accent===c?"active":""} style={{background:c}} onClick={()=>setAccent(c)} aria-label={`Warna ${c}`}/>)}</div><div className="custom-color"><span>Warna kustom</span><input type="color" value={customAccent} onChange={e=>{setCustomAccent(e.target.value);setAccent(e.target.value)}}/></div></div>
          <div className="setting-group"><label>Tema</label><div className="theme-choices"><button className={dark?"chosen":""} onClick={()=>setDark(true)}><Moon size={17}/>Gelap</button><button className={!dark?"chosen":""} onClick={()=>setDark(false)}><Sun size={17}/>Terang</button></div></div>
          <div className="setting-group"><label>Fitur</label><div className="setting-row"><span><Search size={15}/> Pencarian web</span><button className={`switch-btn ${search?"checked":""}`} onClick={()=>setSearch(!search)} aria-label="Toggle pencarian web"><i/></button></div><div className="setting-row"><span><MessageSquare size={15}/> Riwayat chat lokal</span><span className="status-on">Aktif</span></div></div>
          <div className="setting-group"><label>Privasi</label><p className="privacy-copy">Riwayat disimpan di browser perangkat ini. Pesan yang dikirim diproses oleh layanan API pihak ketiga.</p><button className="danger-btn" onClick={clearHistory}><Trash2 size={15}/> Hapus semua riwayat</button></div>
          <div className="setting-group about"><label>Tentang CIP - AI</label><p>Dibuat oleh <b>JAVAS</b> untuk VortexCipher.</p><a href="https://wa.me/6285719195951" target="_blank" rel="noreferrer">Hubungi admin di WhatsApp ↗</a></div>
        </aside>}
      </div>
    </section>
  </main>;
}
