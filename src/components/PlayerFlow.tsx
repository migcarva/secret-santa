"use client";

import { useState } from "react";

type Step = "welcome" | "pin" | "result";

interface PlayerResult {
  name: string;
  secretPlayerName: string;
}

// Pre-defined decorative elements to avoid array index keys
const welcomeSnowflakes = [
  { id: "w1", left: 5, top: 10, size: 15 },
  { id: "w2", left: 12, top: 35, size: 22 },
  { id: "w3", left: 20, top: 60, size: 18 },
  { id: "w4", left: 28, top: 15, size: 25 },
  { id: "w5", left: 35, top: 45, size: 12 },
  { id: "w6", left: 42, top: 75, size: 20 },
  { id: "w7", left: 50, top: 25, size: 16 },
  { id: "w8", left: 58, top: 55, size: 28 },
  { id: "w9", left: 65, top: 80, size: 14 },
  { id: "w10", left: 72, top: 20, size: 22 },
  { id: "w11", left: 78, top: 50, size: 18 },
  { id: "w12", left: 85, top: 70, size: 24 },
  { id: "w13", left: 92, top: 30, size: 16 },
  { id: "w14", left: 8, top: 85, size: 20 },
  { id: "w15", left: 45, top: 90, size: 12 },
  { id: "w16", left: 62, top: 5, size: 26 },
  { id: "w17", left: 30, top: 95, size: 14 },
  { id: "w18", left: 88, top: 40, size: 18 },
  { id: "w19", left: 15, top: 70, size: 22 },
  { id: "w20", left: 55, top: 65, size: 16 },
];

const christmasLights = [
  { id: "l1", color: "bg-red-500" },
  { id: "l2", color: "bg-yellow-400" },
  { id: "l3", color: "bg-green-500" },
  { id: "l4", color: "bg-blue-400" },
  { id: "l5", color: "bg-red-500" },
  { id: "l6", color: "bg-yellow-400" },
  { id: "l7", color: "bg-green-500" },
  { id: "l8", color: "bg-blue-400" },
  { id: "l9", color: "bg-red-500" },
  { id: "l10", color: "bg-yellow-400" },
  { id: "l11", color: "bg-green-500" },
  { id: "l12", color: "bg-blue-400" },
  { id: "l13", color: "bg-red-500" },
  { id: "l14", color: "bg-yellow-400" },
  { id: "l15", color: "bg-green-500" },
];

const pinSnowflakes = [
  { id: "p1", left: 8, top: 15, size: 18 },
  { id: "p2", left: 22, top: 40, size: 24 },
  { id: "p3", left: 35, top: 70, size: 16 },
  { id: "p4", left: 48, top: 25, size: 20 },
  { id: "p5", left: 62, top: 55, size: 14 },
  { id: "p6", left: 75, top: 80, size: 22 },
  { id: "p7", left: 88, top: 35, size: 18 },
  { id: "p8", left: 15, top: 60, size: 26 },
  { id: "p9", left: 42, top: 85, size: 12 },
  { id: "p10", left: 55, top: 10, size: 20 },
  { id: "p11", left: 70, top: 45, size: 16 },
  { id: "p12", left: 82, top: 65, size: 24 },
  { id: "p13", left: 28, top: 90, size: 14 },
  { id: "p14", left: 95, top: 20, size: 18 },
  { id: "p15", left: 5, top: 50, size: 22 },
];

