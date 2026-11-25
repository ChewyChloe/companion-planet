import { it, expect } from "vitest";
import { Mesh, MeshBasicMaterial, PlaneGeometry, Vector3 } from "three";
import { registerWorldCollision, contactFloor, resolveBodyContact } from "../src/art/world-collision";
it("uses actual triangles to recover feet below a support plane", () => {
  const plane=new Mesh(new PlaneGeometry(10,10).rotateX(-Math.PI/2),new MeshBasicMaterial());
  registerWorldCollision("test-floor",plane);
  expect(contactFloor("test-floor",new Vector3(0,-.05,0))).toBeCloseTo(0);
  expect(contactFloor("test-floor",new Vector3(0,1,0))).toBeNull();
  const root=new Vector3(0,-.12,0);
  resolveBodyContact("test-floor",root);
  expect(root.y).toBeGreaterThanOrEqual(0);
  plane.geometry.dispose();plane.material.dispose();
});
