import { createClient } from "@libsql/client";
import type {
  Player,
  PlayerWithSecret,
  AdminPlayerView,
} from "./types";

// Create database client
// For Turso: use TURSO_DATABASE_URL and TURSO_AUTH_TOKEN
// For local: use file:./data/local.db
const db = createClient({
  url: process.env.TURSO_DATABASE_URL || "file:./data/local.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Initialize schema
async function initSchema() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      pin TEXT NOT NULL UNIQUE,
      secret_player_id INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (secret_player_id) REFERENCES players(id)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS incompatibilities (
      player_id INTEGER NOT NULL,
      incompatible_with_id INTEGER NOT NULL,
      PRIMARY KEY (player_id, incompatible_with_id),
      FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
      FOREIGN KEY (incompatible_with_id) REFERENCES players(id) ON DELETE CASCADE
    )
  `);
}

// Initialize on first import
const schemaInitialized = initSchema();

// ============ Player Queries ============

export async function getPlayerByPin(pin: string): Promise<PlayerWithSecret | null> {
  await schemaInitialized;
  const result = await db.execute({
    sql: `
      SELECT
        p.*,
        sp.name as secret_player_name
      FROM players p
      LEFT JOIN players sp ON p.secret_player_id = sp.id
      WHERE p.pin = ?
    `,
    args: [pin],
  });

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    id: row.id as number,
    name: row.name as string,
    pin: row.pin as string,
    secret_player_id: row.secret_player_id as number | null,
    created_at: row.created_at as string,
    secret_player_name: row.secret_player_name as string | null,
  };
}

export async function getPlayerById(id: number): Promise<Player | null> {
  await schemaInitialized;
  const result = await db.execute({
    sql: "SELECT * FROM players WHERE id = ?",
    args: [id],
  });

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    id: row.id as number,
    name: row.name as string,
    pin: row.pin as string,
    secret_player_id: row.secret_player_id as number | null,
    created_at: row.created_at as string,
  };
}

export async function getAllPlayers(): Promise<Player[]> {
  await schemaInitialized;
  const result = await db.execute("SELECT * FROM players ORDER BY name");

  return result.rows.map((row) => ({
    id: row.id as number,
    name: row.name as string,
    pin: row.pin as string,
    secret_player_id: row.secret_player_id as number | null,
    created_at: row.created_at as string,
  }));
}

export async function getPlayersForAdmin(): Promise<AdminPlayerView[]> {
  await schemaInitialized;
  const playersResult = await db.execute(`
    SELECT
      p.id,
      p.name,
      p.pin,
      CASE WHEN p.secret_player_id IS NOT NULL THEN 1 ELSE 0 END as has_assignment,
      sp.name as secret_player_name
    FROM players p
    LEFT JOIN players sp ON p.secret_player_id = sp.id
    ORDER BY p.name
  `);

  const players: AdminPlayerView[] = [];

  for (const row of playersResult.rows) {
    const playerId = row.id as number;

    // Get incompatibilities for this player
    const incompatResult = await db.execute({
      sql: `
        SELECT p.id, p.name
        FROM incompatibilities i
        JOIN players p ON i.incompatible_with_id = p.id
        WHERE i.player_id = ?
      `,
      args: [playerId],
    });

    players.push({
      id: playerId,
      name: row.name as string,
      pin: row.pin as string,
      has_assignment: (row.has_assignment as number) === 1,
      secret_player_name: row.secret_player_name as string | null,
      incompatible_ids: incompatResult.rows.map((r) => r.id as number),
      incompatible_names: incompatResult.rows.map((r) => r.name as string),
    });
  }

  return players;
}

export async function createPlayer(
  name: string,
  pin: string,
  incompatibleIds: number[]
): Promise<Player> {
  await schemaInitialized;

  const insertResult = await db.execute({
    sql: "INSERT INTO players (name, pin) VALUES (?, ?)",
    args: [name, pin],
  });

  const playerId = Number(insertResult.lastInsertRowid);

  // Insert bidirectional incompatibilities
  for (const incompatId of incompatibleIds) {
    await db.execute({
      sql: "INSERT INTO incompatibilities (player_id, incompatible_with_id) VALUES (?, ?)",
      args: [playerId, incompatId],
    });
    await db.execute({
      sql: "INSERT INTO incompatibilities (player_id, incompatible_with_id) VALUES (?, ?)",
      args: [incompatId, playerId],
    });
  }

  return (await getPlayerById(playerId))!;
}

export async function updatePlayer(
  playerId: number,
  data: { name?: string; pin?: string }
): Promise<{ success: boolean; error?: string }> {
  await schemaInitialized;

  if (data.pin && await isPinTaken(data.pin, playerId)) {
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
  await db.execute({
    sql: `UPDATE players SET ${updates.join(", ")} WHERE id = ?`,
    args: values,
  });

  return { success: true };
}

export async function updatePlayerIncompatibilities(
  playerId: number,
  incompatibleIds: number[]
): Promise<{ success: boolean; error?: string }> {
  await schemaInitialized;

  // Remove all existing incompatibilities for this player
  await db.execute({
    sql: "DELETE FROM incompatibilities WHERE player_id = ? OR incompatible_with_id = ?",
    args: [playerId, playerId],
  });

  // Insert new bidirectional incompatibilities
  for (const incompatId of incompatibleIds) {
    await db.execute({
      sql: "INSERT OR IGNORE INTO incompatibilities (player_id, incompatible_with_id) VALUES (?, ?)",
      args: [playerId, incompatId],
    });
    await db.execute({
      sql: "INSERT OR IGNORE INTO incompatibilities (player_id, incompatible_with_id) VALUES (?, ?)",
      args: [incompatId, playerId],
    });
  }

  return { success: true };
}

export async function getPlayerIncompatibleIds(playerId: number): Promise<number[]> {
  await schemaInitialized;
  const result = await db.execute({
    sql: "SELECT incompatible_with_id FROM incompatibilities WHERE player_id = ?",
    args: [playerId],
  });
  return result.rows.map((r) => r.incompatible_with_id as number);
}

export async function deletePlayer(id: number): Promise<{ success: boolean; error?: string }> {
  await schemaInitialized;

  // Check if this player is assigned as someone's secret
  const assignedTo = await db.execute({
    sql: "SELECT name FROM players WHERE secret_player_id = ?",
    args: [id],
  });

  if (assignedTo.rows.length > 0) {
    return {
      success: false,
      error: `Cannot delete: this player is assigned as ${assignedTo.rows[0].name}'s secret santa`,
    };
  }

  // Delete incompatibilities first
  await db.execute({
    sql: "DELETE FROM incompatibilities WHERE player_id = ? OR incompatible_with_id = ?",
    args: [id, id],
  });

  // Delete player
  await db.execute({
    sql: "DELETE FROM players WHERE id = ?",
    args: [id],
  });

  return { success: true };
}

