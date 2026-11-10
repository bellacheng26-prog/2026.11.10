let walkImg, jumpImg, fallImg;
let walkFrames = [];
let jumpFrames = [];
let fallFrames = [];

let x, y;          // 角色的座標
let groundY = 380; // 地面高度
let vy = 0;        // 垂直速度（重力用）
let gravity = 0.6; // 重力加速度
let jumpForce = -11; // 跳躍初始速度
let speed = 4;     // 移動速度

let currentFrame = 0;
let animSpeed = 0.2; // 動畫播放速度
let frameCounter = 0;
let jumpFrameCounter = 0;
let fallFrameCounter = 0;

let facing = 1;    // 原始圖片朝左，-1 表示水平翻轉朝右
let state = 'idle'; // 當前狀態：'idle'(靜止), 'walk'(走路), 'jump'(跳躍), 'fall'(跌倒中), 'fallen'(已倒地)

// 障礙物系統
let obstacles = [];      // 障礙物陣列
let obstacleTimer = 0;   // 障礙物生成計時器
let obstacleInterval = 70; // 生成間隔（幀數，越小越頻繁）
let score = 0;           // 得分
let gameOver = false;    // 遊戲是否結束

// 數學題系統
let showingMathQuestion = false; // 是否顯示數學題
let mathQuestion = "";           // 數學題文字
let mathAnswer = 0;              // 正確答案
let mathUserInput = "";          // 玩家輸入
let collidingObstacle = null;    // 正在處理碰撞的障礙物

function preload() {
  walkImg = loadImage('角色資料/走.png', () => {
    console.log('走路角色圖片載入成功');
  }, (error) => {
    console.error('走路角色圖片載入失敗，將使用內建角色圖形。', error);
  });
  jumpImg = loadImage('角色資料/跳.png', () => {
    console.log('跳躍角色圖片載入成功');
  }, (error) => {
    console.error('跳躍角色圖片載入失敗，將使用內建角色圖形。', error);
  });
  fallImg = loadImage('角色資料/跌倒.png', () => {
    console.log('跌倒角色圖片載入成功');
  }, (error) => {
    console.error('跌倒角色圖片載入失敗，將使用內建角色圖形。', error);
  });
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  groundY = height * 0.76;
  x = width / 2;
  y = groundY;

  if (walkImg) {
    let wWidth = Math.floor(walkImg.width / 6);
    let wHeight = walkImg.height;
    for (let i = 0; i < 6; i++) {
      let img = walkImg.get(i * wWidth, 0, wWidth, wHeight);
      walkFrames.push(img);
    }
  }

  if (jumpImg) {
    let jWidth = Math.floor(jumpImg.width / 7);
    let jHeight = jumpImg.height;
    for (let i = 0; i < 7; i++) {
      let img = jumpImg.get(i * jWidth, 0, jWidth, jHeight);
      jumpFrames.push(img);
    }
  }

  if (fallImg) {
    let fWidth = Math.floor(fallImg.width / 7);
    let fHeight = fallImg.height;
    for (let i = 0; i < 7; i++) {
      let sx = i * fWidth;
      let sw = (i === 6) ? fallImg.width - sx : fWidth; // 最後一幀補齊剩餘寬度，避免切歪
      let img = fallImg.get(sx, 0, sw, fHeight);
      fallFrames.push(img);
    }
  }
}

// 生成簡單數學題（加減乘，1-20 範圍內）
function generateMathQuestion() {
  let a = floor(random(1, 21));
  let b = floor(random(1, 21));
  let op = floor(random(3));
  if (op === 0) {
    mathQuestion = a + ' + ' + b;
    mathAnswer = a + b;
  } else if (op === 1) {
    // 確保減法不出現負數
    if (a < b) [a, b] = [b, a];
    mathQuestion = a + ' - ' + b;
    mathAnswer = a - b;
  } else {
    mathQuestion = a + ' × ' + b;
    mathAnswer = a * b;
  }
  mathUserInput = '';
}

