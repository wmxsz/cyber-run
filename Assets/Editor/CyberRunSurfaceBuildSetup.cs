#if UNITY_EDITOR
using System.Collections.Generic;
using UnityEditor;
using UnityEngine;
using UnityEngine.Rendering;

[InitializeOnLoad]
public static class CyberRunSurfaceBuildSetup
{
    static CyberRunSurfaceBuildSetup()
    {
        EnsureIncludedShaders();
    }

    static void EnsureIncludedShaders()
    {
        var included=new List<Shader>();
        var current=GraphicsSettings.alwaysIncludedShaders;

        if(current!=null)
        {
            for(int i=0;i<current.Length;i++)
                if(current[i]!=null && !included.Contains(current[i]))
                    included.Add(current[i]);
        }

        Add("CyberRun/Surface",included);
        Add("CyberRun/Unlit",included);
        Add("CyberRun/Particle",included);
        Add("Universal Render Pipeline/Lit",included);
        Add("Universal Render Pipeline/Unlit",included);

        GraphicsSettings.alwaysIncludedShaders=included.ToArray();
        AssetDatabase.SaveAssets();
    }

    static void Add(string shaderName,List<Shader> list)
    {
        var shader=Shader.Find(shaderName);
        if(shader!=null&&!list.Contains(shader))
            list.Add(shader);
    }
}
#endif