export async function isPinTaken(pin: string, excludeId?: number): Promise<boolean> {
  await schemaInitialized;

  if (excludeId) {
    const result = await db.execute({
      sql: "SELECT 1 FROM players WHERE pin = ? AND id != ?",
      args: [pin, excludeId],
    });
    return result.rows.length > 0;
  }

  const result = await db.execute({
    sql: "SELECT 1 FROM players WHERE pin = ?",
    args: [pin],
  });
  return result.rows.length > 0;
}

// ============ Assignment Logic ============

export async function assignSecretSanta(playerId: number): Promise<{
  success: boolean;
  secretPlayer?: Player;
  error?: string;
}> {
  await schemaInitialized;

  const player = await getPlayerById(playerId);
  if (!player) {
    return { success: false, error: "Player not found" };
  }

  // Already assigned?
  if (player.secret_player_id) {
    const secretPlayer = await getPlayerById(player.secret_player_id);
    return { success: true, secretPlayer: secretPlayer! };
  }

  // Get incompatible player IDs
  const incompatibleIds = new Set(await getPlayerIncompatibleIds(playerId));

  // Get available players (not yet assigned to anyone)
  const availableResult = await db.execute({
    sql: `
      SELECT * FROM players
      WHERE id NOT IN (
        SELECT secret_player_id FROM players WHERE secret_player_id IS NOT NULL
      )
      AND id != ?
    `,
    args: [playerId],
  });

  const availablePlayers = availableResult.rows.map((row) => ({
    id: row.id as number,
    name: row.name as string,
    pin: row.pin as string,
    secret_player_id: row.secret_player_id as number | null,
    created_at: row.created_at as string,
  }));

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
  await db.execute({
    sql: "UPDATE players SET secret_player_id = ? WHERE id = ?",
    args: [secretPlayer.id, playerId],
  });

  return { success: true, secretPlayer };
}

// ============ Admin Auth ============

export function verifyAdminPin(pin: string): boolean {
  const adminPin = process.env.ADMIN_PIN || "123456";
  return pin === adminPin;
}

export default db;
