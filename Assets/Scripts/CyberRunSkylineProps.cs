using System;
using System.Collections;
using UnityEngine;

public sealed class CyberRunSkylineProps : MonoBehaviour
{
    Shader cityShader;
    Material material;

    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
    static void Install()
    {
        if(FindFirstObjectByType<CyberRunSkylineProps>()!=null) return;

        var go=new GameObject("CyberRunSkylineProps");
        go.AddComponent<CyberRunSkylineProps>();
        DontDestroyOnLoad(go);
    }

    IEnumerator Start()
    {
        yield return null;
        yield return null;

        cityShader=Shader.Find("CyberRun/City");
        if(cityShader==null) yield break;

        material=new Material(cityShader);
        material.name="CyberRunSkylineShared";
        material.enableInstancing=true;

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

            int index=0;
            int.TryParse(root.name.Substring(8),out index);

            CreateTower(root,-1,index,0);
            CreateTower(root,1,index,1);
            if(index%2==0)
                CreateTower(root,-1,index,2);
            if(index%3==0)
                CreateTower(root,1,index,3);
        }
    }

    void CreateTower(Transform parent,int side,int seed,int variant)
    {
        float x=side*(14.5f+(seed+variant)%4*3.6f);
        float z=-14f+variant*9f+(seed%3)*2.5f;
        float h=10f+((seed*17+variant*7)%12);
        float w=2.4f+variant*.35f;
        float d=5.5f+(seed%2)*1.2f;

        var g=GameObject.CreatePrimitive(PrimitiveType.Cube);
        g.name="SkylineTower";
        g.transform.SetParent(parent,false);
        g.transform.localPosition=new Vector3(x,h*.5f,z);
        g.transform.localScale=new Vector3(w,h,d);

        var renderer=g.GetComponent<Renderer>();
        if(renderer!=null)
        {
            renderer.sharedMaterial=material;

            var block=new MaterialPropertyBlock();
            Color baseColor=(variant&1)==0
                ? new Color(.012f,.018f,.045f,1f)
                : new Color(.022f,.012f,.05f,1f);
            Color accent=(variant&1)==0
                ? new Color(.03f,1.05f,3.4f,1f)
                : new Color(1.4f,.04f,3.2f,1f);

            block.SetColor("_BaseColor",baseColor);
            block.SetColor("_WindowColor",accent);
            block.SetFloat("_WindowDensity",
                1.0f+(seed%3)*.18f);
            block.SetFloat("_WindowStrength",1.1f);
            block.SetColor("_RimColor",accent);
            block.SetFloat("_RimStrength",1.0f);
            block.SetFloat("_PulseSpeed",.7f+(variant*.15f));
            renderer.SetPropertyBlock(block);

            renderer.shadowCastingMode=
                UnityEngine.Rendering.ShadowCastingMode.Off;
            renderer.receiveShadows=false;
        }

        var collider=g.GetComponent<Collider>();
        if(collider!=null) Destroy(collider);

        var cap=GameObject.CreatePrimitive(PrimitiveType.Cube);
        cap.name="SkylineBeacon";
        cap.transform.SetParent(parent,false);
        cap.transform.localPosition=
            new Vector3(x,h+.05f,z);
        cap.transform.localScale=
            new Vector3(w*.55f,.08f,d*.35f);

        var capRenderer=cap.GetComponent<Renderer>();
        if(capRenderer!=null)
        {
            capRenderer.sharedMaterial=material;
            var block=new MaterialPropertyBlock();
            block.SetColor("_BaseColor",accent);
            block.SetColor("_WindowColor",accent);
            block.SetFloat("_WindowStrength",2f);
            block.SetColor("_RimColor",accent);
            block.SetFloat("_RimStrength",2.2f);
            block.SetFloat("_PulseSpeed",3.5f);
            capRenderer.SetPropertyBlock(block);
            capRenderer.shadowCastingMode=
                UnityEngine.Rendering.ShadowCastingMode.Off;
            capRenderer.receiveShadows=false;
        }

        var capCollider=cap.GetComponent<Collider>();
        if(capCollider!=null) Destroy(capCollider);
    }
}
