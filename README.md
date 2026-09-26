# Cyber Run

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

核心玩法与第一轮成品内容已经完成；后续仍可继续增加更高质量的角色模型、城市资产、动态天气/时间、更多障碍与道具、正式 UI、音频和进一步的 Android 性能调校。
