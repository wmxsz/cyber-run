using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public sealed class CyberRunHolograms : MonoBehaviour
{
    Shader holoShader;
    readonly List<Transform> holograms=new();
    Material sharedMaterial;

    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
    static void Install()
    {
        if(FindFirstObjectByType<CyberRunHolograms>()!=null) return;

        var go=new GameObject("CyberRunHolograms");
        go.AddComponent<CyberRunHolograms>();
        DontDestroyOnLoad(go);
    }

    IEnumerator Start()
    {
        yield return null;
        yield return null;

        holoShader=Shader.Find("CyberRun/Hologram");
        if(holoShader==null) yield break;

        sharedMaterial=new Material(holoShader);
        sharedMaterial.name="CyberRunHologramShared";

        var roots=FindObjectsByType<Transform>(
            FindObjectsInactive.Exclude,
            FindObjectsSortMode.None);

        for(int i=0;i<roots.Length;i++)
        {
            var root=roots[i];
            if(root==null) continue;
            if(!root.name.StartsWith("Segment_",
                System.StringComparison.Ordinal))
                continue;

            int.TryParse(root.name.Substring(8),out var index);

            if(index%2==0)
                CreateHologram(root,-1,index);

            if(index%3==0)
                CreateHologram(root,1,index+2);
        }
    }

    void CreateHologram(Transform parent,int side,int seed)
    {
        var go=GameObject.CreatePrimitive(PrimitiveType.Quad);
        go.name="HologramBillboard";
        go.transform.SetParent(parent,false);
        go.transform.localPosition=
            new Vector3(side*5.25f,4.1f,-2.5f+(seed%5)*3.8f);
        go.transform.localScale=
            new Vector3(2.6f,1.55f,1f);

        go.transform.localRotation=
            Quaternion.Euler(0f,side>0 ? -90f : 90f,0f);

        var collider=go.GetComponent<Collider>();
        if(collider!=null) Destroy(collider);

        var renderer=go.GetComponent<Renderer>();
        if(renderer!=null)
        {
            renderer.sharedMaterial=sharedMaterial;

            var block=new MaterialPropertyBlock();
            Color color=(seed&1)==0
                ? new Color(.03f,1.7f,4.5f,.62f)
                : new Color(1.7f,.05f,3.8f,.62f);

            block.SetColor("_BaseColor",color);
            block.SetFloat("_ScanSpeed",
                1.7f+(seed%4)*.25f);
            block.SetFloat("_ScanDensity",
                54f+(seed%3)*10f);
            block.SetFloat("_GlowStrength",2.4f);

            renderer.SetPropertyBlock(block);
            renderer.shadowCastingMode=
                UnityEngine.Rendering.ShadowCastingMode.Off;
            renderer.receiveShadows=false;
        }

        holograms.Add(go.transform);
    }

    void Update()
    {
        float t=Time.time;

        for(int i=0;i<holograms.Count;i++)
        {
            var h=holograms[i];
            if(h==null) continue;

            Vector3 p=h.localPosition;
            p.y+=Mathf.Sin(t*1.2f+i*.7f)*.0025f;
            h.localPosition=p;

            float pulse=1f+
                Mathf.Sin(t*2.2f+i*.35f)*.025f;
            h.localScale=new Vector3(
                2.6f*pulse,1.55f/pulse,1f);
        }
    }
}
