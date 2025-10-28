// src/index.ts (SDK7, ESM, strict TS-safe)
import {
  engine,
  Transform,
  GltfContainer,
  pointerEventsSystem,
  MeshRenderer,
  TextShape,
  Billboard,
  Material,
  AudioSource,
  type Entity,
} from "@dcl/sdk/ecs";
import { Color4, Vector3 /*, Quaternion*/ } from "@dcl/sdk/math";
import { spawnFog, spawnGhostBillboard } from "./fx";

// ---------- helpers to satisfy exactOptionalPropertyTypes ----------
const v3 = (x: number, y: number, z: number) => ({ x, y, z } as Vector3);

// --- CONFIG ---
const SHARD_COUNT_GOAL = 9;
const PIXEL_TICK_MS = 20000;

// --- STATE ---
let heldShards = 0;
let pixelLevel = 0;
let beaconCharge = 0;
let gameWon = false;

// --- AUDIO CLIPS (using audioClipUrl) ---
const SFX_PICKUP_URL = "assets/audio/ding.ogg";
const SFX_CHARGE_URL = "assets/audio/charge.ogg";
const TANGO_LOOP_URL = "assets/audio/cursed_tango_loop.ogg";

// --- Ambient tango (loop) ---
const tangoEntity = engine.addEntity();
AudioSource.createOrReplace(tangoEntity, {
  audioClipUrl: TANGO_LOOP_URL,
  loop: true,
  playing: true,
});

// --- HUD (text + billboard) ---
const hud = engine.addEntity();
Transform.create(hud, { position: v3(8, 12, 8) });
Billboard.create(hud);
TextShape.create(hud, {
  text: `Shards: 0/${SHARD_COUNT_GOAL}\nCharge: 0%`,
  fontSize: 2,
});

// --- Pixel overlay: full-scene plane with alpha ---
const pixelOverlay = engine.addEntity();
Transform.create(pixelOverlay, {
  position: v3(8, 8, 8),
  scale: v3(16, 16, 1),
});
MeshRenderer.setPlane(pixelOverlay);
Material.setPbrMaterial(pixelOverlay, {
  albedoColor: Color4.create(0, 0, 0, 0),
});

function updateHUD() {
  TextShape.getMutable(
    hud
  ).text = `Shards: ${heldShards}/${SHARD_COUNT_GOAL}\nCharge: ${Math.floor(
    beaconCharge
  )}%`;
  const alpha = Math.min(0.75, pixelLevel * 0.15);
  Material.setPbrMaterial(pixelOverlay, {
    albedoColor: Color4.create(0, 0, 0, alpha),
  });
}

// --- Beacon zone (simple box as beacon stand) ---
const beacon = engine.addEntity();
Transform.create(beacon, {
  position: v3(8, 1, 8),
  scale: v3(1.2, 0.2, 1.2),
});
MeshRenderer.setBox(beacon);
Material.setPbrMaterial(beacon, {
  albedoColor: Color4.create(0.8, 0.8, 0.95, 1),
});

pointerEventsSystem.onPointerDown(
  {
    entity: beacon,
    opts: { hoverText: "Deposit shards" },
  },
  () => {
    if (gameWon) return;
    if (heldShards > 0) {
      AudioSource.createOrReplace(beacon, {
        audioClipUrl: SFX_CHARGE_URL,
        playing: true,
      });
      beaconCharge = Math.min(
        100,
        beaconCharge + heldShards * (100 / SHARD_COUNT_GOAL)
      );
      heldShards = 0;
      if (beaconCharge >= 100) winGame();
      updateHUD();
    }
  }
);

// --- Shards ---
type Shard = { entity: Entity; taken: boolean };
function makeShard(pos: Vector3): Shard {
  const e = engine.addEntity();
  Transform.create(e, { position: pos, scale: v3(0.7, 0.7, 0.7) });
  GltfContainer.create(e, { src: "assets/models/shard.gltf" });

  pointerEventsSystem.onPointerDown(
    {
      entity: e,
      opts: { hoverText: "Pick up shard" },
    },
    () => {
      if (gameWon) return;
      AudioSource.createOrReplace(e, {
        audioClipUrl: SFX_PICKUP_URL,
        playing: true,
      });
      heldShards++;
      engine.removeEntity(e);
      updateHUD();
    }
  );
  return { entity: e, taken: false };
}