function draw() {
  drawScene();

  // 顯示得分
  fill(0);
  textSize(24);
  textAlign(LEFT, TOP);
  text('得分: ' + score, 20, 20);

  // 遊戲結束訊息
  if (gameOver) {
    fill(0, 0, 0, 150);
    rect(0, 0, width, height);
    fill(255);
    textSize(40);
    textAlign(CENTER, CENTER);
    text('遊戲結束！', width / 2, height / 2 - 40);
    textSize(24);
    text('得分: ' + score, width / 2, height / 2 + 10);
    textSize(20);
    text('按空白鍵重新開始', width / 2, height / 2 + 50);
  }

  // 數學題顯示與輸入
  if (showingMathQuestion) {
    fill(0, 0, 0, 180);
    rect(0, 0, width, height);
    fill(255);
    textSize(32);
    textAlign(CENTER, CENTER);
    text('碰到障礙物！答對數學題可繼續', width / 2, height / 2 - 100);
    textSize(40);
    text(mathQuestion + ' = ?', width / 2, height / 2 - 20);
    textSize(28);
    text('你的答案: ' + mathUserInput, width / 2, height / 2 + 40);
    textSize(20);
    text('輸入數字後按 Enter 確認', width / 2, height / 2 + 90);
  }

  // 倒地動畫播放時不移動，倒地後按左右鍵可起身
  if (state === 'fallen' && (keyIsDown(LEFT_ARROW) || keyIsDown(RIGHT_ARROW))) {
    state = 'idle';
    fallFrameCounter = 0;
  }

  // 處理鍵盤左右移動輸入
  let isMoving = false;
  if (state !== 'fall') {
    if (keyIsDown(LEFT_ARROW)) {
      x -= speed;
      facing = 1;
      isMoving = true;
    }
    if (keyIsDown(RIGHT_ARROW)) {
      x += speed;
      facing = -1;
      isMoving = true;
    }
  }

  // 處理跳躍與重力物理運算
  if (state === 'jump' || y < groundY) {
    vy += gravity;
    y += vy;
    if (y < groundY) {
      state = 'jump';
    } else {
      y = groundY;
      vy = 0;
      jumpFrameCounter = 0;
      state = isMoving ? 'walk' : 'idle';
    }
  } else if (state !== 'fall' && state !== 'fallen') {
    if (isMoving) {
      state = 'walk';
    } else {
      state = 'idle';
    }
  }

  // === 障礙物系統 ===
  if (!gameOver) {
    // 生成障礙物
    obstacleTimer++;
    if (obstacleTimer >= obstacleInterval) {
      obstacleTimer = 0;
      // 隨機障礙物類型：0=小石頭, 1=大石頭, 2=樹樁
      let type = floor(random(3));
      let obsW, obsH, obsY;
      if (type === 0) {
        obsW = 30; obsH = 30; obsY = groundY + 25 - obsH;
      } else if (type === 1) {
        obsW = 50; obsH = 50; obsY = groundY + 25 - obsH;
      } else {
        obsW = 40; obsH = 60; obsY = groundY + 25 - obsH;
      }
      obstacles.push({
        x: width + 50,
        y: obsY,
        w: obsW,
        h: obsH,
        type: type,
        passed: false
      });
      // 隨機調整下一個生成間隔（越小越頻繁）
      obstacleInterval = random(40, 100);
    }

    // 更新與碰撞檢測
    for (let i = obstacles.length - 1; i >= 0; i--) {
      let obs = obstacles[i];
      if (showingMathQuestion) {
        continue; // 數學題顯示時，所有障礙物暫停移動
      }
      obs.x -= 5; // 障礙物向左移動

      // 碰撞檢測（AABB）
      let charW = 40, charH = 60;
      let charX = x - charW / 2;
      let charY = y - charH / 2;

      if (charX < obs.x + obs.w &&
          charX + charW > obs.x &&
          charY < obs.y + obs.h &&
          charY + charH > obs.y) {
        // 發生碰撞：播放跌倒動畫並出現數學題
        if (!showingMathQuestion && state !== 'fall' && state !== 'fallen') {
          collidingObstacle = obs;
          state = 'fall';
          fallFrameCounter = 0;
          showingMathQuestion = true;
          generateMathQuestion();
        }
      }

      // 計分：角色經過障礙物
      if (!obs.passed && obs.x + obs.w < x) {
        obs.passed = true;
        score++;
      }

      // 移出畫面的障礙物移除
      if (obs.x + obs.w < 0) {
        obstacles.splice(i, 1);
      }
    }
  }

  // 處理動畫幀切換
  if (state === 'walk' && walkFrames.length > 0) {
    frameCounter += animSpeed;
    currentFrame = Math.floor(frameCounter) % walkFrames.length;
  } else if (state === 'jump' && jumpFrames.length > 0) {
    currentFrame = min(Math.floor(jumpFrameCounter), jumpFrames.length - 1);
    jumpFrameCounter += animSpeed;
  } else if (state === 'fall' && fallFrames.length > 0) {
    fallFrameCounter += animSpeed;
    currentFrame = min(Math.floor(fallFrameCounter), fallFrames.length - 1);
    if (fallFrameCounter >= fallFrames.length - 1) {
      state = 'fallen';
    }
  } else if (state === 'fallen' && fallFrames.length > 0) {
    currentFrame = fallFrames.length - 1; // 保持最後一個跌倒幀
  } else if (state === 'fall' || state === 'fallen') {
    if (state === 'fall') {
      fallFrameCounter += animSpeed;
      if (fallFrameCounter >= 7) {
        state = 'fallen';
      }
    }
  } else if (state === 'idle') {
    currentFrame = 0;
    frameCounter = 0;
  }

  if ((state === 'fall' || state === 'fallen') && fallFrames.length === 0 ||
      (state === 'jump' && jumpFrames.length === 0) ||
      (state !== 'jump' && walkFrames.length === 0)) {
    drawFallbackCharacter();
  } else {
    // 繪製角色
    push();
    translate(x, y);
    scale(facing, 1); // 透過 scale 實現水平鏡射翻轉
    imageMode(CENTER);

    if (state === 'jump') {
      image(jumpFrames[currentFrame], 0, 0);
    } else if (state === 'fall' || state === 'fallen') {
      // 跌倒圖片貼地：根據圖片高度向下偏移，讓圖片底部貼近地面
      let fallImg = fallFrames[currentFrame];
      let fallY = fallImg ? fallImg.height * 0.25 : 0;
      image(fallImg, 0, fallY);
    } else {
      image(walkFrames[currentFrame], 0, 0);
    }
    pop();
  }
}