const celebrationEmojis = [
  { id: "c1", emoji: "🎄", left: 3, top: 8, size: 22 },
  { id: "c2", emoji: "⭐", left: 10, top: 32, size: 28 },
  { id: "c3", emoji: "🎁", left: 18, top: 58, size: 20 },
  { id: "c4", emoji: "❄", left: 25, top: 82, size: 24 },
  { id: "c5", emoji: "✨", left: 33, top: 15, size: 18 },
  { id: "c6", emoji: "🎄", left: 40, top: 45, size: 26 },
  { id: "c7", emoji: "⭐", left: 48, top: 72, size: 22 },
  { id: "c8", emoji: "🎁", left: 55, top: 5, size: 30 },
  { id: "c9", emoji: "❄", left: 62, top: 38, size: 16 },
  { id: "c10", emoji: "✨", left: 70, top: 65, size: 24 },
  { id: "c11", emoji: "🎄", left: 78, top: 88, size: 20 },
  { id: "c12", emoji: "⭐", left: 85, top: 22, size: 28 },
  { id: "c13", emoji: "🎁", left: 92, top: 50, size: 18 },
  { id: "c14", emoji: "❄", left: 8, top: 75, size: 26 },
  { id: "c15", emoji: "✨", left: 15, top: 95, size: 22 },
  { id: "c16", emoji: "🎄", left: 38, top: 28, size: 24 },
  { id: "c17", emoji: "⭐", left: 52, top: 55, size: 20 },
  { id: "c18", emoji: "🎁", left: 65, top: 12, size: 28 },
  { id: "c19", emoji: "❄", left: 75, top: 42, size: 16 },
  { id: "c20", emoji: "✨", left: 88, top: 68, size: 24 },
  { id: "c21", emoji: "🎄", left: 95, top: 90, size: 18 },
  { id: "c22", emoji: "⭐", left: 22, top: 18, size: 26 },
  { id: "c23", emoji: "🎁", left: 45, top: 62, size: 22 },
  { id: "c24", emoji: "❄", left: 58, top: 85, size: 20 },
  { id: "c25", emoji: "✨", left: 72, top: 35, size: 28 },
  { id: "c26", emoji: "🎄", left: 82, top: 58, size: 16 },
  { id: "c27", emoji: "⭐", left: 30, top: 48, size: 24 },
  { id: "c28", emoji: "🎁", left: 12, top: 68, size: 20 },
  { id: "c29", emoji: "❄", left: 50, top: 92, size: 26 },
  { id: "c30", emoji: "✨", left: 68, top: 8, size: 22 },
];

