import * as THREE from "three";

import Stats from "three/examples/jsm/libs/stats.module.js";

import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { BloomPass } from "three/examples/jsm/postprocessing/BloomPass.js";
import { FilmPass } from "three/examples/jsm/postprocessing/FilmPass.js";
import { FocusShader } from "three/examples/jsm/shaders/FocusShader.js";

let camera, scene, renderer, mesh, cylinder;

let parent;

const meshes = [];

let composer, effectFocus;

const clock = new THREE.Clock();

let stats;

window.onload = () => {
  init();
  animate();
}

function init() {
  const container = document.querySelector("#container");

  camera = new THREE.PerspectiveCamera(
    20,
    window.innerWidth / window.innerHeight,
    1,
    50000
  );
  camera.position.set(0, 700, 7000);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000104);
  scene.fog = new THREE.FogExp2(0x000104, 0.0000675);

  camera.lookAt(scene.position);

  cylinder = new THREE.CylinderGeometry(100, 100, 500, 16, 25);

  const cylpts = new THREE.BufferAttribute(
    cylinder.attributes["position"].array,
    3
  );

  parent = new THREE.Object3D();

  createMesh(cylpts, scene, 1, 0, 0, 0, 0xff44ff);

  renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.autoClear = false;
  container.appendChild(renderer.domElement);

  scene.add(parent);

  const grid = new THREE.Points(
    new THREE.PlaneGeometry(15000, 15000, 64, 64),
    new THREE.PointsMaterial({ color: 0xff0000, size: 10 })
  );
  grid.position.y = -400;
  grid.rotation.x = -Math.PI / 2;
  parent.add(grid);

  // postprocessing

  const renderModel = new RenderPass(scene, camera);
  const effectBloom = new BloomPass(0.95);
  const effectFilm = new FilmPass(0.5, 0.5, 1448, false);

  effectFocus = new ShaderPass(FocusShader);

  effectFocus.uniforms["screenWidth"].value =
    window.innerWidth * window.devicePixelRatio;
  effectFocus.uniforms["screenHeight"].value =
    window.innerHeight * window.devicePixelRatio;

  composer = new EffectComposer(renderer);

  composer.addPass(renderModel);
  composer.addPass( effectBloom );
  composer.addPass( effectFilm );
  composer.addPass( effectFocus );

  //stats
  stats = new Stats();
  container.appendChild(stats.dom);

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  camera.lookAt(scene.position);

  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);

  effectFocus.uniforms["screenWidth"].value =
    window.innerWidth * window.devicePixelRatio;
  effectFocus.uniforms["screenHeight"].value =
    window.innerHeight * window.devicePixelRatio;
}

function createMesh(positions, scene, scale, x, y, z, color) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", positions.clone());
  geometry.setAttribute("initialPosition", positions.clone());

  geometry.attributes.position.setUsage(THREE.DynamicDrawUsage);

  mesh = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({ size: 30, color: color })
  );
  mesh.scale.x = mesh.scale.y = mesh.scale.z = scale;

  mesh.position.x = x;
  mesh.position.y = y;
  mesh.position.z = z;

  parent.add(mesh);

  meshes.push({
    mesh: mesh,
    verticesDown: 0,
    verticesUp: 0,
    direction: 0,
    speed: 15,
    delay: Math.floor(200 + 200 * Math.random()),
    start: Math.floor(100 + 200 * Math.random()),
  });
}

function animate() {
  requestAnimationFrame(animate);
  render();
  stats.update();
}

function render() {
  let delta = 10 * clock.getDelta();

  delta = delta < 2 ? delta : 2;

  parent.rotation.y += -0.02 * delta;

  for (let j = 0; j < meshes.length; j++) {
    const data = meshes[j];
    const positions = data.mesh.geometry.attributes.position;
    const initialPositions = data.mesh.geometry.attributes.initialPosition;

    const count = positions.count;

    if (data.start > 0) {
      data.start -= 1;
    } else {
      if (data.direction === 0) {
        data.direction = -1;
      }
    }

    for (let i = 0; i < count; i++) {
      const px = positions.getX(i);
      const py = positions.getY(i);
      const pz = positions.getZ(i);

      // falling down
      if (data.direction < 0) {
        if (py > 0) {
          positions.setXYZ(
            i,
            px + 1.5 * (0.5 - Math.random()) * data.speed * delta,
            py + 3.0 * (0.25 - Math.random()) * data.speed * delta,
            pz + 1.5 * (0.5 - Math.random()) * data.speed * delta
          );
        } else {
          data.verticesDown += 1;
        }
      }

      // rising up
      if (data.direction > 0) {
        const ix = initialPositions.getX(i);
        const iy = initialPositions.getY(i);
        const iz = initialPositions.getZ(i);

        const dx = Math.abs(px - ix);
        const dy = Math.abs(py - iy);
        const dz = Math.abs(pz - iz);

        const d = dx + dy + dx;

        if (d > 1) {
          positions.setXYZ(
            i,
            px - ((px - ix) / dx) * data.speed * delta * (0.85 - Math.random()),
            py - ((py - iy) / dy) * data.speed * delta * (1 + Math.random()),
            pz - ((pz - iz) / dz) * data.speed * delta * (0.85 - Math.random())
          );
        } else {
          data.verticesUp += 1;
        }
      }
    }

    // all vertices down
    if (data.verticesDown >= count) {
      if (data.delay <= 0) {
        data.direction = 1;
        data.speed = 5;
        data.verticesDown = 0;
        data.delay = 320;
      } else {
        data.delay -= 1;
      }
    }

    // all vertices up
    if (data.verticesUp >= count) {
      if (data.delay <= 0) {
        data.direction = -1;
        data.speed = 15;
        data.verticesUp = 0;
        data.delay = 120;
      } else {
        data.delay -= 1;
      }
    }

    positions.needsUpdate = true;
  }

  composer.render(0.01);
}
