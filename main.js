const webcam = document.getElementById('webcam');
const mainVideo = document.getElementById('mainVideo');
const transitionEffect = document.getElementById('transitionEffect');
const canvas = document.getElementById('fireworksCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

let fireworks = [];
let animationId = null;
let animationRunning = false;

class Firework {
  constructor() {
    this.reset();
  }
  reset() {
    this.x = Math.random() * canvas.width;
    this.y = canvas.height + 10;
    this.targetY = Math.random() * canvas.height / 2;
    this.size = 2 + Math.random() * 2;
    this.speed = 5 + Math.random() * 3;
    this.color = `hsl(${Math.random() * 360}, 100%, 70%)`;
    this.exploded = false;
    this.particles = [];
  }
  update() {
    if (!this.exploded) {
      this.y -= this.speed;
      if (this.y <= this.targetY) this.explode();
    } else {
      for (let p of this.particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.95;
        p.vy *= 0.95;
        p.life--;
      }
      this.particles = this.particles.filter(p => p.life > 0);
      // 폭죽은 0이 되어도 재설정 안 함 (한 번만 터짐)
    }
  }
  explode() {
    this.exploded = true;
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * 2 * Math.PI;
      const speed = Math.random() * 5 + 2;
      this.particles.push({
        x: this.x,
        y: this.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 50
      });
    }
  }
  draw(ctx) {
    if (!this.exploded) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();
    } else {
      this.particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.globalAlpha = p.life / 50;
        ctx.fill();
        ctx.globalAlpha = 1;
      });
    }
  }
}

function animateFireworks() {
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  fireworks.forEach(fw => {
    fw.update();
    fw.draw(ctx);
  });
  animationId = requestAnimationFrame(animateFireworks);
}

function stopFireworks() {
  if(animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
  animationRunning = false;
  fireworks = [];
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

async function start() {
  await faceapi.nets.tinyFaceDetector.loadFromUri('./models');

  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
  webcam.srcObject = stream;

  await new Promise(resolve => webcam.onloadedmetadata = resolve);

  const options = new faceapi.TinyFaceDetectorOptions();

  const detectInterval = setInterval(async () => {
    const detection = await faceapi.detectSingleFace(webcam, options);
    if (detection) {
      clearInterval(detectInterval);

      // 1초 후 빛 효과 켜기
      setTimeout(() => {
        transitionEffect.style.opacity = '1';
      }, 1000);

      // 4초 후 빛 효과 끄고, 웹캠 페이드아웃 + 폭죽 시작
      setTimeout(() => {
        transitionEffect.style.opacity = '0';

        webcam.style.transition = 'opacity 1.5s ease-in-out';
        webcam.style.opacity = '0';

        // 폭죽 초기화 (한 번만 터지도록)
        fireworks = [];
        for(let i=0; i<15; i++) {
          fireworks.push(new Firework());
        }
        if(!animationRunning) {
          animationRunning = true;
          animateFireworks();
        }

        // 3초 후 폭죽 페이드 아웃 및 애니메이션 중단, 영상 시작
        setTimeout(() => {
          // 폭죽 캔버스 투명도 페이드 아웃
          canvas.style.transition = 'opacity 1.5s ease-in-out';
          canvas.style.opacity = '0';

          stopFireworks();

          // 영상 페이드 인 및 재생
          mainVideo.style.transition = 'opacity 1.5s ease-in-out';
          mainVideo.style.opacity = '1';
          mainVideo.muted = true;
          mainVideo.play().catch(e => console.error('Video play error:', e));
        }, 3000);

      }, 4000);
    }
  }, 200);
}

start();
