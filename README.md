# Cyber Run

Version 0.2.0

赛博朋克风第三人称自动跑酷，目标平台为 Android 64 位。

## 技术基线

- Unity 6000.6.3f1
- URP 17.6.0
- Input System 1.20.0
- Android ARM64
- IL2CPP / Master + OptimizeSpeed
- Vulkan → OpenGLES3
- Linear Color Space
- Mobile Multithreaded Rendering
- Portrait
- APK 输出

## 核心玩法

- 第三人称自动向前奔跑
- 3 条赛道
- 左右滑动换道
- 上滑跳跃
- 下滑滑铲
- 跳跃障碍
- 顶部滑铲障碍
- 高速位移 swept collision
- 死亡与完整重开
- 无限赛道分段循环
- 相机平滑跟随与速度 FOV
- Android 后台自动暂停/恢复
- 开始界面与暂停界面

## 内容系统

- 金币收集
- 连击倍率
- Overdrive 数据核心
- Magnet 磁吸核心
- Shield 护盾核心
- 最佳分数持久化
- 程序化赛博朋克角色
- 程序化跑步动画
- 悬浮车辆与动态交通
- 赛博霓虹广告牌
- 高架霓虹轨道
- 道路霓虹反射
- 赛博粒子拖尾与收集爆发
- 环境雾
- Bloom
- ACES Tonemapping
- Color Adjustments
- Vignette
- 程序化 Android 应用图标
- 程序化音效与环境氛围声
- 赛博雨幕与高空无人机
- 触控/跳跃/滑铲/死亡振动反馈

## Android 稳定性

- 运行时强制竖屏
- 防止跑酷中屏幕自动休眠
- 触控阈值按屏幕尺寸自适应
- touch cancel 后恢复正常输入
- Input System / Legacy Input 双后端
- 非障碍物移除无用 Collider
- 共享材质缓存
- GPU Instancing
- 关闭装饰物不需要的阴影、Light Probe 与 Reflection Probe
- 远距离分段 Renderer 裁剪
- IL2CPP link.xml 防止核心运行时类型被裁剪

## 构建入口

BuildScript.BuildAndroid

输出：

build/CyberRun.apk

构建脚本会再次强制执行项目设置，不依赖云端编辑器当前状态。

## 自动质量门禁

.github/workflows/static-check.yml 会检查：

- Unity / URP / Input System 版本
- Android 图形 API
- IL2CPP 配置
- 核心玩法脚本
- 内容系统
- Shader
- Animator
- link.xml
- Android 图标
- 构建入口

这个门禁属于静态结构检查，不等价于真实 Android 真机测试。

## 当前状态

- 移动激光障碍会随无限赛道回收重新换道
- 障碍和金币路线会在赛道回收时变化
- 4 套城市分区色彩主题会随距离切换
- 高速阶段会增强 Bloom、雨幕和色彩强度
- Overdrive / Magnet / Shield 会显示对应的角色环形 VFX

核心玩法、赛博城市第一轮成品内容、三类核心道具、动态障碍、动态金币路线、程序化角色与动画、赛博 HUD、音频、粒子、雨幕、远景天际线、全息广告、道路/建筑专用 Shader 和 Android 性能稳定化已经完成。