const shardPositions: Vector3[] = [
  v3(3, 1, 5),
  v3(6, 1, 4),
  v3(10, 1, 6), // airport
  v3(5, 1, 10),
  v3(8, 1, 11),
  v3(12, 1, 9), // recoleta
  v3(4, 1, 14),
  v3(8, 1, 15),
  v3(12, 1, 14), // dome
];
shardPositions.forEach((p) => makeShard(p));

// --- Simple puzzle plates (Recoleta): step A -> B -> C ---
const platePositions = [v3(6, 0, 10), v3(8, 0, 10), v3(10, 0, 10)];
const plates: Entity[] = [];
let plateIndex = 0;

for (let i = 0; i < platePositions.length; i++) {
  const p = platePositions[i]!; // <- non-null assertion
  const e = engine.addEntity();
  plates.push(e);
  Transform.create(e, { position: p, scale: v3(1, 0.1, 1) });
  MeshRenderer.setBox(e);
  Material.setPbrMaterial(e, {
    albedoColor: i === 0 ? Color4.Green() : Color4.Gray(),
  });

  pointerEventsSystem.onPointerDown(
    {
      entity: e,
      opts: { hoverText: "Step here" },
    },
    () => {
      if (i === plateIndex) {
        plateIndex++;
        Material.setPbrMaterial(e, { albedoColor: Color4.Green() });
        if (plateIndex === platePositions.length) {
          // reward: spawn 2 extra shards near beacon
          makeShard(v3(7.5, 1, 8));
          makeShard(v3(8.5, 1, 8));
        } else {
          // non-null assertion: we know plateIndex is 0..length-1 here
          Material.setPbrMaterial(plates[plateIndex]!, {
            albedoColor: Color4.Green(),
          });
        }
      } else {
        plateIndex = 0;
        plates.forEach((ent, j) =>
          Material.setPbrMaterial(ent, {
            albedoColor: j === 0 ? Color4.Green() : Color4.Gray(),
          })
        );
      }
    }
  );
}

// --- Pixelation timer ---
setInterval(() => {
  if (gameWon) return;
  pixelLevel++;
  if (pixelLevel >= 5) {
    heldShards = 0;
    pixelLevel = 0;
  }
  updateHUD();
}, PIXEL_TICK_MS);

// --- Win: open portal and "teleport" ---
function winGame() {
  gameWon = true;
  const portal = engine.addEntity();
  Transform.create(portal, { position: v3(8, 1, 4), scale: v3(2, 2, 2) });
  GltfContainer.create(portal, { src: "assets/models/portal_devconnect.gltf" });

  pointerEventsSystem.onPointerDown(
    {
      entity: portal,
      opts: { hoverText: "Enter Devconnect Portal" },
    },
    () => {
      // move HUD target farther (simulating reaching BA side)
      const t = Transform.getMutable(hud);
      t.position = v3(8, 12, 15);
    }
  );

  updateHUD();
}

// --- Static decor (you have these assets) ---
function placeGLB(src: string, pos: Vector3, scale: Vector3 = v3(1, 1, 1)) {
  const e = engine.addEntity();
  Transform.create(e, { position: pos, scale });
  GltfContainer.create(e, { src });
  return e;
}
placeGLB("assets/models/airport_base.gltf", v3(8, 0, 4));
placeGLB("assets/models/recoleta_wall.gltf", v3(8, 0, 10));
placeGLB("assets/models/chandelier.gltf", v3(8, 2.4, 10));
placeGLB("assets/models/dome_shell.gltf", v3(8, 0, 14));

// --- Atmosphere (fog + ghosts) ---
spawnFog(v3(8, 0.12, 8), 1);
spawnFog(v3(8, 0.12, 4), 1);
spawnFog(v3(8, 0.12, 10), 1);

const ghost1 = spawnGhostBillboard(v3(6.5, 1.4, 9.5), 1.6);
const ghost2 = spawnGhostBillboard(v3(10.5, 1.3, 5.2), 1.2);

// Texture the ghosts
Material.setPbrMaterial(ghost1, {
  texture: { src: "assets/ui/ghost_sprite.png" } as any,
  albedoColor: Color4.create(1, 1, 1, 0.95),
} as any);

Material.setPbrMaterial(ghost2, {
  texture: { src: "assets/ui/ghost_sprite.png" } as any,
  albedoColor: Color4.create(1, 1, 1, 0.85),
} as any);
