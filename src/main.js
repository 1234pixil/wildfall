import * as THREE from 'three';

// Scene setup
const canvas = document.getElementById('gameCanvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// Camera
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 5, 15);
camera.lookAt(0, 0, 0);

// Lighting
const ambient = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambient);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(5, 10, 7.5);
scene.add(dirLight);

// Player spaceship
const shipGeometry = new THREE.BoxGeometry(1, 0.5, 2);
const shipMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
const ship = new THREE.Mesh(shipGeometry, shipMaterial);
ship.position.y = 1;
scene.add(ship);

// Groups for bullets and asteroids
const bullets = [];
const asteroids = [];

// Controls
const keys = { ArrowLeft: false, ArrowRight: false, Space: false };
document.addEventListener('keydown', e => { if (e.code in keys) keys[e.code] = true; });
document.addEventListener('keyup', e => { if (e.code in keys) keys[e.code] = false; });

// Helper: create asteroid
function spawnAsteroid() {
  const size = Math.random() * 0.5 + 0.3;
  const geometry = new THREE.SphereGeometry(size, 12, 12);
  const material = new THREE.MeshStandardMaterial({ color: 0x888888 });
  const asteroid = new THREE.Mesh(geometry, material);
  asteroid.position.set(
    (Math.random() - 0.5) * 10,
    10 + Math.random() * 5,
    0
  );
  asteroid.userData = { velocity: new THREE.Vector3(0, -0.05 - Math.random() * 0.05, 0) };
  scene.add(asteroid);
  asteroids.push(asteroid);
}

// Helper: create bullet
function fireBullet() {
  const geometry = new THREE.SphereGeometry(0.1, 8, 8);
  const material = new THREE.MeshStandardMaterial({ color: 0xffff00 });
  const bullet = new THREE.Mesh(geometry, material);
  bullet.position.copy(ship.position);
  bullet.position.y += 0.5;
  bullet.userData = { velocity: new THREE.Vector3(0, 0, -0.2) };
  scene.add(bullet);
  bullets.push(bullet);
}

// Game loop
let lastTime = 0;
function animate(time) {
  const delta = (time - lastTime) / 1000;
  lastTime = time;

  // Ship movement
  if (keys.ArrowLeft) ship.position.x -= 5 * delta;
  if (keys.ArrowRight) ship.position.x += 5 * delta;
  ship.position.x = THREE.MathUtils.clamp(ship.position.x, -7, 7);

  // Fire bullets
  if (keys.Space) {
    fireBullet();
    keys.Space = false; // single shot per key press
  }

  // Update bullets
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.position.add(b.userData.velocity);
    if (b.position.z < -20) {
      scene.remove(b);
      bullets.splice(i, 1);
      continue;
    }
    // Collision with asteroids
    for (let j = asteroids.length - 1; j >= 0; j--) {
      const a = asteroids[j];
      if (b.position.distanceTo(a.position) < 0.5) {
        scene.remove(a);
        asteroids.splice(j, 1);
        scene.remove(b);
        bullets.splice(i, 1);
        break;
      }
    }
  }

  // Update asteroids
  for (let i = asteroids.length - 1; i >= 0; i--) {
    const a = asteroids[i];
    a.position.add(a.userData.velocity);
    if (a.position.y < -5) {
      scene.remove(a);
      asteroids.splice(i, 1);
    }
  }

  // Spawn new asteroids periodically
  if (Math.random() < 0.02) spawnAsteroid();

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

// Handle resize
window.addEventListener('resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
});
