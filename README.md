# Cyber Run

3D 赛博朋克无限跑酷小游戏。

当前采用成熟 Three.js 跑酷项目常见的分层方式：核心引擎、世界、实体、系统、UI 和配置分别负责自己的工作。这样后续加角色、道具、障碍、排行榜或 APK 壳时，不需要再把一个大文件越改越乱。

## 结构

```text
src/
├── config/
│   └── gameConfig.js
├── core/
│   ├── GameEngine.js
│   ├── SceneManager.js
│   ├── InputManager.js
│   ├── AudioManager.js
│   └── ObjectPool.js
├── world/
│   ├── RoadManager.js
│   ├── CityManager.js
│   └── ParticleSystem.js
├── entities/
│   ├── PlayerObject.js
│   ├── ObstacleManager.js
│   ├── obstacleTypes.js
│   └── PickupManager.js
├── systems/
│   ├── CollisionSystem.js
│   ├── ScoreSystem.js
│   ├── DifficultySystem.js
│   └── PersistenceSystem.js
├── ui/
│   └── UIManager.js
├── styles.css
└── main.js
```

## 我们保留的特色

三车道霓虹赛博公路、悬浮未来车、赛博城市与巨型霓虹太阳环、能源核心、一次性护盾、生命值、激光/地雷/危险方块，以及键盘、鼠标、手机按钮和滑动操作。

## 借鉴原则

同类项目的成熟架构可以借鉴；没有明确开放许可证的仓库只参考结构和设计思路，不直接复制代码。

本项目的早期游戏核心来自 MIT License 项目：

https://github.com/jeiel85/cyberpunk-neon-runner-3d

## 开发

```bash
npm install
npm run dev
npm run build
```

当前使用 Three.js 0.186.0 + Vite 8.3.1，并采用 ES Modules。
