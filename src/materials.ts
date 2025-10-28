// src/materials.ts – tiny helpers for emissive & transparent PBR (SDK7, ESM-safe)
import { Material, type Entity } from "@dcl/sdk/ecs";
import { Color4 } from "@dcl/sdk/math";

export function setEmissive(entity: Entity, color: Color4) {
  Material.setPbrMaterial(entity, {
    albedoColor: Color4.White(),
    emissiveColor: color,
    emissiveIntensity: 1,
  });
}

export function setTransparentTextured(
  entity: Entity,
  src: string,
  alpha: number = 1
) {
  Material.setPbrMaterial(entity, {
    // SDK7 accepts a texture with a src. We cast to any to be compatible with minor SDK typing changes.
    texture: { src } as any,
    albedoColor: Color4.create(1, 1, 1, alpha),
    alphaTest: 0,
  } as any);
}

export function setFog(entity: Entity, alpha: number = 0.18) {
  Material.setPbrMaterial(entity, {
    albedoColor: Color4.create(0.95, 0.95, 1, alpha),
  });
}