function drawFallbackCharacter() {
  push();
  translate(x, y);
  scale(facing, 1);
  noStroke();

  if (state === 'fall' || state === 'fallen') {
    fill(247, 190, 83);
    ellipse(0, 8, 54, 28);
    fill(255, 231, 190);
    ellipse(-13, 1, 25, 24);
    fill(57, 64, 77);
    ellipse(-19, -2, 3, 4);
    fill(84, 146, 205);
    rect(-4, 12, 21, 8, 5);
  } else {
    const hop = state === 'jump' ? -8 : 0;
    fill(84, 146, 205);
    rect(-12, -34 + hop, 24, 30, 9);
    fill(255, 231, 190);
    ellipse(0, -43 + hop, 30, 30);
    fill(57, 64, 77);
    ellipse(6, -45 + hop, 3, 4);
    fill(247, 190, 83);
    arc(0, -49 + hop, 31, 23, PI, TWO_PI);
    fill(57, 64, 77);
    rect(-12, -5 + hop, 9, 17, 4);
    rect(3, -5 + hop, 9, 17, 4);
    fill(255, 231, 190);
    ellipse(-7, 12 + hop, 14, 6);
    ellipse(8, 12 + hop, 14, 6);
  }
  pop();
}

function drawScene() {
  const sky = drawingContext.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#78c9ec');
  sky.addColorStop(0.64, '#d7f2e7');
  drawingContext.fillStyle = sky;
  drawingContext.fillRect(0, 0, width, height);

  noStroke();
  fill(255, 224, 120);
  ellipse(width * 0.84, height * 0.17, 74, 74);

  const cloudOffset = (frameCount * 0.25) % (width + 180);
  drawCloud(cloudOffset - 90, height * 0.19, 1);
  drawCloud((cloudOffset + width * 0.48) % (width + 180) - 90, height * 0.31, 0.72);

  fill(133, 201, 164);
  beginShape();
  vertex(0, height * 0.69);
  bezierVertex(width * 0.18, height * 0.48, width * 0.29, height * 0.7, width * 0.48, height * 0.63);
  bezierVertex(width * 0.69, height * 0.52, width * 0.82, height * 0.7, width, height * 0.58);
  vertex(width, groundY + 25);
  vertex(0, groundY + 25);
  endShape(CLOSE);

  fill(94, 177, 127);
  beginShape();
  vertex(0, height * 0.77);
  bezierVertex(width * 0.2, height * 0.63, width * 0.3, height * 0.77, width * 0.53, height * 0.7);
  bezierVertex(width * 0.75, height * 0.63, width * 0.87, height * 0.77, width, height * 0.68);
  vertex(width, groundY + 25);
  vertex(0, groundY + 25);
  endShape(CLOSE);

  fill(103, 190, 99);
  rect(0, groundY + 25, width, height - groundY - 25);
  stroke(65, 145, 78);
  strokeWeight(3);
  line(0, groundY + 25, width, groundY + 25);

  noStroke();
  for (let flowerX = 36; flowerX < width; flowerX += 96) {
    const flowerY = groundY + 58 + (flowerX % 3) * 12;
    fill(255, 239, 177);
    ellipse(flowerX, flowerY, 8, 8);
    fill(55, 133, 70);
    rect(flowerX - 1, flowerY + 4, 2, 12);
  }

  // 繪製障礙物
  for (let obs of obstacles) {
    if (obs.type === 0) {
      // 小石頭
      fill(139, 133, 126);
      ellipse(obs.x + obs.w / 2, obs.y + obs.h / 2, obs.w, obs.h);
      fill(100, 95, 88);
      ellipse(obs.x + obs.w * 0.3, obs.y + obs.h * 0.3, obs.w * 0.4, obs.h * 0.4);
    } else if (obs.type === 1) {
      // 大石頭
      fill(139, 133, 126);
      rect(obs.x, obs.y, obs.w, obs.h, 8);
      fill(100, 95, 88);
      rect(obs.x + 5, obs.y + 5, obs.w - 10, obs.h - 10, 5);
    } else {
      // 樹樁
      fill(101, 67, 33);
      rect(obs.x + obs.w * 0.3, obs.y + obs.h * 0.4, obs.w * 0.4, obs.h * 0.6);
      fill(139, 69, 19);
      ellipse(obs.x + obs.w / 2, obs.y + obs.h * 0.3, obs.w * 1.2, obs.h * 0.6);
    }
  }
}

