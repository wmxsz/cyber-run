#if UNITY_EDITOR
using System.Collections.Generic;
using UnityEditor;
using UnityEngine;
using UnityEngine.Rendering;

[InitializeOnLoad]
public static class CyberRunShaderBuildKeeper
{
    static CyberRunShaderBuildKeeper()
    {
        var shaders=new List<Shader>();
        var existing=GraphicsSettings.alwaysIncludedShaders;

        if(existing!=null)
        {
            for(int i=0;i<existing.Length;i++)
                if(existing[i]!=null&&!shaders.Contains(existing[i]))
                    shaders.Add(existing[i]);
        }

        Add("CyberRun/Surface",shaders);
        Add("CyberRun/City",shaders);
        Add("CyberRun/Unlit",shaders);
        Add("CyberRun/Particle",shaders);
        Add("Universal Render Pipeline/Lit",shaders);
        Add("Universal Render Pipeline/Unlit",shaders);

        GraphicsSettings.alwaysIncludedShaders=shaders.ToArray();
        AssetDatabase.SaveAssets();
    }

    static void Add(string shaderName,List<Shader> shaders)
    {
        var shader=Shader.Find(shaderName);
        if(shader!=null&&!shaders.Contains(shader))
            shaders.Add(shader);
    }
}
#endif
