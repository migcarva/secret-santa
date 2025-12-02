import Database from "better-sqlite3";
import path from "path";
import type {
  Player,
  PlayerWithSecret,
  AdminPlayerView,
} from "./types";

const DB_PATH = process.env.DATABASE_PATH || "./data/secret-santa.db";

// Ensure absolute path
const dbPath = path.isAbsolute(DB_PATH)
  ? DB_PATH
  : path.join(process.cwd(), DB_PATH);

// Create database connection
const db = new Database(dbPath);

// Enable foreign keys
db.pragma("foreign_keys = ON");

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    pin TEXT NOT NULL UNIQUE,
    secret_player_id INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (secret_player_id) REFERENCES players(id)
  );

  CREATE TABLE IF NOT EXISTS incompatibilities (
    player_id INTEGER NOT NULL,
    incompatible_with_id INTEGER NOT NULL,
    PRIMARY KEY (player_id, incompatible_with_id),
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    FOREIGN KEY (incompatible_with_id) REFERENCES players(id) ON DELETE CASCADE
  );
`);

// ============ Player Queries ============

export function getPlayerByPin(pin: string): PlayerWithSecret | null {
  const stmt = db.prepare(`
    SELECT
      p.*,
      sp.name as secret_player_name
    FROM players p
    LEFT JOIN players sp ON p.secret_player_id = sp.id
    WHERE p.pin = ?
  `);
  return stmt.get(pin) as PlayerWithSecret | null;
}

export function getPlayerById(id: number): Player | null {
  const stmt = db.prepare("SELECT * FROM players WHERE id = ?");
  return stmt.get(id) as Player | null;
}

export function getAllPlayers(): Player[] {
  const stmt = db.prepare("SELECT * FROM players ORDER BY name");
  return stmt.all() as Player[];
}

export function getPlayersForAdmin(): AdminPlayerView[] {
  const players = db.prepare(`
    SELECT
      p.id,
      p.name,
      p.pin,
      CASE WHEN p.secret_player_id IS NOT NULL THEN 1 ELSE 0 END as has_assignment,
      sp.name as secret_player_name
    FROM players p
    LEFT JOIN players sp ON p.secret_player_id = sp.id
    ORDER BY p.name
  `).all() as Array<{
    id: number;
    name: string;
    pin: string;
    has_assignment: number;
    secret_player_name: string | null;
  }>;

  // Get incompatibilities for each player
  const incompatStmt = db.prepare(`
    SELECT p.id, p.name
    FROM incompatibilities i
    JOIN players p ON i.incompatible_with_id = p.id
    WHERE i.player_id = ?
  `);

  return players.map((p) => {
    const incompats = incompatStmt.all(p.id) as { id: number; name: string }[];
    return {
      id: p.id,
      name: p.name,
      pin: p.pin,
      has_assignment: p.has_assignment === 1,
      secret_player_name: p.secret_player_name,
      incompatible_ids: incompats.map((r) => r.id),
      incompatible_names: incompats.map((r) => r.name),
    };
  });
}

export function createPlayer(
  name: string,
  pin: string,
  incompatibleIds: number[]
): Player {
  const insertPlayer = db.prepare(
    "INSERT INTO players (name, pin) VALUES (?, ?)"
  );
  const insertIncompat = db.prepare(
    "INSERT INTO incompatibilities (player_id, incompatible_with_id) VALUES (?, ?)"
  );

  const result = db.transaction(() => {
    const info = insertPlayer.run(name, pin);
    const playerId = info.lastInsertRowid as number;

    // Insert bidirectional incompatibilities
    for (const incompatId of incompatibleIds) {
      insertIncompat.run(playerId, incompatId);
      insertIncompat.run(incompatId, playerId);
    }

    return getPlayerById(playerId)!;
  })();

  return result;
}

export function updatePlayer(
  playerId: number,
  data: { name?: string; pin?: string }
): { success: boolean; error?: string } {
  if (data.pin && isPinTaken(data.pin, playerId)) {
    return { success: false, error: "This PIN is already in use" };
  }

  const updates: string[] = [];
  const values: (string | number)[] = [];

  if (data.name) {
    updates.push("name = ?");
    values.push(data.name);
  }
  if (data.pin) {
    updates.push("pin = ?");
    values.push(data.pin);
  }

  if (updates.length === 0) {
    return { success: true };
  }

  values.push(playerId);
  const stmt = db.prepare(`UPDATE players SET ${updates.join(", ")} WHERE id = ?`);
  stmt.run(...values);

  return { success: true };
}

export function updatePlayerIncompatibilities(
  playerId: number,
  incompatibleIds: number[]
): { success: boolean; error?: string } {
  const deleteIncompat = db.prepare(
    "DELETE FROM incompatibilities WHERE player_id = ? OR incompatible_with_id = ?"
  );
  const insertIncompat = db.prepare(
    "INSERT OR IGNORE INTO incompatibilities (player_id, incompatible_with_id) VALUES (?, ?)"
  );

  db.transaction(() => {
    // Remove all existing incompatibilities for this player
    deleteIncompat.run(playerId, playerId);

    // Insert new bidirectional incompatibilities
    for (const incompatId of incompatibleIds) {
      insertIncompat.run(playerId, incompatId);
      insertIncompat.run(incompatId, playerId);
    }
  })();

  return { success: true };
}

export function getPlayerIncompatibleIds(playerId: number): number[] {
  const stmt = db.prepare(
    "SELECT incompatible_with_id FROM incompatibilities WHERE player_id = ?"
  );
  return (stmt.all(playerId) as { incompatible_with_id: number }[]).map(
    (r) => r.incompatible_with_id
  );
}

export function deletePlayer(id: number): { success: boolean; error?: string } {
  // Check if this player is assigned as someone's secret
  const assignedTo = db.prepare(
    "SELECT name FROM players WHERE secret_player_id = ?"
  ).get(id) as { name: string } | undefined;

  if (assignedTo) {
    return {
      success: false,
      error: `Cannot delete: this player is assigned as ${assignedTo.name}'s secret santa`,
    };
  }

  // Delete player (incompatibilities will cascade)
  const stmt = db.prepare("DELETE FROM players WHERE id = ?");
  stmt.run(id);

  return { success: true };
}

