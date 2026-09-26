using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public sealed class CyberRunNeonWorld : MonoBehaviour
{
    sealed class PulsePart
    {
        public Transform transform;
        public Renderer renderer;
        public Vector3 baseScale;
        public float phase;
        public float scaleAmount;
    }

    readonly List<PulsePart> pulseParts=new();
    readonly List<Transform> segments=new();

    Shader surfaceShader;
    Material sharedMaterial;
    Transform player;
    CyberRunBootstrap bootstrap;
    Transform runnerAura;
    bool initialized;
    readonly MaterialPropertyBlock block=new();

    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
    static void Install()
    {
        if(FindFirstObjectByType<CyberRunNeonWorld>()!=null)
            return;

        var host=new GameObject("CyberRunNeonWorld");
        host.AddComponent<CyberRunNeonWorld>();
        DontDestroyOnLoad(host);
    }

    IEnumerator Start()
    {
        for(int i=0;i<4;i++)
            yield return null;

        bootstrap=FindFirstObjectByType<CyberRunBootstrap>();
        player=GameObject.Find("Runner")?.transform;

        surfaceShader=Shader.Find("CyberRun/Surface");
        if(surfaceShader==null||player==null)
            yield break;

        sharedMaterial=new Material(surfaceShader);
        sharedMaterial.name="CyberRunNeonWorldShared";
        sharedMaterial.enableInstancing=true;

        CacheSegments();
        BuildArchitecture();
        BuildRunnerAura();
        initialized=true;
    }

    void CacheSegments()
    {
        segments.Clear();

        var roots=FindObjectsByType<Transform>(
            FindObjectsInactive.Exclude,
            FindObjectsSortMode.None);

        for(int i=0;i<roots.Length;i++)
        {
            var root=roots[i];
            if(root==null) continue;

            if(root.name.StartsWith(
                "Segment_",System.StringComparison.Ordinal))
                segments.Add(root);
        }

        segments.Sort((a,b)=>a.position.z.CompareTo(b.position.z));
    }

    void BuildArchitecture()
    {
        for(int i=0;i<segments.Count;i++)
        {
            var segment=segments[i];
            if(segment==null) continue;

            int index=GetSegmentIndex(segment.name);

            if(index%3==0)
                CreateNeonGate(segment,index);

            if(index%4==1)
                CreateSkyNeedles(segment,index);

            if(index%3!=2)
                CreateRoadChevrons(segment,index);

            if(index%5==2)
                CreateSideDataRails(segment,index);
        }
    }

    int GetSegmentIndex(string name)
    {
        if(name.StartsWith("Segment_",
            System.StringComparison.Ordinal) &&
           int.TryParse(name.Substring(8),out var value))
            return value;

        return 0;
    }

    void CreateNeonGate(Transform parent,int index)
    {
        var root=new GameObject("NeonGate").transform;
        root.SetParent(parent,false);
        root.localPosition=new Vector3(0,0,11f);

        Color main=(index&1)==0
            ? new Color(.05f,1.55f,5f,1f)
            : new Color(1.8f,.05f,3.9f,1f);

        CreateBar(root,"GateLeft",
            new Vector3(.14f,5.8f,.16f),
            new Vector3(-4.65f,2.9f,0),main,.9f,2.8f);

        CreateBar(root,"GateRight",
            new Vector3(.14f,5.8f,.16f),
            new Vector3(4.65f,2.9f,0),main,.9f,2.8f);

        CreateBar(root,"GateTop",
            new Vector3(9.3f,.14f,.16f),
            new Vector3(0,5.8f,0),main,.75f,3.2f);

        for(int i=0;i<3;i++)
        {
            float x=-2.8f+i*2.8f;
            Color accent=(i&1)==0
                ? new Color(1.7f,.04f,3.8f,1f)
                : new Color(.04f,1.2f,4.4f,1f);

            CreateBar(root,"GateCore_"+i,
                new Vector3(.07f,1.0f,.08f),
                new Vector3(x,5.22f,0),accent,
                .55f,3.8f);
        }
    }

    void CreateSkyNeedles(Transform parent,int index)
    {
        for(int side=-1;side<=1;side+=2)
        {
            Color color=(side<0) == ((index&1)==0)
                ? new Color(.04f,1.35f,4.5f,1f)
                : new Color(1.7f,.05f,3.7f,1f);

            var root=new GameObject(
                "SkyNeedle_"+side).transform;
            root.SetParent(parent,false);
            root.localPosition=new Vector3(
                side*8.1f,0,3.5f);

            CreateBar(root,"Needle",
                new Vector3(.08f,8.5f,.08f),
                new Vector3(0,4.25f,0),
                new Color(.012f,.02f,.05f,1f),
                .08f,1.2f);

            CreateBar(root,"NeedleLight",
                new Vector3(.11f,.85f,.11f),
                new Vector3(0,7.5f,0),
                color,.65f,4.2f);

            CreateBar(root,"NeedleBase",
                new Vector3(.38f,.09f,.38f),
                new Vector3(0,.2f,0),
                color,.5f,3f);
        }
    }

    void CreateRoadChevrons(Transform parent,int index)
    {
        Color color=(index&1)==0
            ? new Color(.03f,.8f,2.7f,1f)
            : new Color(1.15f,.05f,2.5f,1f);

        for(int i=0;i<4;i++)
        {
            float z=-14f+i*9f;
            float side=(i&1)==0 ? -1f : 1f;

            var root=new GameObject(
                "RoadChevron_"+i).transform;
            root.SetParent(parent,false);
            root.localPosition=new Vector3(side*3.65f,.19f,z);
            root.localRotation=Quaternion.Euler(
                0f,side>0 ? 22f : -22f,0f);

            CreateBar(root,"Chevron",
                new Vector3(1.0f,.035f,.055f),
                Vector3.zero,color,.45f,3.5f);
        }
    }

    void CreateSideDataRails(Transform parent,int index)
    {
        Color cyan=new Color(.04f,1.1f,4f,1f);
        Color magenta=new Color(1.65f,.04f,3.5f,1f);

        for(int side=-1;side<=1;side+=2)
        {
            Color color=side<0 ? cyan : magenta;

            var root=new GameObject(
                "SideDataRail_"+side).transform;
            root.SetParent(parent,false);
            root.localPosition=new Vector3(
                side*6.3f,4.25f,0);

            CreateBar(root,"Rail",
                new Vector3(.06f,.06f,31f),
                Vector3.zero,color,.45f,2.4f);

            for(int i=0;i<3;i++)
            {
                CreateBar(root,"RailNode_"+i,
                    new Vector3(.22f,.22f,.08f),
                    new Vector3(0,0,-12f+i*12f),
                    i%2==0 ? color : new Color(
                        .7f,.95f,1f,1f),
                    .8f,4.5f);
            }
        }
    }

    void BuildRunnerAura()
    {
        runnerAura=new GameObject("RunnerNeonAura").transform;
        runnerAura.SetParent(player,false);
        runnerAura.localPosition=new Vector3(0,.05f,0);

        Color[] colors =
        {
            new Color(.04f,1.4f,4.8f,1f),
            new Color(1.8f,.05f,3.7f,1f),
            new Color(.7f,1.05f,4.5f,1f)
        };

        for(int i=0;i<8;i++)
        {
            float angle=i*Mathf.PI*2f/8f;

            var g=GameObject.CreatePrimitive(
                PrimitiveType.Cube);
            g.name="RunnerAuraArc";
            g.transform.SetParent(runnerAura,false);
            g.transform.localPosition=new Vector3(
                Mathf.Cos(angle)*.66f,
                .08f+Mathf.Sin(angle)*.16f,
                Mathf.Sin(angle)*.66f);
            g.transform.localRotation=Quaternion.Euler(
                0f,-angle*Mathf.Rad2Deg,18f);
            g.transform.localScale=
                new Vector3(.12f,.055f,.2f);

            var collider=g.GetComponent<Collider>();
            if(collider!=null)
                Destroy(collider);

            var renderer=g.GetComponent<Renderer>();
            if(renderer!=null)
            {
                renderer.sharedMaterial=sharedMaterial;
                renderer.shadowCastingMode=
                    UnityEngine.Rendering.ShadowCastingMode.Off;
                renderer.receiveShadows=false;
                renderer.lightProbeUsage=
                    UnityEngine.Rendering.LightProbeUsage.Off;
                renderer.reflectionProbeUsage=
                    UnityEngine.Rendering.ReflectionProbeUsage.Off;
            }

            pulseParts.Add(new PulsePart
            {
                transform=g.transform,
                renderer=renderer,
                baseScale=g.transform.localScale,
                phase=angle,
                scaleAmount=.25f
            });
        }

        SetRunnerAuraVisible(false);
    }

    void CreateBar(
        Transform parent,
        string name,
        Vector3 scale,
        Vector3 position,
        Color color,
        float glow,
        float rimStrength)
    {
        var g=GameObject.CreatePrimitive(
            PrimitiveType.Cube);
        g.name=name;
        g.transform.SetParent(parent,false);
        g.transform.localPosition=position;
        g.transform.localScale=scale;

        var collider=g.GetComponent<Collider>();
        if(collider!=null)
            Destroy(collider);

        var renderer=g.GetComponent<Renderer>();
        if(renderer==null)
            return;

        renderer.sharedMaterial=sharedMaterial;

        var block=new MaterialPropertyBlock();
        block.SetColor("_BaseColor",color);
        block.SetFloat("_GlowStrength",glow);
        block.SetColor("_RimColor",color);
        block.SetFloat("_RimStrength",rimStrength);
        block.SetFloat(
            "_PulseSpeed",
            1.7f+(parent.GetInstanceID()%5)*.25f);
        renderer.SetPropertyBlock(block);

        renderer.shadowCastingMode=
            UnityEngine.Rendering.ShadowCastingMode.Off;
        renderer.receiveShadows=false;
        renderer.lightProbeUsage=
            UnityEngine.Rendering.LightProbeUsage.Off;
        renderer.reflectionProbeUsage=
            UnityEngine.Rendering.ReflectionProbeUsage.Off;
    }

    void SetRunnerAuraVisible(bool value)
    {
        if(runnerAura==null) return;

        if(runnerAura.gameObject.activeSelf!=value)
            runnerAura.gameObject.SetActive(value);
    }

    void Update()
    {
        if(!initialized||player==null||bootstrap==null)
            return;

        float speed=bootstrap.CurrentSpeed;
        bool active=speed>=13f&&!bootstrap.IsGameOver;
        SetRunnerAuraVisible(active);

        if(!active)
            return;

        float t=Time.time;

        runnerAura.Rotate(
            0f,115f*Time.deltaTime,0f,
            Space.Self);

        for(int i=0;i<pulseParts.Count;i++)
        {
            var part=pulseParts[i];
            if(part.transform==null) continue;

            float pulse=.65f+
                .35f*Mathf.Sin(
                    t*6f+part.phase*2f);

            part.transform.localScale=
                part.baseScale*(1f+part.scaleAmount*pulse);

            if(part.renderer!=null)
            {
                block.Clear();
                Color color=i%3==0
                    ? new Color(.04f,1.4f,4.8f,1f)
                    : i%3==1
                        ? new Color(1.8f,.05f,3.7f,1f)
                        : new Color(.7f,1.05f,4.5f,1f);

                block.SetColor(
                    "_BaseColor",color*pulse);
                block.SetFloat(
                    "_GlowStrength",.75f+.55f*pulse);
                block.SetColor("_RimColor",color);
                block.SetFloat("_RimStrength",2.8f);
                block.SetFloat("_PulseSpeed",4.5f);
                part.renderer.SetPropertyBlock(block);
            }
        }
    }
}
