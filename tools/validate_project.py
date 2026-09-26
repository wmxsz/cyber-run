from pathlib import Path
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
errors = []

def read(path):
    p = ROOT / path
    if not p.exists():
        errors.append(f"missing: {path}")
        return ""
    return p.read_text(encoding="utf-8")

version = read("ProjectSettings/ProjectVersion.txt")
if "m_EditorVersion: 6000.6.3f1" not in version:
    errors.append("Unity editor version mismatch")

manifest_text = read("Packages/manifest.json")
try:
    manifest = json.loads(manifest_text)
    deps = manifest.get("dependencies", {})
    if deps.get("com.unity.inputsystem") != "1.20.0":
        errors.append("Input System version mismatch")
    if deps.get("com.unity.render-pipelines.universal") != "17.6.0":
        errors.append("URP version mismatch")
except json.JSONDecodeError as exc:
    errors.append(f"manifest JSON invalid: {exc}")

runtime = read("Assets/Scripts/CyberRunBootstrap.cs")
required_runtime = [
    "RuntimeInitializeOnLoadMethod",
    "Touchscreen.current",
    "Mathf.Clamp(lane+(delta.x>0f?1:-1),-1,1)",
    "IsGrounded()",
    "sweptBounds.Intersects(obstacle.bounds)",
    "BuildWorld()",
    "distance=0f;",
    "speed=11f;",
    "gameOver=false;",
    "18f+i*SegmentLength",
    'Shader.Find("CyberRun/Unlit")',
]
for marker in required_runtime:
    if marker not in runtime:
        errors.append(f"runtime marker missing: {marker}")
if "SceneManager.LoadScene" in runtime:
    errors.append("runtime still reloads scene for restart")
if runtime.count("{") != runtime.count("}"):
    errors.append("runtime brace count mismatch")

build_setup = read("Assets/Editor/CyberRunBuildSetup.cs")
for marker in [
    "ConfigureProject()",
    "EnsureRenderPipeline()",
    "EnsureInputHandling()",
    "activeInputHandler",
    "property.intValue=2;",
    "CyberRun/Unlit",
    "GraphicsSettings.defaultRenderPipeline=urp;",
    "PlayerSettings.colorSpace=ColorSpace.Linear;",
    "PlayerSettings.SetGraphicsAPIs(",
    "GraphicsDeviceType.Vulkan",
    "GraphicsDeviceType.OpenGLES3",
    "SetIl2CppCodeGeneration(",
    "Il2CppCodeGeneration.OptimizeSpeed",
    "SetIl2CppCompilerConfiguration(",
    "Il2CppCompilerConfiguration.Master",
]:
    if marker not in build_setup:
        errors.append(f"build setup marker missing: {marker}")
if build_setup.count("{") != build_setup.count("}"):
    errors.append("build setup brace count mismatch")

build_script = read("Assets/Editor/BuildScript.cs")
for marker in [
    "CyberRunBuildSetup.ConfigureProject();",
    "EditorUserBuildSettings.buildAppBundle=false;",
    'locationPathName="build/CyberRun.apk"',
    "BuildOptions.StrictMode",
]:
    if marker not in build_script:
        errors.append(f"build script marker missing: {marker}")
if build_script.count("{") != build_script.count("}"):
    errors.append("build script brace count mismatch")

content = read("Assets/Scripts/CyberRunContentSystems.cs")
for marker in [
    "public sealed class CyberRunContentSystems",
    "RuntimeInitializeOnLoadMethod",
    "CreateCoin(",
    "CreateHoverCar(",
    "CreateCyberSign(",
    "CreateSkyRail(",
    "CreateRoadReflections(",
    "CreateDrone(",
    "SetupRain()",
    "SkyDrone",
    "CyberRain",
    "MagnetCore",
    "magnetTimer",

    "VolumeProfile",
    "Bloom",
    "AudioListener",
    "CyberRun_BestScore",
    "StartScreenTapped()",
    "StartRun()",
    "SetPaused(",
    "materialCache",
    "ShadowCastingMode.Off",
    "crashClip",
    "Handheld.Vibrate()",
]:
    if marker not in content:
        errors.append(f"content marker missing: {marker}")
if content.count("{") != content.count("}"):
    errors.append("content systems brace count mismatch")

animator = read("Assets/Scripts/CyberRunRunnerAnimator.cs")
for marker in [
    "public sealed class CyberRunRunnerAnimator",
    "CyberRunBootstrap",
    "ArmL",
    "ArmR",
    "LegL",
    "LegR",
    "LateUpdate()",
]:
    if marker not in animator:
        errors.append(f"animator marker missing: {marker}")
if animator.count("{") != animator.count("}"):
    errors.append("runner animator brace count mismatch")

particle = read("Assets/Shaders/CyberRunParticle.shader")
for marker in [
    'Shader "CyberRun/Particle"',
    '"RenderType" = "Transparent"',
    "Blend SrcAlpha OneMinusSrcAlpha",
    "#include \"Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl\"",
    "ComputeFogFactor",
]:
    if marker not in particle:
        errors.append(f"particle shader marker missing: {marker}")
if particle.count("{") != particle.count("}"):
    errors.append("particle shader brace count mismatch")

link = read("Assets/link.xml")
for marker in [
    'fullname="Assembly-CSharp"',
    'fullname="CyberRunBootstrap"',
    'fullname="CyberRunContentSystems"',
    'fullname="CyberRunRunnerAnimator"',
]:
    if marker not in link:
        errors.append(f"link marker missing: {marker}")

shader = read("Assets/Shaders/CyberRunUnlit.shader")
for marker in [
    'Shader "CyberRun/Unlit"',
    '"RenderPipeline" = "UniversalPipeline"',
    "#include \"Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl\"",
    "TransformWorldToHClip",
]:
    if marker not in shader:
        errors.append(f"shader marker missing: {marker}")
if shader.count("{") != shader.count("}"):
    errors.append("shader brace count mismatch")


def method_body(text, signature):
    start=text.find(signature)
    if start<0:
        return ""
    brace=text.find("{", start)
    if brace<0:
        return ""
    depth=0
    for i in range(brace,len(text)):
        if text[i]=="{":
            depth+=1
        elif text[i]=="}":
            depth-=1
            if depth==0:
                return text[start:i+1]
    return ""

content_update = method_body(content, "void Update()")
for forbidden in [
    "new Material(",
    "GameObject.CreatePrimitive(",
    "FindFirstObjectByType<",
    "FindObjectsByType<",
]:
    if forbidden in content_update:
        errors.append(f"content Update contains hot-path allocation/search: {forbidden}")

base_update = method_body(runtime, "void Update()")
for forbidden in [
    "new Material(",
    "GameObject.CreatePrimitive(",
    "FindFirstObjectByType<",
    "FindObjectsByType<",
]:
    if forbidden in base_update:
        errors.append(f"bootstrap Update contains hot-path allocation/search: {forbidden}")

if "FieldInfo" in content or "BindingFlags" in content or "using System.Reflection" in content:
    errors.append("content systems still contains reflection state access")

if errors:
    print("CYBER RUN STATIC CHECK: FAIL")
    for error in errors:
        print(f"- {error}")
    sys.exit(1)

print("CYBER RUN STATIC CHECK: PASS")
print("Unity 6000.6.3f1 / URP 17.6.0 / Input System 1.20.0")
print("Android ARM64 / IL2CPP configuration markers present")
print("Runtime reset, touch input, swept collision, project shader and APK build markers present")