export function isPinTaken(pin: string, excludeId?: number): boolean {
  if (excludeId) {
    const stmt = db.prepare("SELECT 1 FROM players WHERE pin = ? AND id != ?");
    return stmt.get(pin, excludeId) !== undefined;
  }
  const stmt = db.prepare("SELECT 1 FROM players WHERE pin = ?");
  return stmt.get(pin) !== undefined;
}

// ============ Assignment Logic ============

export function assignSecretSanta(playerId: number): {
  success: boolean;
  secretPlayer?: Player;
  error?: string;
} {
  const getPlayer = db.prepare("SELECT * FROM players WHERE id = ?");
  const getIncompatibleIds = db.prepare(
    "SELECT incompatible_with_id FROM incompatibilities WHERE player_id = ?"
  );
  const getAvailablePlayers = db.prepare(`
    SELECT * FROM players
    WHERE id NOT IN (
      SELECT secret_player_id FROM players WHERE secret_player_id IS NOT NULL
    )
    AND id != ?
  `);
  const updateAssignment = db.prepare(
    "UPDATE players SET secret_player_id = ? WHERE id = ?"
  );

  const result = db.transaction(() => {
    const player = getPlayer.get(playerId) as Player | undefined;
    if (!player) {
      return { success: false, error: "Player not found" };
    }

    // Already assigned?
    if (player.secret_player_id) {
      const secretPlayer = getPlayer.get(player.secret_player_id) as Player;
      return { success: true, secretPlayer };
    }

    // Get incompatible player IDs
    const incompatibleIds = new Set(
      (getIncompatibleIds.all(playerId) as { incompatible_with_id: number }[])
        .map((r) => r.incompatible_with_id)
    );

    // Get available players (not yet assigned to anyone)
    const availablePlayers = getAvailablePlayers.all(playerId) as Player[];

    // Filter out incompatible players
    const eligiblePlayers = availablePlayers.filter(
      (p) => !incompatibleIds.has(p.id)
    );

    if (eligiblePlayers.length === 0) {
      return {
        success: false,
        error: "No compatible players available for assignment",
      };
    }

    // Randomly pick one
    const randomIndex = Math.floor(Math.random() * eligiblePlayers.length);
    const secretPlayer = eligiblePlayers[randomIndex];

    // Assign
    updateAssignment.run(secretPlayer.id, playerId);

    return { success: true, secretPlayer };
  })();

  return result;
}

// ============ Admin Auth ============

export function verifyAdminPin(pin: string): boolean {
  const adminPin = process.env.ADMIN_PIN || "123456";
  return pin === adminPin;
}

export default db;
