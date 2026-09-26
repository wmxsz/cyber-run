# Cyber Run

一个赛博朋克风的第三人称自动跑酷游戏，目标平台为 Android 64 位。

## 当前技术基线

- Unity 6000.6.3f1
- URP 17.6.0
- Input System 1.20.0
- Android ARM64 / IL2CPP
- 竖屏
- Vulkan 优先，并保留 OpenGLES3 兼容目标

## 当前已完成

- 第三人称自动向前奔跑
- 3 条赛道与左右换道
- Android 触摸滑动换道
- 上滑跳跃
- 下滑滑铲
- 跳跃障碍与顶部滑铲障碍
- 基于实际 Collider 的碰撞检测
- 高速位移的 swept collision 防穿透
- 死亡状态与 Android 触控重开
- 重开时完整重置速度、距离、位置、赛道和摄像机
- 14 段无限道路循环
- 角色跟随摄像机
- 运行时竖屏与防休眠
- 项目自有 URP Unlit Shader，降低 Android Shader 丢失导致粉色材质的风险
- 非障碍环境对象移除无用 Collider，降低移动端物理开销
- 程序化赛博朋克道路、楼体霓虹、车道线、角色细节和顶部霓虹框架

## Android 构建

编辑器构建入口：

BuildScript.BuildAndroid

输出：

build/CyberRun.apk

构建配置会自动确保：

- Android ARM64
- IL2CPP
- APK 而非 AAB
- 竖屏
- Input System 与旧输入后端同时启用
- URP Pipeline
- 项目自有 Shader 被包含进构建

## 当前阶段

核心玩法链已经完成第一轮稳定化；正式成品还需要继续增加更完整的城市美术、动态车辆、广告牌、轨道、雾效、粒子、反射和更完整的 UI/音频表现。

没有真实 Android 真机测试证据时，不把代码级检查当作真机验证结论。
