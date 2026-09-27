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
        var graphicsSettings=AssetDatabase.LoadAssetAtPath<GraphicsSettings>(
            "ProjectSettings/GraphicsSettings.asset");
        if(graphicsSettings==null) return;

        var serialized=new SerializedObject(graphicsSettings);
        var included=serialized.FindProperty("m_AlwaysIncludedShaders");
        if(included==null||!included.isArray) return;

        var shaders=new List<Shader>();
        for(int i=0;i<included.arraySize;i++)
        {
            var shader=included.GetArrayElementAtIndex(i).objectReferenceValue as Shader;
            if(shader!=null&&!shaders.Contains(shader))
                shaders.Add(shader);
        }

        Add("CyberRun/Surface",shaders);
        Add("CyberRun/City",shaders);
        Add("CyberRun/Unlit",shaders);
        Add("CyberRun/Particle",shaders);
        Add("CyberRun/Road",shaders);
        Add("CyberRun/Hologram",shaders);
        Add("Universal Render Pipeline/Lit",shaders);
        Add("Universal Render Pipeline/Unlit",shaders);

        included.ClearArray();
        for(int i=0;i<shaders.Count;i++)
        {
            included.InsertArrayElementAtIndex(i);
            included.GetArrayElementAtIndex(i).objectReferenceValue=shaders[i];
        }

        serialized.ApplyModifiedPropertiesWithoutUndo();
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
