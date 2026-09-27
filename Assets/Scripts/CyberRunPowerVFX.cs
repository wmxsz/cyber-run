using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public sealed class CyberRunPowerVFX : MonoBehaviour
{
    CyberRunContentSystems content;
    Transform player;
    Shader surfaceShader;
    Material sharedMaterial;

    sealed class Arc
    {
        public Transform transform;
        public Renderer renderer;
        public Color color;
        public float phase;
    }

    readonly List<Arc> arcs=new();
    readonly MaterialPropertyBlock block=new();

    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
    static void Install()
    {
        if(FindAnyObjectByType<CyberRunPowerVFX>()!=null) return;

        var go=new GameObject("CyberRunPowerVFX");
        go.AddComponent<CyberRunPowerVFX>();
        DontDestroyOnLoad(go);
    }

    IEnumerator Start()
    {
        yield return null;
        yield return null;
        yield return null;

        content=FindAnyObjectByType<CyberRunContentSystems>();
        player=GameObject.Find("Runner")?.transform;

        if(player==null||content==null)
            yield break;

        surfaceShader=Shader.Find("CyberRun/Surface");
        if(surfaceShader!=null)
        {
            sharedMaterial=new Material(surfaceShader);
            sharedMaterial.name="CyberRunPowerShared";
            sharedMaterial.enableInstancing=true;
        }

        CreateArcs(
            new Color(.05f,1.7f,5f,1f),
            12,.68f,.055f,0f);
        CreateArcs(
            new Color(1.8f,.05f,4f,1f),
            8,.54f,.045f,Mathf.PI/4f);
        CreateArcs(
            new Color(2.7f,1.2f,.04f,1f),
            10,.78f,.04f,Mathf.PI/10f);

        SetVisible(false,false,false);
    }

    void CreateArcs(
        Color color,int count,float radius,float size,float phaseOffset)
    {
        var root=new GameObject("PowerRing");
        root.transform.SetParent(player,false);
        root.transform.localPosition=new Vector3(0,.05f,0);

        for(int i=0;i<count;i++)
        {
            float angle=phaseOffset+
                i*Mathf.PI*2f/count;

            var g=GameObject.CreatePrimitive(PrimitiveType.Cube);
            g.name="PowerArc";
            g.transform.SetParent(root.transform,false);
            g.transform.localPosition=
                new Vector3(
                    Mathf.Cos(angle)*radius,
                    Mathf.Sin(angle)*.16f+.18f,
                    Mathf.Sin(angle)*radius);
            g.transform.localRotation=
                Quaternion.Euler(
                    0f,
                    -angle*Mathf.Rad2Deg,
                    24f);
            g.transform.localScale=
                new Vector3(size,.055f,.22f);

            var col=g.GetComponent<Collider>();
            if(col!=null) Destroy(col);

            var renderer=g.GetComponent<Renderer>();
            if(renderer!=null && sharedMaterial!=null)
            {
                renderer.sharedMaterial=sharedMaterial;
                renderer.shadowCastingMode=
                    UnityEngine.Rendering.ShadowCastingMode.Off;
                renderer.receiveShadows=false;
            }

            arcs.Add(new Arc
            {
                transform=g.transform,
                renderer=renderer,
                color=color,
                phase=angle
            });
        }
    }

    void Update()
    {
        if(content==null||player==null) return;

        bool overdrive=content.IsOverdriveActive;
        bool magnet=content.IsMagnetActive;
        bool shield=content.IsShieldActive;

        SetVisible(overdrive,magnet,shield);

        if(!overdrive&&!magnet&&!shield)
            return;

        float t=Time.time;

        for(int i=0;i<arcs.Count;i++)
        {
            var arc=arcs[i];
            if(arc.transform==null) continue;

            int group=i<12 ? 0 : i<20 ? 1 : 2;
            float speed=group==0 ? 1.6f :
                group==1 ? -2.2f : 1.05f;

            arc.transform.Rotate(
                0f,speed*60f*Time.deltaTime,0f,
                Space.Self);

            float pulse=.7f+
                .3f*Mathf.Sin(t*5f+arc.phase*2f);

            if(arc.renderer!=null)
            {
                block.Clear();
                block.SetColor("_BaseColor",arc.color*pulse);
                block.SetFloat("_GlowStrength",
                    group==2 ? 1.2f : .9f);
                block.SetColor("_RimColor",arc.color);
                block.SetFloat("_RimStrength",2.4f);
                block.SetFloat("_PulseSpeed",4.2f);
                arc.renderer.SetPropertyBlock(block);
            }
        }
    }

    void SetVisible(bool overdrive,bool magnet,bool shield)
    {
        int overdriveCount=12;
        int magnetCount=8;
        for(int i=0;i<arcs.Count;i++)
        {
            bool visible =
                i<overdriveCount ? overdrive :
                i<overdriveCount+magnetCount ? magnet :
                shield;

            if(arcs[i].transform!=null &&
               arcs[i].transform.gameObject.activeSelf!=visible)
                arcs[i].transform.gameObject.SetActive(visible);
        }
    }
}
