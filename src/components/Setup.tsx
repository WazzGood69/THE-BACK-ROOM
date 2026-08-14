import { useState } from "react"
import { User } from "../types"
import { getServerUrl, setServerUrl, hashPw, pickAvatar, registerUser, login } from "../store"

interface Props { onDone: (user: User) => void }

type Step = "username" | "password" | "confirm"

export default function Setup({ onDone }: Props) {
  const [step, setStep]       = useState<Step>("username")
  const [mode, setMode] = useState<"create"|"login">("create")
  const [server, setServer] = useState(getServerUrl())
  const [username, setUsername] = useState("")
  const [wantPw, setWantPw]   = useState<boolean | null>(null)
  const [pw, setPw]           = useState("")
  const [pw2, setPw2]         = useState("")
  const [err, setErr]         = useState("")
  const [avatar]              = useState(pickAvatar)

  function submitUsername() {
    const name = username.trim()
    if (!name) { setErr("Enter a username."); return }
    if (name.length < 3) { setErr("At least 3 characters."); return }
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) { setErr("Letters, numbers, _ and - only."); return }

    setErr("")
    setStep("password")
  }

  async function submitPassword() {
    setServerUrl(server)
    if (mode === "login") {
      try { const u=await login(username.trim(), pw ? hashPw(pw) : null); onDone(u) } catch(e) { setErr(e instanceof Error?e.message:"Login failed") }
      return
    }
    if (wantPw === null) { setErr("Choose an option."); return }
    if (!wantPw) { finishSetup(null); return }
    if (pw.length < 4) { setErr("Password must be at least 4 characters."); return }
    if (pw !== pw2)  { setErr("Passwords don't match."); return }
    finishSetup(pw)
  }

  async function finishSetup(password: string | null) {
    const user: User = {
      id: Math.random().toString(36).slice(2, 10),
      username: username.trim(),
      passwordHash: password ? hashPw(password) : null,
      createdAt: Date.now(),
      avatar,
    }
    try { const created=await registerUser(user); onDone(created) } catch(e) { setErr(e instanceof Error?e.message:"Could not connect to server.") }
  }

  return (
    <div className="setup-shell">
      <div className="setup-card">
        <div className="setup-logo">
          <BackRoomMark />
          <span className="setup-brand">The Back Room</span>
        </div>

        <div className="setup-server">
          <label>Server</label>
          <input className="setup-input" value={server} onChange={e=>setServer(e.target.value)} onBlur={()=>{setServerUrl(server)}} placeholder="http://192.168.1.10:8787" />
          <p className="setup-sub">Use the address of the laptop running The Back Room server. If this page came from that laptop, leave it as-is.</p>
        </div>
        <div className="setup-mode">
          <button className={mode==="create"?"setup-radio setup-radio--on":"setup-radio"} onClick={()=>{setMode("create");setStep("username");setErr("")}}>Create account</button>
          <button className={mode==="login"?"setup-radio setup-radio--on":"setup-radio"} onClick={()=>{setMode("login");setStep("username");setErr("")}}>Log in</button>
        </div>

        <div className="setup-step-indicator">
          <span className={step === "username" ? "ssi-dot ssi-active" : "ssi-dot ssi-done"} />
          <span className={step === "password" ? "ssi-dot ssi-active" : step === "confirm" ? "ssi-dot ssi-done" : "ssi-dot"} />
        </div>

        {step === "username" && (
          <div className="setup-section">
            <div className="setup-avatar">{avatar}</div>
            <h2 className="setup-heading">{mode === "login" ? "Log in" : "Choose your username"}</h2>
            <p className="setup-sub">{mode === "login" ? "Sign in to your account on this server." : "This is how others will find you in The Back Room."}</p>
            <input
              className="setup-input"
              placeholder="e.g. shadow_fox"
              value={username}
              onChange={e => { setUsername(e.target.value); setErr("") }}
              onKeyDown={e => e.key === "Enter" && submitUsername()}
              autoFocus
              maxLength={24}
            />
            {mode === "login" && <input className="setup-input" type="password" placeholder="Password" value={pw} onChange={e=>{setPw(e.target.value);setErr("")}} onKeyDown={e=>e.key==="Enter"&&submitPassword()} />}
            {err && <p className="setup-err">{err}</p>}
            <button className="setup-btn" onClick={mode==="login"?submitPassword:submitUsername}>{mode === "login" ? "Log in" : "Continue →"}</button>
          </div>
        )}

        {step === "password" && (
          <div className="setup-section">
            <h2 className="setup-heading">Set a password?</h2>
            <p className="setup-sub">Protect your account with a password. Optional, but recommended.</p>
            <div className="setup-radio-group">
              <label className={`setup-radio ${wantPw === true ? "setup-radio--on" : ""}`}>
                <input type="radio" name="pw" checked={wantPw === true}
                  onChange={() => { setWantPw(true); setErr("") }} />
                <span>Yes, set a password</span>
              </label>
              <label className={`setup-radio ${wantPw === false ? "setup-radio--on" : ""}`}>
                <input type="radio" name="pw" checked={wantPw === false}
                  onChange={() => { setWantPw(false); setErr("") }} />
                <span>No thanks, skip</span>
              </label>
            </div>
            {wantPw && (
              <>
                <input className="setup-input" type="password" placeholder="Password"
                  value={pw} onChange={e => { setPw(e.target.value); setErr("") }}
                  onKeyDown={e => e.key === "Enter" && submitPassword()} />
                <input className="setup-input" type="password" placeholder="Confirm password"
                  value={pw2} onChange={e => { setPw2(e.target.value); setErr("") }}
                  onKeyDown={e => e.key === "Enter" && submitPassword()} />
              </>
            )}
            {err && <p className="setup-err">{err}</p>}
            <div className="setup-row">
              <button className="setup-btn-ghost" onClick={() => { setStep("username"); setErr("") }}>← Back</button>
              <button className="setup-btn" onClick={submitPassword}>
                {wantPw ? "Create Account" : "Skip & Enter"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function BackRoomMark() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
      <rect x="6" y="4" width="24" height="28" rx="1.5" fill="#0a0a1a" stroke="currentColor" strokeWidth="1.2" opacity="0.5"/>
      <rect x="8" y="6" width="20" height="24" rx="1" fill="#0a0a1a" stroke="currentColor" strokeWidth="1.2"/>
      <rect x="10" y="8" width="7" height="9" rx=".8" stroke="currentColor" strokeWidth=".9" opacity="0.6"/>
      <rect x="19" y="8" width="7" height="9" rx=".8" stroke="currentColor" strokeWidth=".9" opacity="0.6"/>
      <rect x="10" y="20" width="16" height="7" rx=".8" stroke="currentColor" strokeWidth=".9" opacity="0.6"/>
      <circle cx="18" cy="18" r="2" fill="currentColor" opacity="0.8"/>
      <path d="M17 18.5 L16.2 22 L19.8 22 L19 18.5" fill="currentColor" opacity="0.8"/>
    </svg>
  )
}
