import { FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, MessageCircle, UserRound } from "lucide-react";
import { authClient } from "@/lib/auth";

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Set when the app auto-logged the user out because their token expired.
  const sessionExpired = searchParams.get("expired") === "1";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const session = mode === "login" ? await authClient.login({ email: form.email, password: form.password }) : await authClient.register(form);
      authClient.saveSession(session);
      navigate("/");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f8fb] px-5 py-10 text-[#17213a]">
      <div className="grid w-full max-w-[920px] overflow-hidden rounded-[30px] border border-[#e6eaf1] bg-white shadow-[0_22px_70px_rgba(39,50,77,0.1)] md:grid-cols-[0.9fr_1.1fr]">
        <div className="relative hidden overflow-hidden bg-[#6054d8] p-10 text-white md:block"><div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10" /><div className="absolute -bottom-28 -left-16 h-72 w-72 rounded-full bg-[#3e36a8]/40" /><div className="relative flex h-full flex-col"><Link to="/" className="flex items-center gap-2.5"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15"><MessageCircle size={19} /></span><span className="text-[21px] font-extrabold tracking-[-0.05em]">loop<span className="text-[#c9c5ff]">.</span></span></Link><div className="mt-auto"><p className="max-w-[280px] font-display text-3xl font-extrabold leading-tight tracking-[-0.05em]">Conversations that keep up with you.</p><p className="mt-4 max-w-[260px] text-sm leading-6 text-white/65">A calmer place for your people, ideas, and everything in between.</p></div></div></div>
        <div className="p-7 sm:p-12"><div className="mb-9 md:hidden"><Link to="/" className="flex items-center gap-2.5"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#6054d8] text-white"><MessageCircle size={19} /></span><span className="text-[21px] font-extrabold tracking-[-0.05em] text-[#222844]">loop<span className="text-[#6054d8]">.</span></span></Link></div><div className="mb-8"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6054d8]">Welcome back</p><h1 className="mt-2 font-display text-3xl font-extrabold tracking-[-0.05em] text-[#252d45]">{mode === "login" ? "Sign in to loop." : "Create your account."}</h1><p className="mt-2 text-sm text-[#8e98aa]">{mode === "login" ? "Pick up right where you left off." : "Start making space for better conversations."}</p></div><form onSubmit={submit} className="space-y-4">{sessionExpired && <p className="rounded-xl bg-[#fff8e6] px-3 py-2.5 text-xs font-medium text-[#9a6d1b]">Your session has expired. Please sign in again.</p>}{mode === "register" && <label className="block"><span className="mb-2 block text-xs font-bold text-[#596278]">Your name</span><span className="flex items-center gap-2.5 rounded-xl border border-[#e2e6ef] px-3.5 py-3 focus-within:border-[#6054d8]"><UserRound size={17} className="text-[#a4adbd]" /><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-transparent text-sm outline-none placeholder:text-[#b1b8c5]" placeholder="Lena Morris" /></span></label>}<label className="block"><span className="mb-2 block text-xs font-bold text-[#596278]">Email address</span><span className="flex items-center gap-2.5 rounded-xl border border-[#e2e6ef] px-3.5 py-3 focus-within:border-[#6054d8]"><Mail size={17} className="text-[#a4adbd]" /><input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full bg-transparent text-sm outline-none placeholder:text-[#b1b8c5]" placeholder="you@example.com" /></span></label><label className="block"><span className="mb-2 block text-xs font-bold text-[#596278]">Password</span><span className="flex items-center gap-2.5 rounded-xl border border-[#e2e6ef] px-3.5 py-3 focus-within:border-[#6054d8]"><LockKeyhole size={17} className="text-[#a4adbd]" /><input required minLength={8} type={showPassword ? "text" : "password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full bg-transparent text-sm outline-none placeholder:text-[#b1b8c5]" placeholder="8+ characters" /><button type="button" onClick={() => setShowPassword(!showPassword)} className="text-[#a4adbd]" aria-label="Toggle password visibility">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>{error && <p className="rounded-xl bg-[#fff0ee] px-3 py-2.5 text-xs font-medium text-[#c45748]">{error}</p>}<button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#6054d8] py-3.5 text-sm font-bold text-white shadow-[0_8px_18px_rgba(96,84,216,0.22)] transition hover:bg-[#5147c4] disabled:cursor-wait disabled:opacity-60">{loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}<ArrowRight size={16} /></button></form><p className="mt-7 text-center text-xs text-[#929bad]">{mode === "login" ? "New to loop?" : "Already have an account?"}{" "}<button onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }} className="font-bold text-[#6054d8] hover:underline">{mode === "login" ? "Create an account" : "Sign in instead"}</button></p></div>
      </div>
    </main>
  );
}
