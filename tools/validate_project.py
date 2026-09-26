from pathlib import Path
import json
import re
import ast
import sys

ROOT = Path(__file__).resolve().parents[1]
errors = []

def read(path):
    p = ROOT / path
    if not p.exists():
        errors.append(f"missing: {path}")
        return ""
    return p.read_text(encoding="utf-8")

def validate_python_syntax():
    for path in sorted((ROOT / "tools").glob("*.py")):
        try:
            ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
        except SyntaxError as exc:
            errors.append(f"python syntax invalid: {path}: {exc}")

def validate_source_structure(path, source):
    stack=[]
    pairs={"}":"{",")":"(","]":"["}
    i=0
    in_string=None
    in_char=False
    line_comment=False
    block_comment=False
    escape=False
    while i<len(source):
        c=source[i]
        n=source[i+1] if i+1<len(source) else ""
        if line_comment:
            if c=="\n": line_comment=False
            i+=1
            continue
        if block_comment:
            if c=="*" and n=="/":
                block_comment=False
                i+=2
                continue
            i+=1
            continue
        if in_string:
            if escape:
                escape=False
            elif c=="\\":
                escape=True
            elif c==in_string:
                in_string=None
            i+=1
            continue
        if in_char:
            if escape:
                escape=False
            elif c=="\\":
                escape=True
            elif c=="'":
                in_char=False
            i+=1
            continue
        if c=="/" and n=="/":
            line_comment=True
            i+=2
            continue
        if c=="/" and n=="*":
            block_comment=True
            i+=2
            continue
        if c=='"':
            in_string='"'
            i+=1
            continue
        if c=="'":
            in_char=True
            i+=1
            continue
        if c in "({[":
            stack.append(c)
        elif c in "})]":
            if not stack or stack[-1]!=pairs[c]:
                errors.append(f"source delimiter mismatch: {path}")
                return
            stack.pop()
        i+=1
    if in_string or in_char or block_comment or stack:
        errors.append(f"source structure incomplete: {path}")


validate_python_syntax()

TEXT_EXTENSIONS={".py",".cs",".shader",".yml",".yaml",".json",".txt",".md",".meta",".asset",".unity",".gitignore"}
for path in sorted(ROOT.rglob("*")):
    if not path.is_file() or ".git" in path.parts or path.suffix.lower() not in TEXT_EXTENSIONS:
        continue
    try:
        raw=path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        continue
    for line_number,line in enumerate(raw.splitlines(),1):
        if line.endswith((" ","\\t")):
            errors.append(f"trailing whitespace: {path.relative_to(ROOT)}:{line_number}")
            break
    if raw.endswith("\n\n"):
        errors.append(f"multiple blank lines at EOF: {path.relative_to(ROOT)}")
    if raw and not raw.endswith("\n"):
        errors.append(f"missing final newline: {path.relative_to(ROOT)}")

for py in sorted((ROOT / "tools").glob("*.py")):
    _ = read(f"tools/{py.name}")

for cs in sorted((ROOT / "Assets").rglob("*.cs")):
    validate_source_structure(cs.relative_to(ROOT), cs.read_text(encoding="utf-8"))

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
required_runtime.extend([
    "float difficulty=Mathf.Clamp01(distance/1800f);",
    "speed+dt*(.1f+difficulty*.045f)",
    "21.5f",
    "difficultyStep=Mathf.FloorToInt(",
    "MovingLaser",
    "movingHazards",
    "UpdateMovingHazards()",
    "CreateCyberTunnel",
    "TunnelLeft",
    "TunnelRight",
    "TunnelRoof",
    "TunnelLight",
    "Physics.autoSyncTransforms=false;",
    "segmentCycles.Clear();",
    "int segmentIndex=0;",
])
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
    "SetupSpeedLines()",
    "UpdateSpeedLineIntensity()",
    "SpeedLines",
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
    "UpdateVisualCulling()",
    "RefreshSegmentRendererCache()",
    "visualCacheRefreshTimer",
    "visibleDistance=250f",
    "runStartDistance",
    "lastBootstrapDistance",
    "ResetSegmentTracking()",
    "renderers=root.GetComponentsInChildren<Renderer>(true)",
    "ShadowCastingMode.Off",
    "crashClip",
    "Handheld.Vibrate()",
]:
    if marker not in content:
        errors.append(f"content marker missing: {marker}")
if content.count("{") != content.count("}"):
    errors.append("content systems brace count mismatch")
if "lastPlayerZ" in content:
    errors.append("content still relies on world Z for run-state accounting")


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

visual_overdrive = read("Assets/Scripts/CyberRunVisualOverdrive.cs")
for marker in [
    "CyberRunVisualOverdrive",
    "Specialized visual passes own these renderers.",
    "CyberRun/Surface",
]:
    if marker not in visual_overdrive:
        errors.append(f"visual overdrive marker missing: {marker}")

action_vfx = read("Assets/Scripts/CyberRunActionVFX.cs")
for marker in [
    "CyberRunActionVFX",
    "EmitLaneBurst",
    "EmitJumpStart",
    "EmitLanding",
    "ActionBurst",
]:
    if marker not in action_vfx:
        errors.append(f"action VFX marker missing: {marker}")

music_system = read("Assets/Scripts/CyberRunMusicSystem.cs")
for marker in [
    "CyberRunMusicSystem",
    "CreateCyberTrack()",
    "CyberRun_MainTheme",
    "source.pitch",
]:
    if marker not in music_system:
        errors.append(f"music system marker missing: {marker}")