export default function PlayerFlow() {
  const [step, setStep] = useState<Step>("welcome");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PlayerResult | null>(null);

  const handleSubmitPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const loginRes = await fetch("/api/player/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });

      if (!loginRes.ok) {
        const data = await loginRes.json();
        setError(data.error === "Invalid PIN" ? "PIN inválido" : data.error);
        setLoading(false);
        return;
      }

      const loginData = await loginRes.json();

      if (loginData.hasAssignment) {
        setResult({
          name: loginData.name,
          secretPlayerName: loginData.secretPlayerName,
        });
        setStep("result");
        setLoading(false);
        return;
      }

      const assignRes = await fetch("/api/player/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });

      if (assignRes.ok) {
        const assignData = await assignRes.json();
        setResult({
          name: assignData.name,
          secretPlayerName: assignData.secretPlayerName,
        });
        setStep("result");
      } else {
        const data = await assignRes.json();
        setError(data.error || "Erro ao atribuir amigo secreto");
      }
    } catch {
      setError("Erro de ligação. Tenta novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep("welcome");
    setPin("");
    setError("");
    setResult(null);
  };

  if (step === "welcome") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#1a472a] p-8 relative overflow-hidden">
        {/* Snowflakes */}
        <div className="absolute inset-0 pointer-events-none">
          {welcomeSnowflakes.map((flake) => (
            <div
              key={flake.id}
              className="absolute text-white/20 animate-pulse"
              style={{
                left: `${flake.left}%`,
                top: `${flake.top}%`,
                fontSize: `${flake.size}px`,
                animationDelay: `${flake.left * 0.05}s`,
              }}
            >
              ❄
            </div>
          ))}
        </div>

        {/* Christmas lights decoration */}
        <div className="absolute top-0 left-0 right-0 flex justify-center gap-4 py-4">
          {christmasLights.map((light, idx) => (
            <div
              key={light.id}
              className={`w-3 h-3 rounded-full animate-pulse ${light.color}`}
              style={{ animationDelay: `${idx * 0.2}s` }}
            />
          ))}
        </div>

        <div className="text-center relative z-10">
          <div className="text-8xl mb-6">🎄</div>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 drop-shadow-lg">
            Amigo Secreto
          </h1>
          <p className="text-white/80 text-xl mb-4">Família Rodrigues 2025</p>
          <p className="text-white/60 text-lg mb-12">
            Descobre a quem vais dar o presente!
          </p>
          <button
            type="button"
            onClick={() => setStep("pin")}
            className="bg-gradient-to-r from-red-600 to-red-700 text-white px-12 py-5 rounded-full text-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all border-4 border-yellow-400/50"
          >
            🎁 Descobrir o Meu Amigo Secreto
          </button>
        </div>

        {/* Bottom decoration */}
        <div className="absolute bottom-0 left-0 right-0 text-center text-6xl">
          🎅 🦌 🦌 🦌 🛷
        </div>
      </div>
    );
  }

  if (step === "pin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a472a] p-8 relative overflow-hidden">
        {/* Snowflakes */}
        <div className="absolute inset-0 pointer-events-none">
          {pinSnowflakes.map((flake) => (
            <div
              key={flake.id}
              className="absolute text-white/20"
              style={{
                left: `${flake.left}%`,
                top: `${flake.top}%`,
                fontSize: `${flake.size}px`,
              }}
            >
              ❄
            </div>
          ))}
        </div>

        <div className="bg-white/95 backdrop-blur rounded-3xl shadow-2xl p-8 w-full max-w-md relative z-10 border-4 border-red-600">
          <div className="text-center text-5xl mb-4">🎄</div>
          <h2 className="text-2xl font-bold text-center mb-2 text-gray-800">
            Insere o teu PIN
          </h2>
          <p className="text-gray-500 text-center mb-6">
            O teu código secreto de 4 dígitos
          </p>

          <form onSubmit={handleSubmitPin}>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="****"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              maxLength={4}
              className="w-full p-4 border-2 border-green-600 rounded-xl mb-4 text-center text-4xl tracking-[0.5em] font-bold text-gray-800 focus:border-red-500 focus:outline-none bg-green-50"
            />

            {error && <p className="text-red-500 text-center mb-4">{error}</p>}

            <button
              type="submit"
              disabled={loading || pin.length !== 4}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-4 rounded-xl text-xl font-bold hover:from-red-700 hover:to-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
            >
              {loading ? "A procurar..." : "🎁 Revelar!"}
            </button>
          </form>

          <button
            type="button"
            onClick={handleReset}
            className="w-full mt-4 text-gray-500 hover:text-gray-700"
          >
            ← Voltar
          </button>
        </div>
      </div>
    );
  }

  // Result step
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1a472a] p-8 relative overflow-hidden">
      {/* Celebration effects */}
      <div className="absolute inset-0 pointer-events-none">
        {celebrationEmojis.map((item) => (
          <div
            key={item.id}
            className="absolute animate-bounce"
            style={{
              left: `${item.left}%`,
              top: `${item.top}%`,
              fontSize: `${item.size}px`,
              animationDelay: `${item.left * 0.05}s`,
              animationDuration: `${1 + (item.top % 3)}s`,
            }}
          >
            {item.emoji}
          </div>
        ))}
      </div>

      <div className="bg-white/95 backdrop-blur rounded-3xl shadow-2xl p-8 w-full max-w-md text-center relative z-10 border-4 border-yellow-400">
        <div className="text-7xl mb-4">🎁</div>
        <h2 className="text-2xl text-gray-600 mb-2">
          Olá <span className="font-bold text-green-700">{result?.name}</span>!
        </h2>
        <p className="text-gray-500 mb-6">O teu Amigo Secreto é:</p>
        <div className="bg-gradient-to-r from-red-600 via-red-500 to-green-600 text-white text-3xl md:text-4xl font-bold py-8 px-4 rounded-2xl mb-6 shadow-lg border-4 border-yellow-400">
          🎄 {result?.secretPlayerName} 🎄
        </div>
        <p className="text-gray-500 text-sm mb-6">
          Lembra-te: É segredo! Não contes a ninguém! 🤫
        </p>
        <div className="text-4xl mb-6">🎅 🦌 🎄 ⭐ 🎁</div>
        <button
          type="button"
          onClick={handleReset}
          className="text-gray-500 hover:text-gray-700 font-medium"
        >
          ✓ Entendido!
        </button>
      </div>
    </div>
  );
}
