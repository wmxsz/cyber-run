# Cyber Run

一个可直接部署到 GitHub Pages 的 3D 赛博朋克无限跑酷小游戏。

## 项目结构

```text
cyber-run/
├── index.html
├── src/
│   ├── main.js              # 启动入口
│   ├── game.js              # Three.js 场景、生成、碰撞、循环等核心逻辑
│   ├── audio.js             # Web Audio 音效与循环 BGM
│   ├── textures.js          # 程序化纹理生成
│   └── styles.css           # HUD、弹窗、移动端界面
├── README.md
├── LICENSE
└── .github/workflows/static-check.yml
```

这种拆分参考了近期仍在维护的 Three.js / 3D 项目常见的模块化组织方式，同时保留本项目已经验证过的单文件跑酷实现作为代码基础。

## 玩法

- 三车道自动前进
- 左右换道
- 跳跃躲避障碍
- 数据核心收集
- 护盾道具
- 无限距离与最高分
- 赛博朋克霓虹城市
- 手机触控按钮和手势

## 运行

推荐直接部署到 GitHub Pages，或者使用任意静态 HTTP 服务器运行。由于项目现在使用 ES Modules，某些浏览器会限制直接双击 `index.html` 的 `file://` 模式。

## 技术

- Three.js r128
- WebGL
- Web Audio API
- 原生 HTML / CSS / JavaScript ES Modules
- 无本地 3D 模型和音频资源

## 来源与授权

游戏核心代码基于 MIT License 项目：

https://github.com/jeiel85/cyberpunk-neon-runner-3d

本仓库保留 MIT 授权与来源说明。参考其它项目时仅借鉴其公开的架构思路；没有明确开放许可证的项目不直接复制其代码。
