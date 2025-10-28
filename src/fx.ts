// src/fx.ts – ES module version (use after switching to ESM)
import { engine, Transform, Billboard, GltfContainer } from "@dcl/sdk/ecs";
import { Vector3 } from "@dcl/sdk/math";

export function spawnFog(position: Vector3, scale: number = 1) {
  const e = engine.addEntity();
  Transform.create(e, {
    position,
    scale: Vector3.create(8 * scale, 1, 8 * scale),
  });
  GltfContainer.create(e, { src: "assets/models/fog_plane.gltf" });
  return e;
}

export function spawnGhostBillboard(position: Vector3, scale: number = 1) {
  const e = engine.addEntity();
  Transform.create(e, { position, scale: Vector3.create(scale, scale, 1) });
  GltfContainer.create(e, { src: "assets/models/ghost_plane.gltf" });
  Billboard.create(e);
  return e;
}
