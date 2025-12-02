"use client";

import { useState, useEffect, useCallback, useId } from "react";

interface AdminPlayer {
  id: number;
  name: string;
  pin: string;
  has_assignment: boolean;
  secret_player_name: string | null;
  incompatible_ids: number[];
  incompatible_names: string[];
}

export default function AdminDashboard() {
  const [adminPin, setAdminPin] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [players, setPlayers] = useState<AdminPlayer[]>([]);
  const [revealedSecrets, setRevealedSecrets] = useState<Set<number>>(new Set());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // New player form
  const [newName, setNewName] = useState("");
  const [newPin, setNewPin] = useState(() => String(Math.floor(1000 + Math.random() * 9000)));
  const [selectedIncompatible, setSelectedIncompatible] = useState<number[]>([]);

  // Edit player modal
  const [editingPlayer, setEditingPlayer] = useState<AdminPlayer | null>(null);
  const [editName, setEditName] = useState("");
  const [editPin, setEditPin] = useState("");
  const [editIncompatible, setEditIncompatible] = useState<number[]>([]);
  const editNameId = useId();
  const editPinId = useId();
  const newNameId = useId();
  const newPinId = useId();

  // Generate a random 4-digit PIN
  const generateRandomPin = () => {
    return String(Math.floor(1000 + Math.random() * 9000));
  };

  // Pre-defined snowflake positions for decorative elements
  const snowflakes = [
    { id: "s1", left: 7, top: 13 },
    { id: "s2", left: 14, top: 26 },
    { id: "s3", left: 21, top: 39 },
    { id: "s4", left: 28, top: 52 },
    { id: "s5", left: 35, top: 65 },
    { id: "s6", left: 42, top: 78 },
    { id: "s7", left: 49, top: 91 },
    { id: "s8", left: 56, top: 4 },
    { id: "s9", left: 63, top: 17 },
    { id: "s10", left: 70, top: 30 },
    { id: "s11", left: 77, top: 43 },
    { id: "s12", left: 84, top: 56 },
    { id: "s13", left: 91, top: 69 },
    { id: "s14", left: 98, top: 82 },
    { id: "s15", left: 5, top: 95 },
  ];

  const fetchPlayers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/players", {
        headers: { "x-admin-pin": adminPin },
      });
      if (res.ok) {
        const data = await res.json();
        setPlayers(data);
      }
    } catch {
      console.error("Failed to fetch players");
    }
  }, [adminPin]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchPlayers();
    }
  }, [isAuthenticated, fetchPlayers]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: adminPin }),
      });

      if (res.ok) {
        setIsAuthenticated(true);
      } else {
        const data = await res.json();
        setError(data.error || "Invalid PIN");
      }
    } catch {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/players", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-pin": adminPin,
        },
        body: JSON.stringify({
          name: newName,
          pin: newPin,
          incompatibleIds: selectedIncompatible,
        }),
      });

      if (res.ok) {
        setNewName("");
        setNewPin(generateRandomPin());
        setSelectedIncompatible([]);
        fetchPlayers();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to add player");
      }
    } catch {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePlayer = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;

    try {
      const res = await fetch(`/api/admin/players/${id}`, {
        method: "DELETE",
        headers: { "x-admin-pin": adminPin },
      });

      if (res.ok) {
        fetchPlayers();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to delete player");
      }
    } catch {
      setError("Connection error");
    }
  };

  const handleUpdatePlayer = async () => {
    if (!editingPlayer) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/admin/players/${editingPlayer.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-pin": adminPin,
        },
        body: JSON.stringify({
          name: editName !== editingPlayer.name ? editName : undefined,
          pin: editPin !== editingPlayer.pin ? editPin : undefined,
          incompatibleIds: editIncompatible,
        }),
      });

      if (res.ok) {
        setEditingPlayer(null);
        fetchPlayers();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update");
      }
    } catch {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  };

  const toggleIncompatible = (id: number) => {
    setSelectedIncompatible((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleEditIncompatible = (id: number) => {
    setEditIncompatible((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleRevealSecret = (playerId: number) => {
    setRevealedSecrets((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) {
        next.delete(playerId);
      } else {
        next.add(playerId);
      }
      return next;
    });
  };

  const openEditModal = (player: AdminPlayer) => {
    setEditingPlayer(player);
    setEditName(player.name);
    setEditPin(player.pin);
    setEditIncompatible(player.incompatible_ids);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a472a] relative overflow-hidden p-4">
        {/* Snowflakes */}
        <div className="absolute inset-0 pointer-events-none">
          {snowflakes.map((flake) => (
            <div
              key={flake.id}
              className="absolute text-white/20"
              style={{
                left: `${flake.left}%`,
                top: `${flake.top}%`,
                fontSize: `${12 + (flake.left % 3) * 8}px`,
              }}
            >
              ❄
            </div>
          ))}
        </div>

        <div className="bg-white/95 backdrop-blur rounded-3xl shadow-2xl p-6 md:p-8 w-full max-w-md relative z-10 border-4 border-red-600">
          <div className="text-center text-5xl mb-4">🎅</div>
          <h1 className="text-2xl font-bold text-center mb-2 text-gray-800">
            Painel de Administração
          </h1>
          <p className="text-gray-500 text-center mb-6">
            Amigo Secreto - Família Rodrigues
          </p>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              placeholder="PIN de 6 dígitos"
              value={adminPin}
              onChange={(e) => setAdminPin(e.target.value)}
              maxLength={6}
              className="w-full p-4 border-2 border-green-600 rounded-xl mb-4 text-center text-2xl tracking-widest text-gray-800 focus:border-red-500 focus:outline-none bg-green-50"
            />
            {error && (
              <p className="text-red-500 text-sm text-center mb-4">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading || adminPin.length !== 6}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-4 rounded-xl text-lg font-bold hover:from-red-700 hover:to-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
            >
              {loading ? "A verificar..." : "🎄 Entrar"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a472a] p-4 md:p-8 pb-16 relative overflow-hidden">
      {/* Background snowflakes */}
      <div className="absolute inset-0 pointer-events-none">
        {snowflakes.map((flake) => (
          <div
            key={`bg-${flake.id}`}
            className="absolute text-white/10"
            style={{
              left: `${flake.left}%`,
              top: `${flake.top}%`,
              fontSize: `${12 + (flake.left % 3) * 8}px`,
            }}
          >
            ❄
          </div>
        ))}
      </div>

      <div className="max-w-5xl mx-auto relative z-10">
        <div className="flex justify-between items-center mb-6 md:mb-8">
          <div className="flex items-center gap-2 md:gap-3">
            <span className="text-3xl md:text-4xl">🎅</span>
            <h1 className="text-xl md:text-3xl font-bold text-white">Painel Admin</h1>
          </div>
          <button
            type="button"
            onClick={() => setIsAuthenticated(false)}
            className="text-white/70 hover:text-white flex items-center gap-1 md:gap-2 text-sm md:text-base"
          >
            Sair 🚪
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border-2 border-red-400 text-red-700 px-4 py-3 rounded-xl mb-4">
            {error}
            <button type="button" onClick={() => setError("")} className="float-right font-bold">
              ✕
            </button>
          </div>
        )}

        {/* Add Player Form */}
        <div className="bg-white/95 backdrop-blur rounded-2xl shadow-xl p-4 md:p-6 mb-6 md:mb-8 border-4 border-red-600">
          <h2 className="text-lg md:text-xl font-semibold mb-4 text-gray-800 flex items-center gap-2">
            🎁 Adicionar Participante
          </h2>
          <form onSubmit={handleAddPlayer} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor={newNameId} className="block text-sm font-medium text-gray-700 mb-1">
                  Nome
                </label>
                <input
                  id={newNameId}
                  type="text"
                  placeholder="Nome do participante"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full p-3 border-2 border-green-600 rounded-xl text-gray-800 focus:border-red-500 focus:outline-none bg-green-50 text-base"
                  required
                />
              </div>
              <div>
                <label htmlFor={newPinId} className="block text-sm font-medium text-gray-700 mb-1">
                  PIN (gerado automaticamente)
                </label>
                <div className="flex gap-2">
                  <input
                    id={newPinId}
                    type="text"
                    value={newPin}
                    readOnly
                    className="flex-1 p-3 border-2 border-green-600 rounded-xl text-gray-800 font-mono text-center text-xl md:text-2xl tracking-widest bg-green-100 cursor-default"
                  />
                  <button
                    type="button"
                    onClick={() => setNewPin(generateRandomPin())}
                    className="px-3 md:px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-xl text-gray-700 transition-all text-lg"
                    title="Gerar novo PIN"
                  >
                    🔄
                  </button>
                </div>
              </div>
            </div>

            {players.length > 0 && (
              <div>
                <span className="block text-sm font-medium text-gray-700 mb-2">
                  🚫 Incompatível com (familiares diretos):
                </span>
                <div className="flex flex-wrap gap-2">
                  {players.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggleIncompatible(p.id)}
                      className={`px-3 py-1 rounded-full text-sm transition-all ${
                        selectedIncompatible.includes(p.id)
                          ? "bg-red-500 text-white shadow-md"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !newName.trim()}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-3 rounded-xl font-semibold hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
            >
              ➕ Adicionar Participante
            </button>
          </form>
        </div>

        {/* Players List */}
        <div className="bg-white/95 backdrop-blur rounded-2xl shadow-xl p-4 md:p-6 border-4 border-yellow-400">
          <h2 className="text-lg md:text-xl font-semibold mb-4 text-gray-800 flex items-center gap-2">
            🎄 Participantes ({players.length})
          </h2>

          {players.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Ainda não há participantes. Adiciona alguns acima! ☝️
            </p>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {players.map((player) => (
                  <div key={player.id} className="bg-green-50 rounded-xl p-4 border-2 border-green-200">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-gray-800 text-lg">{player.name}</h3>
                        <span className="font-mono text-lg bg-white px-2 py-1 rounded border border-gray-300">
                          {player.pin}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(player)}
                          className="p-2 bg-blue-100 rounded-lg text-blue-600 hover:bg-blue-200"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePlayer(player.id, player.name)}
                          className="p-2 bg-red-100 rounded-lg text-red-600 hover:bg-red-200"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Estado:</span>
                        {player.has_assignment ? (
                          <span className="text-green-600 font-medium">✓ Atribuído</span>
                        ) : (
                          <span className="text-yellow-600 font-medium">⏳ Pendente</span>
                        )}
                      </div>

                      {player.has_assignment && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Amigo Secreto:</span>
                          <button
                            type="button"
                            onClick={() => toggleRevealSecret(player.id)}
                            className={`px-3 py-1 rounded-lg transition-all ${
                              revealedSecrets.has(player.id)
                                ? "bg-red-100 text-red-700 font-medium"
                                : "bg-gray-200 text-gray-700"
                            }`}
                          >
                            {revealedSecrets.has(player.id)
                              ? `🎁 ${player.secret_player_name}`
                              : "👁️ Ver"}
                          </button>
                        </div>
                      )}

                      {player.incompatible_names.length > 0 && (
                        <div className="pt-2 border-t border-green-200">
                          <span className="text-gray-600">Incompatíveis: </span>
                          <span className="text-gray-800">{player.incompatible_names.join(", ")}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-green-600 text-gray-800">
                      <th className="text-left py-3">Nome</th>
                      <th className="text-left py-3">PIN</th>
                      <th className="text-left py-3">Estado</th>
                      <th className="text-left py-3">Amigo Secreto</th>
                      <th className="text-left py-3">Incompatíveis</th>
                      <th className="text-right py-3">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {players.map((player) => (
                      <tr key={player.id} className="border-b border-gray-200 text-gray-800 hover:bg-green-50 transition-colors">
                        <td className="py-3 font-medium">{player.name}</td>
                        <td className="py-3 font-mono bg-gray-100 rounded text-center">{player.pin}</td>
                        <td className="py-3">
                          {player.has_assignment ? (
                            <span className="text-green-600 font-medium">✓ Atribuído</span>
                          ) : (
                            <span className="text-yellow-600 font-medium">⏳ Pendente</span>
                          )}
                        </td>
                        <td className="py-3">
                          {player.has_assignment ? (
                            <button
                              type="button"
                              onClick={() => toggleRevealSecret(player.id)}
                              className={`text-sm px-3 py-1 rounded-lg transition-all ${
                                revealedSecrets.has(player.id)
                                  ? "bg-red-100 text-red-700 font-medium"
                                  : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                              }`}
                            >
                              {revealedSecrets.has(player.id)
                                ? `🎁 ${player.secret_player_name}`
                                : "👁️ Clica para ver"}
                            </button>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-3">
                          <button
                            type="button"
                            onClick={() => openEditModal(player)}
                            className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {player.incompatible_names.length > 0
                              ? player.incompatible_names.join(", ")
                              : "Nenhum - clica para editar"}
                          </button>
                        </td>
                        <td className="py-3 text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(player)}
                            className="text-blue-500 hover:text-blue-700"
                          >
                            ✏️ Editar
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleDeletePlayer(player.id, player.name)
                            }
                            className="text-red-500 hover:text-red-700"
                          >
                            🗑️ Apagar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Edit Player Modal */}
      {editingPlayer && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-6 w-full max-w-md border-4 border-green-600">
            <h3 className="text-xl font-semibold mb-4 text-gray-800 flex items-center gap-2">
              ✏️ Editar Participante
            </h3>

            <div className="space-y-4 mb-6">
              <div>
                <label htmlFor={editNameId} className="block text-sm font-medium text-gray-700 mb-1">
                  Nome
                </label>
                <input
                  id={editNameId}
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full p-3 border-2 border-green-600 rounded-xl text-gray-800 focus:border-red-500 focus:outline-none bg-green-50"
                />
              </div>

              <div>
                <label htmlFor={editPinId} className="block text-sm font-medium text-gray-700 mb-1">
                  PIN (4 dígitos)
                </label>
                <input
                  id={editPinId}
                  type="text"
                  value={editPin}
                  onChange={(e) => setEditPin(e.target.value.replace(/\D/g, ""))}
                  maxLength={4}
                  className="w-full p-3 border-2 border-green-600 rounded-xl text-gray-800 font-mono text-center tracking-widest focus:border-red-500 focus:outline-none bg-green-50"
                />
              </div>

              <div>
                <span className="block text-sm font-medium text-gray-700 mb-2">
                  🚫 Incompatível com (familiares diretos):
                </span>
                <div className="flex flex-wrap gap-2">
                  {players
                    .filter((p) => p.id !== editingPlayer.id)
                    .map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => toggleEditIncompatible(p.id)}
                        className={`px-3 py-1 rounded-full text-sm transition-all ${
                          editIncompatible.includes(p.id)
                            ? "bg-red-500 text-white shadow-md"
                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        }`}
                      >
                        {p.name}
                      </button>
                    ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setEditingPlayer(null)}
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-medium transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleUpdatePlayer}
                disabled={loading || !editName || editPin.length !== 4}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 disabled:opacity-50 font-medium transition-all shadow-lg"
              >
                {loading ? "A guardar..." : "💾 Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer decoration */}
      <div className="fixed bottom-0 left-0 right-0 text-center text-2xl md:text-4xl py-2 pointer-events-none bg-gradient-to-t from-[#1a472a] to-transparent">
        <span className="hidden md:inline">🎄 ⭐ 🎁 ❄️ 🦌 🎅 🦌 ❄️ 🎁 ⭐ 🎄</span>
        <span className="md:hidden">🎄 🎅 🎁 🎄</span>
      </div>
    </div>
  );
}
