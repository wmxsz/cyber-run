using System.Collections;
using UnityEngine;

public sealed class CyberRunStreetProps : MonoBehaviour
{
    Shader shader;
    Material material;

    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
    static void Install()
    {
        if(FindFirstObjectByType<CyberRunStreetProps>()!=null) return;

        var go=new GameObject("CyberRunStreetProps");
        go.AddComponent<CyberRunStreetProps>();
        DontDestroyOnLoad(go);
    }

    IEnumerator Start()
    {
        yield return null;
        yield return null;

        shader=Shader.Find("CyberRun/Surface");
        if(shader==null) yield break;

        material=new Material(shader);
        material.name="CyberRunStreetShared";
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

            if(index%2==0)
                CreateLamp(root,-1,index);

            if(index%2==1)
                CreateLamp(root,1,index);

            if(index%3==2)
                CreateRoadPylon(root,index);
        }
    }

    void CreateLamp(Transform parent,int side,int seed)
    {
        var root=new GameObject("NeonStreetLamp").transform;
        root.SetParent(parent,false);
        root.localPosition=new Vector3(
            side*4.75f,0f,-12f+(seed%3)*10f);

        Cube(root,"LampPole",
            new Vector3(.09f,3.8f,.09f),
            new Vector3(0,1.9f,0),
            new Color(.025f,.035f,.075f,1f));

        Cube(root,"LampArm",
            new Vector3(.75f,.07f,.07f),
            new Vector3(-side*.32f,3.72f,0),
            new Color(.04f,.08f,.16f,1f));

        Cube(root,"LampHead",
            new Vector3(.22f,.13f,.28f),
            new Vector3(-side*.66f,3.64f,0),
            new Color(1.5f,.06f,3.4f,1f));
    }

    void CreateRoadPylon(Transform parent,int seed)
    {
        float side=(seed&1)==0 ? -1f : 1f;
        var root=new GameObject("RoadPylon").transform;
        root.SetParent(parent,false);
        root.localPosition=new Vector3(
            side*4.45f,.55f,10f);

        Cube(root,"PylonBase",
            new Vector3(.42f,.75f,.42f),
            Vector3.zero,new Color(.018f,.025f,.06f,1f));
        Cube(root,"PylonLight",
            new Vector3(.5f,.035f,.05f),
            new Vector3(0,.31f,0),
            seed%2==0
                ? new Color(.04f,1.4f,4.4f,1f)
                : new Color(1.7f,.05f,3.5f,1f));
    }

    void Cube(Transform parent,string name,
        Vector3 scale,Vector3 position,Color color)
    {
        var g=GameObject.CreatePrimitive(PrimitiveType.Cube);
        g.name=name;
        g.transform.SetParent(parent,false);
        g.transform.localScale=scale;
        g.transform.localPosition=position;

        var renderer=g.GetComponent<Renderer>();
        if(renderer!=null)
        {
            renderer.sharedMaterial=material;
            var block=new MaterialPropertyBlock();
            block.SetColor("_BaseColor",color);
            block.SetFloat("_GlowStrength",.5f);
            block.SetColor("_RimColor",color);
            block.SetFloat("_RimStrength",2.2f);
            block.SetFloat("_PulseSpeed",2.6f);
            renderer.SetPropertyBlock(block);

            renderer.shadowCastingMode=
                UnityEngine.Rendering.ShadowCastingMode.Off;
            renderer.receiveShadows=false;
        }

        var collider=g.GetComponent<Collider>();
        if(collider!=null) Destroy(collider);
    }
}
