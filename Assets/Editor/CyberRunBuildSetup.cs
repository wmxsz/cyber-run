#if UNITY_EDITOR
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using System.IO;
using UnityEditor.Build;

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

        EnsureScene();
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
