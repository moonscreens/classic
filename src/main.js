import SimplexNoise from "simplex-noise";
import * as THREE from "three";
import TwitchChat from "twitch-chat-emotes-threejs";
import Stats from "stats.js";

const simplex = new SimplexNoise();

/*
** connect to twitch chat
*/

// a default array of twitch channels to join
let channels = ['moonmoon'];

// the following few lines of code will allow you to add ?channels=channel1,channel2,channel3 to the URL in order to override the default array of channels
const query_vars = {};
const query_parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function (m, key, value) {
	query_vars[key] = value;
});

if (query_vars.channels) {
	channels = query_vars.channels.split(',');
}

let stats = false;
if (query_vars.stats) {
	stats = new Stats();
	stats.showPanel(1);
	document.body.appendChild(stats.dom);
}

const ChatInstance = new TwitchChat({
	// If using planes, consider using MeshBasicMaterial instead of SpriteMaterial
	materialType: THREE.MeshBasicMaterial,

	// Passed to material options
	materialOptions: {
		side: THREE.DoubleSide,
		transparent: true,
	},

	channels,
	duplicateEmoteLimit: 1,
	maximumEmoteLimit: 3,
})

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.z = 10;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);
scene.fog = new THREE.Fog(0x111111, 10.01, 20);

const renderer = new THREE.WebGLRenderer({
	antialias: true,
	alpha: false
});
document.body.appendChild(renderer.domElement);

function resize() {
	renderer.setSize(window.innerWidth, window.innerHeight);
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
}
resize();
window.addEventListener('resize', resize);

const center = new THREE.Vector3(0, 0, 0);

let lastFrame = Date.now();
// Called once per frame
function draw() {
	if (stats) stats.begin();
	window.requestAnimationFrame(draw);

	// number of seconds since the last frame was drawn
	const delta = (Date.now() - lastFrame) / 1000;

	for (let i = emoteArray.length - 1; i >= 0; i--) {
		emoteArray[i].position.x += emoteArray[i].velocity.x * delta;
		emoteArray[i].position.y += emoteArray[i].velocity.y * delta;
		emoteArray[i].position.z += emoteArray[i].velocity.z * delta;

		emoteArray[i].rotation.x += emoteArray[i].rotationVelocity.x * delta;
		emoteArray[i].rotation.y += emoteArray[i].rotationVelocity.y * delta;
		emoteArray[i].rotation.z += emoteArray[i].rotationVelocity.z * delta;

		const p = (Date.now() - emoteArray[i].dateSpawned) / emoteArray[i].lifespan;
		if (p < 0.25) {
			emoteArray[i].scale.setScalar(Math.pow(easeInOutSine(p * 4), 4));
		} else if (p < 0.75) {
			emoteArray[i].scale.setScalar(1);
		} else {
			emoteArray[i].scale.setScalar(Math.pow(easeInOutSine(1 - ((p - 0.75) * 4)), 4));
		}

		if (p >= 1) {
			scene.remove(emoteArray[i]);
			emoteArray.splice(i, 1);
		}
	}

	renderer.render(scene, camera);

	lastFrame = Date.now();
	if (stats) stats.end();
}

function easeInOutSine(t) {
	return -0.5 * (Math.cos(Math.PI * t) - 1);
}


function random3DDirection(noiseScalar = 0.001) {
	const x = simplex.noise4D(1, 0, 0, Date.now() * noiseScalar);
	const y = simplex.noise4D(0, 1, 0, Date.now() * noiseScalar);
	const z = simplex.noise4D(0, 0, 1, Date.now() * noiseScalar);
	const vector = new THREE.Vector3(x, y, z);
	vector.normalize();
	return vector;
}

// add a callback function for when a new message with emotes is sent
const emoteSpawnDistance = 4;
const emoteArray = [];
const emoteGeometry = new THREE.PlaneBufferGeometry(1, 1, 1, 1);
const squishVector = new THREE.Vector3(1, 1, 4);

const spawnDistance = 10;
const spawns = [
	{
		position: new THREE.Vector3(-spawnDistance, 0, 0),
		velocity: new THREE.Vector3(0.9, 0.7, 0),
	},
	{
		position: new THREE.Vector3(spawnDistance*0.25, spawnDistance*0.5, 0),
		velocity: new THREE.Vector3(-0.9, -0.7, 0),
	},
]
ChatInstance.listen((emotes) => {
	const group = new THREE.Group();

	group.rotationVelocity = random3DDirection(0.0004).multiplyScalar(Math.random());
	
	const spawn = spawns[Math.floor(Math.random() * spawns.length)];
	group.position.copy(spawn.position);
	group.position.add(random3DDirection(0.0006).multiply(squishVector));
	group.velocity = new THREE.Vector3().copy(spawn.velocity).multiplyScalar(Math.random() * 0.5 + 0.5).add(random3DDirection(0.0006).multiply(squishVector).multiplyScalar(0.2));


	group.dateSpawned = Date.now();
	group.lifespan = 12000 + Math.random() * 10000;

	const innerGroup = new THREE.Group();
	group.add(innerGroup);
	innerGroup.scale.setScalar(0.5);

	for (let index = 0; index < emotes.length; index++) {
		const emote = emotes[index];
		const mesh = new THREE.Mesh(emoteGeometry, emote.material);
		mesh.position.x += index;
		mesh.position.x -= emotes.length / 2;
		innerGroup.add(mesh);
	}
	scene.add(group);
	emoteArray.push(group);
})

draw();


const video = document.createElement('video');
video.src = '/moon.mp4';
video.muted = true;
video.loop = true;
video.autoplay = true;
video.load();
video.play();

const videoTexture = new THREE.VideoTexture(video);
const videoMaterial = new THREE.MeshBasicMaterial({
	map: videoTexture,
	side: THREE.DoubleSide,
	blending: THREE.AdditiveBlending,
	transparent: true,
});
const videoGeometry = new THREE.PlaneBufferGeometry(1, 0.75, 1, 1);
const videoMesh = new THREE.Mesh(videoGeometry, videoMaterial);
videoMesh.scale.setScalar(8);
videoMesh.position.set(3.5, -1, 0);
scene.add(videoMesh);