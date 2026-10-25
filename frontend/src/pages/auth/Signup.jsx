import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { HeartPulse, Stethoscope, UserCheck, Lock, Mail, User, ShieldCheck, AlertTriangle } from "lucide-react";

function Signup() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("patient");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setErrorMsg("Please fill in all required fields.");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg("");

      const normalizedRole = role.toLowerCase();

      // 1. Sign up user with metadata
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: normalizedRole,
          },
        },
      });

      if (error) throw error;

      const user = data.user;

      if (!user) {
        alert("Registration initiated. Please check your email to confirm registration.");
        navigate("/");
        return;
      }

      // 2. Insert profile record (upsert)
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            full_name: fullName,
            role: normalizedRole,
          },
          { onConflict: "id" }
        );

      if (profileError) {
        console.warn("Profile insert warning:", profileError.message);
      }

      // 3. Create initial empty details row
      if (normalizedRole === "patient") {
        await supabase.from("patient_details").upsert({ id: user.id }, { onConflict: "id" });
      } else if (normalizedRole === "doctor") {
        await supabase.from("doctor_details").upsert({ id: user.id }, { onConflict: "id" });
      }

      alert("Account created successfully! Redirecting to login...");
      navigate("/");
    } catch (err) {
      console.error(err);
      if (err.message?.toLowerCase().includes("rate limit") || err.message?.toLowerCase().includes("email rate")) {
        setErrorMsg("Supabase Email Rate Limit Exceeded. Turn off 'Confirm Email' in Supabase Dashboard (Auth -> Providers -> Email) for instant dev testing.");
      } else {
        setErrorMsg(err.message || "Failed to create account.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-4 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-teal-400 text-white flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-500/20">
            <HeartPulse size={30} />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Create MediVault Account
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Secure electronic health records platform
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold leading-relaxed flex items-start gap-2">
            <AlertTriangle size={18} className="shrink-0 text-rose-400 mt-0.5" />
            <div>{errorMsg}</div>
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Dr. Jane Doe / John Smith"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-hidden focus:border-blue-500 text-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-hidden focus:border-blue-500 text-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-hidden focus:border-blue-500 text-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
              Account Role
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole("patient")}
                className={`py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition ${
                  role === "patient"
                    ? "bg-blue-600 border-blue-500 text-white shadow-md"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                <UserCheck size={16} /> Patient
              </button>

              <button
                type="button"
                onClick={() => setRole("doctor")}
                className={`py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition ${
                  role === "doctor"
                    ? "bg-blue-600 border-blue-500 text-white shadow-md"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                <Stethoscope size={16} /> Doctor
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-blue-600/20 transition flex items-center justify-center gap-2"
          >
            <ShieldCheck size={18} />
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          Already have an account?{" "}
          <Link to="/" className="font-bold text-blue-400 hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Signup;