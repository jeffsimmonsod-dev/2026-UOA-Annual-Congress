import { MapPin, Megaphone, QrCode, Clock, BookmarkCheck, Store, FileText, Building2, HelpCircle, ChevronRight, Eye } from "lucide-react";

export function HomeRedesign() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-start justify-center py-8">
      <div
        className="relative bg-slate-50 overflow-hidden rounded-[40px] shadow-2xl"
        style={{ width: 390, height: 844, border: "10px solid #1e293b", fontFamily: "system-ui, -apple-system, sans-serif" }}
      >
        {/* Status bar */}
        <div className="flex justify-between items-center px-6 pt-2 pb-1 bg-slate-50 text-[11px] font-semibold text-slate-700">
          <span>9:41</span>
          <div className="flex gap-1 items-center">
            <svg width="16" height="12" viewBox="0 0 16 12" fill="none"><rect x="0" y="3" width="3" height="9" rx="1" fill="#1e293b"/><rect x="4" y="2" width="3" height="10" rx="1" fill="#1e293b"/><rect x="8" y="1" width="3" height="11" rx="1" fill="#1e293b"/><rect x="12" y="0" width="3" height="12" rx="1" fill="#1e293b"/></svg>
            <svg width="15" height="12" viewBox="0 0 15 12" fill="currentColor" className="text-slate-700"><path d="M7.5 2.4C9.8 2.4 11.8 3.4 13.2 5L14.5 3.7C12.7 1.8 10.2.8 7.5.8 4.8.8 2.3 1.8.5 3.7L1.8 5C3.2 3.4 5.2 2.4 7.5 2.4z"/><path d="M7.5 5.5C9 5.5 10.3 6.1 11.3 7.1L12.6 5.8C11.2 4.5 9.4 3.7 7.5 3.7 5.6 3.7 3.8 4.5 2.4 5.8L3.7 7.1C4.7 6.1 6 5.5 7.5 5.5z"/><circle cx="7.5" cy="10" r="1.5"/></svg>
            <div className="flex items-center gap-0.5">
              <div className="rounded-sm bg-slate-700" style={{width:22, height:11, padding:1}}><div className="bg-slate-700 rounded-sm h-full" style={{width:"80%", background:"#1e293b"}}></div></div>
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto h-full pb-20" style={{scrollbarWidth:"none"}}>
          <div className="px-4 pt-1 pb-6 flex flex-col gap-3">

            {/* ── Compact Hero ── */}
            <div className="flex flex-col items-center gap-1.5 pt-1 pb-1">
              {/* Inline logo + title row */}
              <div className="flex items-center gap-3 w-full">
                <div className="bg-white rounded-xl shadow-sm p-1.5 flex-shrink-0" style={{width:52, height:52}}>
                  {/* UOA logo placeholder */}
                  <div className="w-full h-full rounded-lg bg-indigo-50 flex items-center justify-center">
                    <Eye size={22} className="text-indigo-600" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-semibold text-indigo-600 uppercase tracking-widest mb-0.5">2026 Annual Congress</div>
                  <div className="text-[15px] font-extrabold text-slate-800 leading-tight">UOA Congress</div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <MapPin size={10} className="text-slate-400 flex-shrink-0" />
                    <span className="text-[10px] text-slate-400 truncate">June 4–7 · Grand Hyatt Deer Valley</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Announcement (compact) ── */}
            <div
              className="rounded-2xl border p-3 flex flex-col gap-1.5"
              style={{background:"rgba(79,70,229,0.06)", borderColor:"rgba(79,70,229,0.25)"}}
            >
              <div className="flex items-center gap-1.5">
                <Megaphone size={12} className="text-indigo-600 flex-shrink-0" />
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide flex-1">Announcement</span>
                <span className="text-[10px] text-slate-400">Jun 1</span>
              </div>
              <div className="text-[13px] font-bold text-slate-800 leading-snug">Welcome to the 2026 UOA Annual Congress!</div>
              <div className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">Join us June 4–7 at the Grand Hyatt Deer Valley for an outstanding educational program…</div>
              <div className="text-[11px] font-semibold text-indigo-600">View all announcements →</div>
            </div>

            {/* ── Next Session (compact) ── */}
            <div
              className="rounded-2xl border p-3 flex flex-col gap-2"
              style={{background:"#fff", borderColor:"#e2e8f0", borderLeftWidth:4, borderLeftColor:"#10b981"}}
            >
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">My Next Session</div>
              <div
                className="text-[10px] font-bold uppercase tracking-wide rounded px-2 py-0.5 self-start"
                style={{background:"rgba(16,185,129,0.12)", color:"#10b981"}}
              >Glaucoma</div>
              <div className="text-[14px] font-bold text-slate-800 leading-snug">Primary Open Angle Glaucoma Update</div>
              <div className="flex items-center gap-1">
                <Clock size={11} className="text-slate-400" />
                <span className="text-[11px] text-slate-400">8:00 – 9:00 AM · Strawberry A</span>
              </div>
            </div>

            {/* ── Scan QR (compact full-width) ── */}
            <button
              className="w-full flex items-center gap-2.5 rounded-2xl px-4 py-3"
              style={{background:"#4f46e5"}}
            >
              <QrCode size={18} color="#fff" />
              <span className="flex-1 text-left text-[14px] font-bold text-white">Scan Booth QR Code</span>
              <ChevronRight size={16} color="rgba(255,255,255,0.6)" />
            </button>

            {/* ── Quick Access Tiles ── */}
            <div className="flex items-center justify-between mt-1">
              <span className="text-[13px] font-bold text-slate-700">Quick Access</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Exhibit Hall */}
              <button className="flex flex-col items-start gap-2 rounded-2xl p-4 bg-white border border-slate-200 shadow-sm active:opacity-80">
                <div className="rounded-xl p-2" style={{background:"rgba(79,70,229,0.1)"}}>
                  <Store size={20} className="text-indigo-600" />
                </div>
                <div>
                  <div className="text-[13px] font-bold text-slate-800 text-left">Exhibit Hall</div>
                  <div className="text-[10px] text-slate-400 text-left mt-0.5">Booth passport & raffle</div>
                </div>
              </button>

              {/* My Notes */}
              <button className="flex flex-col items-start gap-2 rounded-2xl p-4 bg-white border border-slate-200 shadow-sm active:opacity-80">
                <div className="rounded-xl p-2" style={{background:"rgba(16,185,129,0.1)"}}>
                  <FileText size={20} className="text-emerald-600" />
                </div>
                <div>
                  <div className="text-[13px] font-bold text-slate-800 text-left">My Notes</div>
                  <div className="text-[10px] text-slate-400 text-left mt-0.5">Session notes by day</div>
                </div>
              </button>

              {/* Venue & Hotel */}
              <button className="flex flex-col items-start gap-2 rounded-2xl p-4 bg-white border border-slate-200 shadow-sm active:opacity-80">
                <div className="rounded-xl p-2" style={{background:"rgba(245,158,11,0.1)"}}>
                  <Building2 size={20} className="text-amber-600" />
                </div>
                <div>
                  <div className="text-[13px] font-bold text-slate-800 text-left">Venue & Hotel</div>
                  <div className="text-[10px] text-slate-400 text-left mt-0.5">Grand Hyatt Deer Valley</div>
                </div>
              </button>

              {/* FAQ */}
              <button className="flex flex-col items-start gap-2 rounded-2xl p-4 bg-white border border-slate-200 shadow-sm active:opacity-80">
                <div className="rounded-xl p-2" style={{background:"rgba(14,165,233,0.1)"}}>
                  <HelpCircle size={20} className="text-sky-600" />
                </div>
                <div>
                  <div className="text-[13px] font-bold text-slate-800 text-left">FAQ</div>
                  <div className="text-[10px] text-slate-400 text-left mt-0.5">Frequently asked questions</div>
                </div>
              </button>
            </div>

            {/* ── Sponsors (compact) ── */}
            <div className="flex items-center justify-between mt-1">
              <span className="text-[13px] font-bold text-slate-700">Our Sponsors</span>
              <span className="text-[11px] text-indigo-600 font-semibold">See all →</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1" style={{scrollbarWidth:"none"}}>
              {["Alcon", "Zeiss", "Bausch + Lomb", "Topcon"].map((name, i) => (
                <div
                  key={name}
                  className="flex-shrink-0 flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-3"
                  style={{width:100}}
                >
                  <div className="rounded-lg bg-slate-100 flex items-center justify-center" style={{width:44, height:44}}>
                    <Eye size={18} className="text-slate-400" />
                  </div>
                  <div className="text-[10px] font-bold text-slate-700 text-center leading-tight">{name}</div>
                  <div
                    className="text-[9px] font-bold rounded px-1.5 py-0.5"
                    style={i === 0 ? {background:"#ede9f8", color:"#5b21b6"} : {background:"#fef3c7", color:"#92400e"}}
                  >{i === 0 ? "PLATINUM" : "GOLD"}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div
          className="absolute bottom-0 left-0 right-0 flex items-center justify-around px-2 pb-5 pt-2 border-t border-slate-200 bg-white/90"
          style={{backdropFilter:"blur(10px)"}}
        >
          {[
            {icon:"🏠", label:"Home", active:true},
            {icon:"📅", label:"Schedule", active:false},
            {icon:"🔖", label:"My Schedule", active:false},
            {icon:"📸", label:"Photos", active:false},
            {icon:"•••", label:"More", active:false},
          ].map(tab => (
            <div key={tab.label} className="flex flex-col items-center gap-0.5">
              <span className="text-[18px]">{tab.icon}</span>
              <span className={`text-[9px] font-semibold ${tab.active ? "text-indigo-600" : "text-slate-400"}`}>{tab.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
