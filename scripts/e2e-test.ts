/**
 * E2E Test Script for Secret Santa
 *
 * This script:
 * 1. Creates ~30 players with random PINs
 * 2. Adds 1-3 incompatibilities per person
 * 3. Simulates each player getting their assignment
 * 4. Validates all assignments
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const ADMIN_PIN = process.env.ADMIN_PIN || "123456";

// Portuguese names for testing
const NAMES = [
  "João", "Maria", "Pedro", "Ana", "Miguel", "Sofia", "André", "Beatriz",
  "Carlos", "Diana", "Eduardo", "Francisca", "Gonçalo", "Helena", "Inês",
  "Jorge", "Laura", "Manuel", "Nuno", "Patrícia", "Ricardo", "Sara",
  "Tiago", "Vera", "Xavier", "Zélia", "António", "Carla", "Diogo", "Eva"
];

interface Player {
  id: number;
  name: string;
  pin: string;
  incompatible_ids: number[];
}

function generatePin(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

async function clearAllPlayers(): Promise<void> {
  console.log("🧹 Clearing existing players...");

  const res = await fetch(`${BASE_URL}/api/admin/players`, {
    headers: { "x-admin-pin": ADMIN_PIN },
  });

  if (!res.ok) {
    console.log("   No existing players or failed to fetch");
    return;
  }

  const players = await res.json();

  for (const player of players) {
    await fetch(`${BASE_URL}/api/admin/players/${player.id}`, {
      method: "DELETE",
      headers: { "x-admin-pin": ADMIN_PIN },
    });
  }

  console.log(`   Deleted ${players.length} players`);
}

async function createPlayers(): Promise<Player[]> {
  console.log("\n👥 Creating 30 players...");
  const players: Player[] = [];
  const usedPins = new Set<string>();

  for (const name of NAMES) {
    let pin = generatePin();
    while (usedPins.has(pin)) {
      pin = generatePin();
    }
    usedPins.add(pin);

    const res = await fetch(`${BASE_URL}/api/admin/players`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-pin": ADMIN_PIN,
      },
      body: JSON.stringify({ name, pin, incompatibleIds: [] }),
    });

    if (!res.ok) {
      const error = await res.json();
      console.error(`   ❌ Failed to create ${name}: ${error.error}`);
      continue;
    }

    const player = await res.json();
    players.push({ ...player, incompatible_ids: [] });
    process.stdout.write(`   ✓ Created ${name} (PIN: ${pin})\n`);
  }

  console.log(`   Total: ${players.length} players created`);
  return players;
}

async function addIncompatibilities(players: Player[]): Promise<void> {
  console.log("\n🚫 Adding incompatibilities (1-3 per person)...");

  for (const player of players) {
    // Randomly select 1-3 incompatible players
    const numIncompat = 1 + Math.floor(Math.random() * 3);
    const otherPlayers = players.filter(p => p.id !== player.id);
    const shuffled = otherPlayers.sort(() => Math.random() - 0.5);
    const incompatibleIds = shuffled.slice(0, numIncompat).map(p => p.id);

    const res = await fetch(`${BASE_URL}/api/admin/players/${player.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-admin-pin": ADMIN_PIN,
      },
      body: JSON.stringify({ incompatibleIds }),
    });

    if (!res.ok) {
      console.error(`   ❌ Failed to add incompatibilities for ${player.name}`);
      continue;
    }

    player.incompatible_ids = incompatibleIds;
    const incompatNames = incompatibleIds.map(id =>
      players.find(p => p.id === id)?.name
    ).join(", ");
    console.log(`   ${player.name} → cannot get: ${incompatNames}`);
  }
}

async function simulateAssignments(players: Player[]): Promise<Map<number, number>> {
  console.log("\n🎁 Simulating player assignments...");
  const assignments = new Map<number, number>();

  for (const player of players) {
    // First login
    const loginRes = await fetch(`${BASE_URL}/api/player/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: player.pin }),
    });

    if (!loginRes.ok) {
      console.error(`   ❌ ${player.name} failed to login`);
      continue;
    }

    const loginData = await loginRes.json();

    if (loginData.hasAssignment) {
      console.log(`   ${player.name} already has: ${loginData.secretPlayerName}`);
      const secretPlayer = players.find(p => p.name === loginData.secretPlayerName);
      if (secretPlayer) {
        assignments.set(player.id, secretPlayer.id);
      }
      continue;
    }

    // Get assignment
    const assignRes = await fetch(`${BASE_URL}/api/player/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: player.pin }),
    });

    if (!assignRes.ok) {
      const error = await assignRes.json();
      console.error(`   ❌ ${player.name} failed to get assignment: ${error.error}`);
      continue;
    }

    const assignData = await assignRes.json();
    const secretPlayer = players.find(p => p.name === assignData.secretPlayerName);

    if (secretPlayer) {
      assignments.set(player.id, secretPlayer.id);
      console.log(`   ✓ ${player.name} → ${assignData.secretPlayerName}`);
    }
  }

  return assignments;
}

function validateAssignments(players: Player[], assignments: Map<number, number>): void {
  console.log("\n✅ Validating assignments...");
  let errors = 0;

  // Check everyone got assigned
  for (const player of players) {
    if (!assignments.has(player.id)) {
      console.error(`   ❌ ${player.name} has no assignment!`);
      errors++;
    }
  }

  // Check no one got themselves
  for (const [giverId, receiverId] of assignments) {
    if (giverId === receiverId) {
      const player = players.find(p => p.id === giverId);
      console.error(`   ❌ ${player?.name} got themselves!`);
      errors++;
    }
  }

  // Check no duplicates (each person is only one person's secret santa)
  const receiverCounts = new Map<number, number>();
  for (const receiverId of assignments.values()) {
    receiverCounts.set(receiverId, (receiverCounts.get(receiverId) || 0) + 1);
  }

  for (const [receiverId, count] of receiverCounts) {
    if (count > 1) {
      const player = players.find(p => p.id === receiverId);
      console.error(`   ❌ ${player?.name} is assigned to ${count} people!`);
      errors++;
    }
  }

  // Check incompatibilities respected
  for (const player of players) {
    const assignedTo = assignments.get(player.id);
    if (assignedTo && player.incompatible_ids.includes(assignedTo)) {
      const secretPlayer = players.find(p => p.id === assignedTo);
      console.error(`   ❌ ${player.name} got incompatible ${secretPlayer?.name}!`);
      errors++;
    }
  }

  if (errors === 0) {
    console.log("   🎉 All validations passed!");
  } else {
    console.log(`   ⚠️  Found ${errors} errors`);
  }
}

async function printSummary(): Promise<void> {
  console.log("\n📊 Final state from admin view...");

  const res = await fetch(`${BASE_URL}/api/admin/players`, {
    headers: { "x-admin-pin": ADMIN_PIN },
  });

  if (!res.ok) {
    console.error("   Failed to fetch players");
    return;
  }

  const players = await res.json();
  const assigned = players.filter((p: { has_assignment: boolean }) => p.has_assignment).length;

  console.log(`   Total players: ${players.length}`);
  console.log(`   Assigned: ${assigned}`);
  console.log(`   Pending: ${players.length - assigned}`);
}

async function main() {
  console.log("🎄 Secret Santa E2E Test\n");
  console.log(`   Base URL: ${BASE_URL}`);
  console.log(`   Admin PIN: ${ADMIN_PIN}`);

  try {
    await clearAllPlayers();
    const players = await createPlayers();

    if (players.length < 30) {
      console.error("\n❌ Not enough players created. Aborting.");
      process.exit(1);
    }

    await addIncompatibilities(players);
    const assignments = await simulateAssignments(players);
    validateAssignments(players, assignments);
    await printSummary();

    console.log("\n🎅 Test complete!\n");
  } catch (error) {
    console.error("\n❌ Test failed with error:", error);
    process.exit(1);
  }
}

main();
