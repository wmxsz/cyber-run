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
        PlayerSettings.bundleVersion="0.3.1";
        PlayerSettings.SetApplicationIdentifier(NamedBuildTarget.Android,"com.wmxsz.cyberrun");
        PlayerSettings.Android.targetArchitectures=AndroidArchitecture.ARM64;
        PlayerSettings.SetScriptingBackend(NamedBuildTarget.Android,ScriptingImplementation.IL2CPP);
        PlayerSettings.Android.minSdkVersion=AndroidSdkVersions.AndroidApiLevel26;
        PlayerSettings.Android.targetSdkVersion=AndroidSdkVersions.AndroidApiLevel36;
        PlayerSettings.Android.bundleVersionCode=4;
        EditorUserBuildSettings.buildAppBundle=false;

        PlayerSettings.SetMobileMTRendering(
            NamedBuildTarget.Android,true);
        PlayerSettings.stripUnusedMeshComponents=true;
        PlayerSettings.SetManagedStrippingLevel(
            NamedBuildTarget.Android,
            ManagedStrippingLevel.Medium);
        PlayerSettings.defaultInterfaceOrientation=UIOrientation.Portrait;

        PlayerSettings.colorSpace=ColorSpace.Linear;
        PlayerSettings.SetUseDefaultGraphicsAPIs(
            BuildTarget.Android,false);
        PlayerSettings.SetGraphicsAPIs(
            BuildTarget.Android,
            new[]{GraphicsDeviceType.Vulkan,GraphicsDeviceType.OpenGLES3});
        PlayerSettings.SetIl2CppCodeGeneration(
            NamedBuildTarget.Android,
            UnityEditor.Build.Il2CppCodeGeneration.OptimizeSpeed);
        PlayerSettings.SetIl2CppCompilerConfiguration(
            NamedBuildTarget.Android,
            Il2CppCompilerConfiguration.Master);

        EnsureRenderPipeline();
        EnsureInputHandling();
        EnsureAppIcon();
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

        var projectSurface=Shader.Find("CyberRun/Surface");
        var projectCity=Shader.Find("CyberRun/City");
        var projectRoad=Shader.Find("CyberRun/Road");
        var projectHologram=Shader.Find("CyberRun/Hologram");
        var projectUnlit=Shader.Find("CyberRun/Unlit");
        var projectParticle=Shader.Find("CyberRun/Particle");
        var lit=Shader.Find("Universal Render Pipeline/Lit");
        var unlit=Shader.Find("Universal Render Pipeline/Unlit");
        if(projectSurface!=null && !included.Contains(projectSurface)) included.Add(projectSurface);
        if(projectCity!=null && !included.Contains(projectCity)) included.Add(projectCity);
        if(projectRoad!=null && !included.Contains(projectRoad)) included.Add(projectRoad);
        if(projectHologram!=null && !included.Contains(projectHologram)) included.Add(projectHologram);
        if(projectUnlit!=null && !included.Contains(projectUnlit)) included.Add(projectUnlit);
        if(projectParticle!=null && !included.Contains(projectParticle)) included.Add(projectParticle);
        if(lit!=null && !included.Contains(lit)) included.Add(lit);
        if(unlit!=null && !included.Contains(unlit)) included.Add(unlit);

        GraphicsSettings.alwaysIncludedShaders=included.ToArray();
        EditorUtility.SetDirty(urp);
        AssetDatabase.SaveAssets();
    }

    static void EnsureAppIcon()
    {
        const string dir="Assets/Generated";
        const string path=dir+"/CyberRunIcon.png";
        Directory.CreateDirectory(dir);

        if(!File.Exists(path))
        {
            const int size=1024;
            var tex=new Texture2D(size,size,TextureFormat.RGBA32,false,true);
            var pixels=new Color[size*size];

            for(int y=0;y<size;y++)
            for(int x=0;x<size;x++)
            {
                float nx=(x-size*.5f)/(size*.5f);
                float ny=(y-size*.5f)/(size*.5f);
                float r=Mathf.Sqrt(nx*nx+ny*ny);
                float glow=Mathf.Clamp01(1f-r);

                Color baseColor=Color.Lerp(
                    new Color(.003f,.005f,.018f,1f),
                    new Color(.035f,.02f,.085f,1f),
                    glow*.9f);

                float cyanGlow=Mathf.Exp(
                    -Mathf.Pow((nx+.25f)*7f,2f)
                    -Mathf.Pow((ny-.05f)*7f,2f))*.22f;
                float magentaGlow=Mathf.Exp(
                    -Mathf.Pow((nx-.25f)*7f,2f)
                    -Mathf.Pow((ny+.08f)*7f,2f))*.2f;

                baseColor+=new Color(
                    magentaGlow,cyanGlow*.8f,
                    cyanGlow+magentaGlow,0f);

                pixels[y*size+x]=baseColor;
            }

            tex.SetPixels(pixels);

            DrawIconLine(tex,.18f,.18f,.82f,.18f,new Color(.05f,1f,2.8f,1f),12);
            DrawIconLine(tex,.82f,.18f,.82f,.82f,new Color(1.8f,.05f,3.2f,1f),12);
            DrawIconLine(tex,.82f,.82f,.18f,.82f,new Color(.05f,1f,2.8f,1f),12);
            DrawIconLine(tex,.18f,.82f,.18f,.18f,new Color(1.8f,.05f,3.2f,1f),12);

            // Angular "CR" monogram.
            DrawIconLine(tex,.34f,.68f,.34f,.34f,new Color(.6f,2.4f,5f,1f),34);
            DrawIconLine(tex,.34f,.68f,.54f,.68f,new Color(.6f,2.4f,5f,1f),34);
            DrawIconLine(tex,.34f,.51f,.49f,.51f,new Color(.95f,.15f,3.9f,1f),28);
            DrawIconLine(tex,.34f,.34f,.54f,.34f,new Color(.95f,.15f,3.9f,1f),34);
            DrawIconLine(tex,.58f,.34f,.58f,.68f,new Color(1.9f,.08f,3.6f,1f),34);
            DrawIconLine(tex,.58f,.68f,.78f,.68f,new Color(1.9f,.08f,3.6f,1f),34);
            DrawIconLine(tex,.58f,.51f,.75f,.51f,new Color(1.9f,.08f,3.6f,1f),26);
            DrawIconLine(tex,.58f,.34f,.78f,.34f,new Color(1.9f,.08f,3.6f,1f),34);

            File.WriteAllBytes(path,tex.EncodeToPNG());
            Object.DestroyImmediate(tex);
            AssetDatabase.ImportAsset(path,ImportAssetOptions.ForceUpdate);
        }

        var icon=AssetDatabase.LoadAssetAtPath<Texture2D>(path);
        if(icon==null) return;

        var target=NamedBuildTarget.Android;
        var sizes=PlayerSettings.GetIconSizes(target,IconKind.Application);
        if(sizes==null||sizes.Length==0) return;

        var icons=new Texture2D[sizes.Length];
        for(int i=0;i<icons.Length;i++)
            icons[i]=icon;

        PlayerSettings.SetIcons(target,icons,IconKind.Application);
    }

    static void DrawIconLine(Texture2D tex,float x1,float y1,float x2,float y2,
        Color color,int thickness)
    {
        int size=tex.width;
        float sx=x1*size, sy=y1*size;
        float ex=x2*size, ey=y2*size;
        int steps=Mathf.CeilToInt(
            Mathf.Max(Mathf.Abs(ex-sx),Mathf.Abs(ey-sy)));

        if(steps<1) steps=1;

        for(int i=0;i<=steps;i++)
        {
            float t=i/(float)steps;
            int cx=Mathf.RoundToInt(Mathf.Lerp(sx,ex,t));
            int cy=Mathf.RoundToInt(Mathf.Lerp(sy,ey,t));
            int radius=Mathf.Max(1,thickness/2);

            for(int yy=-radius;yy<=radius;yy++)
            for(int xx=-radius;xx<=radius;xx++)
            {
                if(xx*xx+yy*yy>radius*radius) continue;
                int px=cx+xx, py=cy+yy;
                if(px<0||py<0||px>=size||py>=size) continue;
                tex.SetPixel(px,py,color);
            }
        }
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
