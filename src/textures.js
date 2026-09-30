export function createGridTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // 다크 퍼플 배경
    ctx.fillStyle = '#060414';
    ctx.fillRect(0, 0, 512, 512);

    // 네온 사이언 그리드 라인
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 10;

    const step = 64;
    for (let x = 0; x <= 512; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 512);
      ctx.stroke();
    }
    for (let y = 0; y <= 512; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }

    // 중앙 레인 구분 네온 마젠타 라인
    ctx.strokeStyle = '#ff0077';
    ctx.shadowColor = '#ff0077';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(256, 0);
    ctx.lineTo(256, 512);
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 40);
    return texture;
  }

  export function createBuildingTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // 빌딩 외벽
    ctx.fillStyle = '#09071b';
    ctx.fillRect(0, 0, 256, 512);

    // 창문 불빛 패턴
    const colors = ['#00f0ff', '#ff0077', '#ffe600', '#221133', '#110d29'];
    for (let y = 16; y < 500; y += 24) {
      for (let x = 16; x < 240; x += 20) {
        if (Math.random() > 0.4) {
          ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
          ctx.fillRect(x, y, 12, 14);
        }
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  export function createHazardTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // 눈에 확 띄는 고대비 네온 옐로우 & 블랙 해저드 사선 스트라이프
    ctx.fillStyle = '#ffcc00';
    ctx.fillRect(0, 0, 256, 256);

    ctx.fillStyle = '#110505';
    const stripeWidth = 32;
    for (let i = -256; i < 512; i += stripeWidth * 2) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + stripeWidth, 0);
      ctx.lineTo(i + stripeWidth + 256, 256);
      ctx.lineTo(i + 256, 256);
      ctx.closePath();
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
    return texture;
  }

  export function createWarningSignTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // 짙은 레드 테두리와 네온 옐로우 경고 심볼
    ctx.fillStyle = '#220008';
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = '#ff0055';
    ctx.lineWidth = 14;
    ctx.strokeRect(8, 8, 240, 240);

    // 경고 삼각형
    ctx.strokeStyle = '#ffcc00';
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.moveTo(128, 40);
    ctx.lineTo(220, 200);
    ctx.lineTo(36, 200);
    ctx.closePath();
    ctx.stroke();

    // 느낌표
    ctx.fillStyle = '#ffcc00';
    ctx.fillRect(120, 85, 16, 60);
    ctx.beginPath();
    ctx.arc(128, 172, 10, 0, Math.PI * 2);
    ctx.fill();

    return new THREE.CanvasTexture(canvas);
  }

  