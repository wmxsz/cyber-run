#if UNITY_EDITOR
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using System.IO;
using System.Reflection;
using UnityEditor.Build;
using UnityEditor.Build.Profile;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

[InitializeOnLoad]
public static class CyberRunBuildSetup
{
    static CyberRunBuildSetup()
    {
        ConfigureProject();
    }

    public static void ConfigureProject()
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
        EnsureInputHandling();
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
        }

        GraphicsSettings.defaultRenderPipeline=urp;
        QualitySettings.renderPipeline=urp;

        var included=new System.Collections.Generic.List<Shader>();
        var existing=GraphicsSettings.alwaysIncludedShaders;
        if(existing!=null)
        {
            for(int i=0;i<existing.Length;i++)
                if(existing[i]!=null && !included.Contains(existing[i]))
                    included.Add(existing[i]);
        }

        var lit=Shader.Find("Universal Render Pipeline/Lit");
        var unlit=Shader.Find("Universal Render Pipeline/Unlit");
        if(lit!=null && !included.Contains(lit)) included.Add(lit);
        if(unlit!=null && !included.Contains(unlit)) included.Add(unlit);

        GraphicsSettings.alwaysIncludedShaders=included.ToArray();
        EditorUtility.SetDirty(urp);
        AssetDatabase.SaveAssets();
    }

    static void EnsureInputHandling()
    {
        SetActiveInputHandler(GetGlobalPlayerSettings());

        var profile=BuildProfile.GetActiveBuildProfile();
        if(profile==null) return;

        var profileField=typeof(BuildProfile).GetField(
            "m_PlayerSettings",
            BindingFlags.Instance|BindingFlags.NonPublic);

        var profileSettings=profileField?.GetValue(profile) as PlayerSettings;
        if(profileSettings!=null)
            SetActiveInputHandler(profileSettings);
    }

    static PlayerSettings GetGlobalPlayerSettings()
    {
        var field=typeof(BuildProfile).GetField(
            "s_GlobalPlayerSettings",
            BindingFlags.Static|BindingFlags.NonPublic);

        var global=field?.GetValue(null) as PlayerSettings;
        if(global!=null) return global;

        var all=Resources.FindObjectsOfTypeAll<PlayerSettings>();
        return all!=null && all.Length>0 ? all[0] : null;
    }

    static void SetActiveInputHandler(PlayerSettings settings)
    {
        if(settings==null) return;

        var serialized=new SerializedObject(settings);
        var property=serialized.FindProperty("activeInputHandler");
        if(property==null)
        {
            Debug.LogError("CyberRun: cannot find PlayerSettings.activeInputHandler.");
            return;
        }

        // 0 = Old Input Manager, 1 = New Input System, 2 = Both.
        if(property.intValue!=2)
        {
            property.intValue=2;
            serialized.ApplyModifiedProperties();
        }
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