sector_palette = read("Assets/Scripts/CyberRunSectorPalette.cs")
for marker in [
    "CyberRunSectorPalette",
    "palettes",
    "distance/650f",
    "ApplyPalette(",
    "HologramBillboard",
]:
    if marker not in sector_palette:
        errors.append(f"sector palette marker missing: {marker}")

power_vfx = read("Assets/Scripts/CyberRunPowerVFX.cs")
for marker in [
    "CyberRunPowerVFX",
    "CyberRun/Surface",
    "IsOverdriveActive",
    "IsMagnetActive",
    "IsShieldActive",
    "readonly MaterialPropertyBlock block=new();",
    "block.Clear();",
]:
    if marker not in power_vfx:
        errors.append(f"power VFX marker missing: {marker}")

intensity_script = read("Assets/Scripts/CyberRunIntensityController.cs")
for marker in [
    "CyberRunIntensityController",
    "Bloom",
    "ColorAdjustments",
    "RenderSettings.fogDensity",
    "CyberRain",
]:
    if marker not in intensity_script:
        errors.append(f"intensity controller marker missing: {marker}")

skyline_script = read("Assets/Scripts/CyberRunSkylineProps.cs")
street_script = read("Assets/Scripts/CyberRunStreetProps.cs")
audio_script = read("Assets/Scripts/CyberRunEngineAudio.cs")
gameplay_visuals = read("Assets/Scripts/CyberRunGameplayVisuals.cs")
holo_script = read("Assets/Scripts/CyberRunHolograms.cs")
road_script = read("Assets/Scripts/CyberRunRoadVisual.cs")
city_script = read("Assets/Scripts/CyberRunCityVisual.cs")

for source, markers, label in [
    (skyline_script, ["CyberRunSkylineProps", "SkylineTower", "SkylineBeacon"], "skyline"),
    (street_script, ["CyberRunStreetProps", "NeonStreetLamp", "RoadPylon"], "street props"),
    (audio_script, ["CyberRunEngineAudio", "CyberEngine", "source.pitch"], "engine audio"),
    (gameplay_visuals, ["CyberRunGameplayVisuals", "StyleObstacles", "StyleCoins", "StylePowerups", "StyleTraffic"], "gameplay visuals"),
    (holo_script, ["CyberRunHolograms", "HologramBillboard", "CyberRun/Hologram"], "holograms"),
    (road_script, ["CyberRunRoadVisual", "CyberRun/Road", "roadShader"], "road visuals"),
    (city_script, ["CyberRunCityVisual", "CyberRun/City", "AddRooftopDetails"], "city visuals"),
]:
    for marker in markers:
        if marker not in source:
            errors.append(f"{label} marker missing: {marker}")

surface_shader = read("Assets/Shaders/CyberRunSurface.shader")
for marker in ['Shader "CyberRun/Surface"', "CyberSurface", "ComputeFogFactor"]:
    if marker not in surface_shader:
        errors.append(f"surface shader marker missing: {marker}")

skyline_shader = read("Assets/Shaders/CyberRunCity.shader")
road_shader = read("Assets/Shaders/CyberRunRoad.shader")
holo_shader = read("Assets/Shaders/CyberRunHologram.shader")
for source, markers, label in [
    (skyline_shader, ['Shader "CyberRun/City"', "Hash21"], "city shader"),
    (road_shader, ['Shader "CyberRun/Road"', "GridDensity"], "road shader"),
    (holo_shader, ['Shader "CyberRun/Hologram"', "Blend SrcAlpha One"], "hologram shader"),
]:
    for marker in markers:
        if marker not in source:
            errors.append(f"{label} marker missing: {marker}")

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
    'fullname="CyberRunVisualOverdrive"',
    'fullname="CyberRunCityVisual"',
    'fullname="CyberRunGameplayVisuals"',
    'fullname="CyberRunEngineAudio"',
    'fullname="CyberRunStreetProps"',
    'fullname="CyberRunSkylineProps"',
    'fullname="CyberRunHolograms"',
    'fullname="CyberRunRoadVisual"',
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

if "CreatePrimitive(" in content_update or "new Material(" in content_update:
    errors.append("content Update contains object creation")



if "startZ" in content:
    errors.append("content still contains stale startZ reference")
if "FieldInfo" in content or "BindingFlags" in content or "System.Reflection" in content:
    errors.append("content systems contains stale reflection references")
if "left" in method_body(content, "void UpdateScore()") or "top" in method_body(content, "void UpdateScore()"):
    errors.append("UpdateScore contains GUI-only layout identifiers")

for method_name in ["void Update()", "void UpdateScore()", "void UpdateCoins()", "void UpdatePowerups()", "void UpdateVehicles()"]:
    body = method_body(content, method_name)
    if "GUI." in body:
        errors.append(f"{method_name} contains GUI calls")

if errors:
    print("CYBER RUN STATIC CHECK: FAIL")
    for error in errors:
        print(f"- {error}")
    sys.exit(1)

print("CYBER RUN STATIC CHECK: PASS")
print("Unity 6000.6.3f1 / URP 17.6.0 / Input System 1.20.0")
print("Android ARM64 / IL2CPP configuration markers present")
print("Runtime reset, touch input, swept collision, project shader and APK build markers present")
