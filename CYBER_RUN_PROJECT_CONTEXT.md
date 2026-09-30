# Cyber Run 项目长期上下文 / 开发主记忆

Repository: wmxsz/cyber-run
Branch: main

## 总目标
把 Cyber Run 持续做到高完成度商业级未来赛博跑酷游戏：画面精细、内容丰富、好玩、稳定、丝滑、尽量无 Bug。开发采用持续循环：检查 -> 发现问题 -> 一次完成一轮有价值的系统性优化 -> CI/代码检查 -> 再检查 -> 进入下一轮；不要只做零碎小改动。

## 世界观硬要求
- 主角必须是“未来赛博人类 / 赛博跑者”，绝对不能是飞机。
- 全部内容必须属于统一的未来赛博世界：角色、道路、城市、广告、障碍、敌人、拾取物、粒子、灯光、镜头、HUD、音效、交互都要有统一特色。
- 不要用“简单几何体 + 发光材质”就当作完成。需要多层结构、材质区别、细节、动态反馈、世界叙事和可读性。

## 设计参考
可以研究成熟跑酷/动作/科幻/赛博游戏，例如 Subway Surfers、Temple Run 2、Cyberpunk 2077 等，吸收路线设计、风险奖励、动作反馈、敌人、环境叙事、材质、灯光、镜头、音频、HUD、世界互动的方法；不要直接抄资源或代码。

## 资源原则
- 当前不以 APK 体积优化为目标。
- 游戏可做到约 500MB–1GB，必要时更高。
- 不要为了省容量降低画质或细节。
- 增加的资源应真正提升模型、材质、纹理、环境、音频、特效或内容质量，不要无意义灌水。

## 已验证/不能随便破坏的玩法
三车道、换道、跳跃、滑铲、护盾、生命、能量/数据核心、Combo、Boost/Overdrive、Hunter、Ghost Protocol、Elite Pursuer、Data Storm、Cyber City、HUD/Combo、高级障碍、对象池、粒子系统、性能监控、GPU 资源复用等。

## 技术路线
Three.js/WebGL 路线继续。保持已有对象池、粒子预算、GPU 生命周期/资源复用、InstancedMesh、性能监控等优化；任何画面升级不能无意造成性能和资源生命周期倒退。可以增加复杂度，但应使用合理的共享资源、批量实例化和可回收结构。

## 当前阶段
- 主角已重做为人形赛博跑者，并加入双脚能量轨迹。
- 障碍物已增加警告环、扫描环、危险条、动态脉冲等多层赛博危险反馈。
- 拾取物正在升级为真正的赛博数据设备：数据核心底座、双天线、中央数据能量束、多层能量环、动态脉冲；Hack Node 有环绕数据 Glyph 层。
- 城市已有建筑原型、Facade 细节、屋顶设施、广告牌、悬浮基础设施、无人机、速度线等。
- 道路已有密集电路/维护板/霓虹细节。
- SceneManager 有后处理 Bloom、ACEsFilmic、像素比同步等。
- PerformanceMonitor 已存在，但真实 Android 设备 FPS/帧时间/Draw Call/长期压力测试尚未完成。
- 没有真实设备视觉验收时，不能声称“已完成手机视觉验收”。

## APK
目前不要构建 APK。Android/Capacitor 打包工作流保留手动触发即可；当前优先级是先把游戏本体继续做强。

## 最近重要提交
Obstacle detail: 6047eec03768f089c5827b6cb8af5eeaf8f4fdb8 (CI #616 success)
Runner foot FX: eb5b8be152a33421b4ea37b84b0ccce671e605f8 (CI #615 success)
Runner exhaust conversion: fb987d400be973377f0cac9e4c6707561cdbc976 (CI #614 success)
Pickup layered cyber device upgrade: 5557f817b1549a104fe420d6df969853e4cd6509 (CI #617 was in progress at last check; recheck before claiming success)
Scene post-processing sync: e1c59398b698baa385664f31d904eca46be1ce98 (CI #613 success)

## 自主工作要求
用户可只发送“@GitHub 继续”。此时直接读取仓库当前状态和最近变更，自己判断优先级并继续优化，不要求用户重新解释项目。优先做对整体体验有明显价值的一轮改进，再验证 CI；发现问题就自己修，不要停在第一处。
