#if UNITY_EDITOR
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using System.IO;
using UnityEditor.Build;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

[InitializeOnLoad]
public static class CyberRunBuildSetup
{
    static CyberRunBuildSetup()
    {
        PlayerSettings.companyName="CyberRun";
        PlayerSettings.productName="Cyber Run";
        PlayerSettings.bundleVersion="0.1.0";
        PlayerSettings.SetApplicationIdentifier(BuildTargetGroup.Android,"com.wmxsz.cyberrun");
        PlayerSettings.Android.targetArchitectures=AndroidArchitecture.ARM64;
        PlayerSettings.SetScriptingBackend(NamedBuildTarget.Android,ScriptingImplementation.IL2CPP);
        PlayerSettings.Android.minSdkVersion=AndroidSdkVersions.AndroidApiLevel26;
        PlayerSettings.defaultInterfaceOrientation=UIOrientation.Portrait;

        EnsureRenderPipeline();
        EnsureScene();
    }

    static void EnsureRenderPipeline()
    {
        const string dir="Assets/Settings";
        const string path=dir+"/CyberRunURP.asset";
        Directory.CreateDirectory(dir);

        var urp=AssetDatabase.LoadAssetAtPath<UniversalRenderPipelineAsset>(path);
        if(urp==null)
        {
            urp=ScriptableObject.CreateInstance<UniversalRenderPipelineAsset>();
            urp.LoadBuiltinRendererData(RendererType.UniversalRenderer);
            AssetDatabase.CreateAsset(urp,path);
            AssetDatabase.SaveAssets();
        }

        GraphicsSettings.defaultRenderPipeline=urp;
        QualitySettings.renderPipeline=urp;

        var lit=Shader.Find("Universal Render Pipeline/Lit");
        var unlit=Shader.Find("Universal Render Pipeline/Unlit");
        var shaders=new System.Collections.Generic.List<Shader>();
        if(lit!=null) shaders.Add(lit);
        if(unlit!=null) shaders.Add(unlit);
        GraphicsSettings.alwaysIncludedShaders=shaders.ToArray();
    }

    static void EnsureScene()
    {
        const string path="Assets/Scenes/Main.unity";
        Directory.CreateDirectory("Assets/Scenes");
        if(!File.Exists(path))
        {
            var scene=EditorSceneManager.NewScene(NewSceneSetup.EmptyScene,NewSceneMode.Single);
            EditorSceneManager.SaveScene(scene,path);
        }
        EditorBuildSettings.scenes=new[]{new EditorBuildSettingsScene(path,true)};
    }
}
#endif
