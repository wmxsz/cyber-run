# Cyber Run

一个可直接运行的 3D 赛博朋克无限跑酷小游戏。

## 项目结构

这个仓库现在采用和同类型开源项目一致的极简结构：

```text
cyber-run/
├── index.html
├── README.md
├── LICENSE
└── .github/
    └── workflows/
        └── static-check.yml
```

游戏主体只有一个 `index.html`，里面包含 HTML、CSS、Three.js 场景、游戏逻辑、移动端触控和 Web Audio 音效。

## 玩法

- 三车道自动前进
- 左右换道
- 跳跃躲避障碍
- 数据核心收集
- 护盾道具
- 无限距离与最高分
- 赛博朋克霓虹城市
- 手机触控按钮和左右/上滑手势

## 运行

直接打开 `index.html` 即可运行。

也可以把仓库部署到 GitHub Pages，作为网页小游戏使用。

## 技术

- Three.js r128
- WebGL
- Web Audio API
- 原生 HTML / CSS / JavaScript
- 无本地 3D 模型和音频资源

## 来源与授权

游戏核心代码基于：

https://github.com/jeiel85/cyberpunk-neon-runner-3d

原项目使用 MIT License。本仓库保留原 MIT 授权文件，并在此基础上用于本项目。