function drawCloud(cloudX, cloudY, cloudScale) {
  push();
  translate(cloudX, cloudY);
  scale(cloudScale);
  noStroke();
  fill(255, 255, 255, 220);
  ellipse(0, 12, 72, 30);
  ellipse(-22, 4, 38, 34);
  ellipse(4, -5, 48, 46);
  ellipse(29, 6, 36, 30);
  pop();
}

function windowResized() {
  const groundOffset = y - groundY;
  resizeCanvas(windowWidth, windowHeight);
  groundY = height * 0.76;
  y = groundY + groundOffset;
  x = constrain(x, 24, width - 24);
}

function keyPressed() {
  // 遊戲結束時按空白鍵重新開始
  if (gameOver && keyCode === 32) {
    obstacles = [];
    score = 0;
    gameOver = false;
    state = 'idle';
    x = width / 2;
    y = groundY;
    vy = 0;
    fallFrameCounter = 0;
    obstacleTimer = 0;
    obstacleInterval = 70;
    return;
  }

  // 數學題輸入處理
  if (showingMathQuestion) {
    // 數字鍵 0-9
    if (keyCode >= 48 && keyCode <= 57) {
      mathUserInput += key;
    } else if (keyCode >= 96 && keyCode <= 105) {
      // 小鍵盤數字 0-9
      mathUserInput += key;
    } else if (keyCode === 8) {
      // Backspace 刪除最後一個字
      mathUserInput = mathUserInput.slice(0, -1);
    } else if (keyCode === 13) {
      // Enter 確認答案
      let userAnswer = parseInt(mathUserInput);
      if (!isNaN(userAnswer) && userAnswer === mathAnswer) {
        // 答對：從跌倒狀態恢復，移除障礙物，繼續遊戲
        showingMathQuestion = false;
        // 恢復角色狀態
        if (state === 'fall' || state === 'fallen') {
          state = 'idle';
          fallFrameCounter = 0;
        }
        // 從障礙物陣列移除該障礙物
        for (let i = obstacles.length - 1; i >= 0; i--) {
          if (obstacles[i] === collidingObstacle) {
            obstacles.splice(i, 1);
            break;
          }
        }
        collidingObstacle = null;
      } else {
        // 答錯：遊戲失敗
        showingMathQuestion = false;
        collidingObstacle = null;
        gameOver = true;
      }
    }
    return;
  }

  // 當按下鍵盤上鍵，且角色在地面上時觸發跳躍
  if (keyCode === UP_ARROW && y === groundY && state !== 'fall') {
    vy = jumpForce;
    state = 'jump';
    jumpFrameCounter = 0;
  }
  if (keyCode === DOWN_ARROW && y === groundY && state !== 'jump' && state !== 'fall' && state !== 'fallen') {
    state = 'fall';
    fallFrameCounter = 0;
  }
}