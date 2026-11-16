import * as THREE from "three";

import { OrbitControls } from "../vendor/OrbitControls.js";

export function createScene(canvas) {
  const scene = new THREE.Scene;
  scene.sortObjects = true;
  scene.background = new THREE.Color("#0b1b2c");
  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true
  });
  renderer.sortObjects = true;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  const camera = new THREE.PerspectiveCamera(40, 1, .1, 50);
  camera.position.set(4, 3.5, 6);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 1.35, 0);
  controls.enableDamping = true;
  controls.minDistance = 4;
  controls.maxDistance = 11;
  controls.maxPolarAngle = Math.PI * .49;
  controls.enablePan = false;
  scene.add(new THREE.HemisphereLight(14152703, 2306629, 2.5));
  const light = new THREE.DirectionalLight(16777215, 3.5);
  light.position.set(4, 7, 5);
  scene.add(light);
  const fill = new THREE.PointLight(4577791, 20, 15);
  fill.position.set(-3, 4, -2);
  scene.add(fill);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(2.6, 64), new THREE.MeshStandardMaterial({
    color: 2111820,
    roughness: .8
  }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -.02;
  scene.add(floor);
  const transparent = {
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide
  };
  const glassMaterial = new THREE.MeshPhysicalMaterial({
    ...transparent,
    color: 11988215,
    opacity: .14,
    roughness: .2,
    metalness: 0
  });
  const profile = [ [ 0, .04 ], [ .9, .04 ], [ 1.12, .12 ], [ 1.2, .3 ], [ 1.17, .7 ], [ 1.05, 1.03 ], [ .75, 1.45 ], [ .4, 1.8 ], [ .36, 1.95 ], [ .36, 2.65 ] ].map(([r, y]) => new THREE.Vector2(r, y));
  const glass = new THREE.Mesh(new THREE.LatheGeometry(profile, 64), glassMaterial);
  glass.renderOrder = 30;
  scene.add(glass);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(.36, .027, 10, 64), new THREE.MeshStandardMaterial({
    ...transparent,
    color: 11988215,
    opacity: .65,
    roughness: .25
  }));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 2.65;
  rim.renderOrder = 31;
  scene.add(rim);
  const liquidMaterial = new THREE.MeshPhysicalMaterial({
    ...transparent,
    color: 2861770,
    opacity: .22,
    roughness: .28
  });
  const liquid = new THREE.Mesh(new THREE.CylinderGeometry(1.07, 1.09, .65, 64, 1, true), liquidMaterial);
  liquid.position.y = .475;
  liquid.renderOrder = 20;
  scene.add(liquid);
  const waterY = .8;
  const surface = new THREE.Mesh(new THREE.CircleGeometry(1.07, 64), new THREE.MeshBasicMaterial({
    ...transparent,
    color: 6872557,
    opacity: .18
  }));
  surface.rotation.x = -Math.PI / 2;
  surface.position.y = waterY;
  surface.renderOrder = 21;
  scene.add(surface);
  const rockMaterial = new THREE.MeshStandardMaterial({
    color: 14866622,
    roughness: .95
  });
  let rocks = [], bubbles = [], ripples = [], accumulator = 0;
  let width = 0, height = 0;
  function remove(mesh) {
    scene.remove(mesh);
    mesh.geometry.dispose();
    if (mesh.material !== rockMaterial) mesh.material.dispose();
  }
  function clearParticles() {
    for (const mesh of [ ...bubbles, ...ripples ]) remove(mesh);
    bubbles = [];
    ripples = [];
    accumulator = 0;
  }
  function reset(p) {
    clearParticles();
    rocks.forEach(remove);
    rocks = [];
    const count = p.diameter >= 5 ? 5 : p.diameter >= 2 ? 12 : p.diameter >= 1 ? 22 : 45;
    const radius = Math.cbrt(p.mass / 2 / count) * .52;
    for (let i = 0; i < count; i++) {
      const geometry = new THREE.IcosahedronGeometry(radius, 1);
      const pos = geometry.attributes.position;
      for (let j = 0; j < pos.count; j++) {
        const x = pos.getX(j), y = pos.getY(j), z = pos.getZ(j);
        const factor = 1 + .12 * Math.sin(x * 47 + y * 31 + z * 23);
        pos.setXYZ(j, x * factor, y * factor, z * factor);
      }
      geometry.computeVertexNormals();
      const rock = new THREE.Mesh(geometry, rockMaterial);
      const angle = i * 2.39996, distance = Math.sqrt((i + .5) / count) * .78;
      rock.position.set(Math.cos(angle) * distance, .15 + radius, Math.sin(angle) * distance);
      rock.userData.radius = radius;
      rock.renderOrder = 10;
      scene.add(rock);
      rocks.push(rock);
    }
  }
  function sync(fraction) {
    const scale = Math.cbrt(Math.max(0, fraction));
    for (const rock of rocks) {
      rock.scale.setScalar(scale);
      rock.position.y = .15 + rock.userData.radius * scale;
      rock.visible = fraction > 0;
    }
  }
  function emit(delta) {
    accumulator += delta * 18e3;
    const count = Math.floor(accumulator);
    accumulator -= count;
    for (let i = 0; i < Math.min(count, 160 - bubbles.length); i++) {
      const rock = rocks[Math.floor(Math.random() * rocks.length)];
      if (!rock || !rock.visible) continue;
      const bubble = new THREE.Mesh(new THREE.SphereGeometry(.025 + Math.random() * .02, 10, 8), new THREE.MeshPhysicalMaterial({
        ...transparent,
        color: 14482175,
        opacity: .65,
        roughness: .1
      }));
      bubble.position.copy(rock.position);
      bubble.position.y = Math.min(waterY - .03, bubble.position.y + rock.userData.radius * rock.scale.x);
      bubble.userData.speed = .3 + Math.random() * .4;
      bubble.renderOrder = 40;
      scene.add(bubble);
      bubbles.push(bubble);
    }
  }
  function ripple(x, z) {
    if (ripples.length >= 160) return;
    const mesh = new THREE.Mesh(new THREE.RingGeometry(.025, .037, 24), new THREE.MeshBasicMaterial({
      ...transparent,
      color: 12843263,
      opacity: .55
    }));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, waterY + .005, z);
    mesh.userData.age = 0;
    mesh.renderOrder = 50;
    scene.add(mesh);
    ripples.push(mesh);
  }
  function tick(dt) {
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const mesh = bubbles[i];
      mesh.position.y += mesh.userData.speed * dt;
      if (mesh.position.y >= waterY) {
        ripple(mesh.position.x, mesh.position.z);
        remove(mesh);
        bubbles.splice(i, 1);
      }
    }
    for (let i = ripples.length - 1; i >= 0; i--) {
      const mesh = ripples[i];
      mesh.userData.age += dt;
      mesh.scale.setScalar(1 + mesh.userData.age * 4);
      mesh.material.opacity = Math.max(0, .55 * (1 - mesh.userData.age / .7));
      if (mesh.userData.age >= .7) {
        remove(mesh);
        ripples.splice(i, 1);
      }
    }
  }
  function resize() {
    const w = Math.round(canvas.clientWidth), h = Math.round(canvas.clientHeight);
    if (!w || !h || w === width && h === height) return;
    width = w;
    height = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  function render() {
    resize();
    controls.update();
    renderer.render(scene, camera);
  }
  function dispose() {
    observer.disconnect();
    controls.dispose();
    const geometries = new Set, materials = new Set;
    scene.traverse(obj => {
      if (obj.geometry) geometries.add(obj.geometry);
      if (obj.material) materials.add(obj.material);
    });
    geometries.forEach(g => g.dispose());
    materials.forEach(m => m.dispose());
    rockMaterial.dispose();
    scene.clear();
    renderer.dispose();
  }
  return {
    reset: reset,
    sync: sync,
    emit: emit,
    tick: tick,
    render: render,
    dispose: dispose,
    scene: scene,
    camera: camera,
    renderer: renderer,
    controls: controls,
    get counts() {
      return {
        rocks: rocks.length,
        bubbles: bubbles.length,
        ripples: ripples.length
      };
    }
  };
}
