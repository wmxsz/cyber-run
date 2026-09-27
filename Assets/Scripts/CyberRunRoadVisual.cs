using System.Collections;
using UnityEngine;

public sealed class CyberRunRoadVisual : MonoBehaviour
{
    Shader roadShader;
    Material sharedMaterial;

    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
    static void Install()
    {
        if(FindAnyObjectByType<CyberRunRoadVisual>()!=null) return;

        var go=new GameObject("CyberRunRoadVisual");
        go.AddComponent<CyberRunRoadVisual>();
        DontDestroyOnLoad(go);
    }

    IEnumerator Start()
    {
        yield return null;
        yield return null;

        roadShader=Shader.Find("CyberRun/Road");
        if(roadShader==null) yield break;

        sharedMaterial=new Material(roadShader);
        sharedMaterial.name="CyberRunRoadShared";
        sharedMaterial.enableInstancing=true;

        var renderers=FindObjectsByType<Renderer>(
            FindObjectsInactive.Exclude,
            FindObjectsSortMode.None);

        for(int i=0;i<renderers.Length;i++)
        {
            var r=renderers[i];
            if(r==null||r.gameObject.name!="Road") continue;

            r.sharedMaterial=sharedMaterial;

            var block=new MaterialPropertyBlock();
            Color grid=(i&1)==0
                ? new Color(.02f,.7f,2.1f,1f)
                : new Color(.62f,.05f,1.25f,1f);

            block.SetColor("_BaseColor",new Color(
                .006f,.01f,.027f,1f));
            block.SetColor("_GridColor",grid);
            block.SetFloat("_GridDensity",.45f);
            block.SetFloat("_GridStrength",.7f);
            block.SetFloat("_FlowSpeed",.22f);
            block.SetFloat("_FlowStrength",.65f);
            block.SetFloat("_ReflectStrength",.9f);

            r.SetPropertyBlock(block);
            r.shadowCastingMode=
                UnityEngine.Rendering.ShadowCastingMode.Off;
            r.receiveShadows=false;
        }
    }
}
