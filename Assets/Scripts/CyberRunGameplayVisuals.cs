using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public sealed class CyberRunGameplayVisuals : MonoBehaviour
{
    Shader surfaceShader;
    Shader particleShader;
    Material neonMaterial;
    Material particleMaterial;
    readonly List<Renderer> pulseRenderers=new();

    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
    static void Install()
    {
        if(FindFirstObjectByType<CyberRunGameplayVisuals>()!=null) return;

        var go=new GameObject("CyberRunGameplayVisuals");
        go.AddComponent<CyberRunGameplayVisuals>();
        DontDestroyOnLoad(go);
    }

    IEnumerator Start()
    {
        yield return null;
        yield return null;

        surfaceShader=Shader.Find("CyberRun/Surface");
        particleShader=Shader.Find("CyberRun/Particle");
        BuildSharedMaterials();

        StyleObstacles();
        StyleCoins();
        StylePowerups();
        StyleTraffic();
    }

    void BuildSharedMaterials()
    {
        if(surfaceShader!=null)
        {
            neonMaterial=new Material(surfaceShader);
            neonMaterial.name="CyberRunGameplayNeon";
            neonMaterial.enableInstancing=true;
        }

        if(particleShader!=null)
        {
            particleMaterial=new Material(particleShader);
            particleMaterial.name="CyberRunGameplayParticle";
        }
    }

    void StyleObstacles()
    {
        var obstacles=FindObjectsByType<Transform>(
            FindObjectsInactive.Exclude,
            FindObjectsSortMode.None);

        for(int i=0;i<obstacles.Length;i++)
        {
            var obstacle=obstacles[i];
            if(obstacle==null) continue;

            bool jump=obstacle.name=="JumpObstacle";
            bool slide=obstacle.name=="SlideGate";
            bool moving=obstacle.name=="MovingLaser";
            if(!jump&&!slide&&!moving) continue;

            Color glow=jump
                ? new Color(2.2f,.04f,.28f,1f)
                : slide
                    ? new Color(1.7f,.05f,3.8f,1f)
                    : new Color(2.4f,.55f,.04f,1f);

            AddBar(obstacle,new Vector3(0,.5f,0),
                jump
                    ? new Vector3(1.02f,.045f,1.07f)
                    : moving
                        ? new Vector3(1.04f,.08f,1.08f)
                        : new Vector3(1.02f,.11f,1.07f),
                glow);

            if(moving)
            {
                AddBar(obstacle,new Vector3(-.48f,0,0),
                    new Vector3(.055f,.8f,1.08f),glow);
                AddBar(obstacle,new Vector3(.48f,0,0),
                    new Vector3(.055f,.8f,1.08f),glow);
            }
            else if(jump)
            {
                AddBar(obstacle,new Vector3(-.47f,0,0),
                    new Vector3(.045f,.85f,1.07f),glow);
                AddBar(obstacle,new Vector3(.47f,0,0),
                    new Vector3(.045f,.85f,1.07f),glow);
            }
            else
            {
                AddBar(obstacle,new Vector3(-.49f,-.62f,0),
                    new Vector3(.055f,1.25f,.09f),glow);
                AddBar(obstacle,new Vector3(.49f,-.62f,0),
                    new Vector3(.055f,1.25f,.09f),glow);
            }
        }
    }

    void StyleCoins()
    {
        var coins=FindObjectsByType<Transform>(
            FindObjectsInactive.Exclude,
            FindObjectsSortMode.None);

        for(int i=0;i<coins.Length;i++)
        {
            var coin=coins[i];
            if(coin==null||coin.name!="Coin") continue;

            var glow=CreatePrimitiveChild(
                coin,"CoinHalo",PrimitiveType.Cylinder);

            glow.transform.localPosition=Vector3.zero;
            glow.transform.localRotation=Quaternion.identity;
            glow.transform.localScale=new Vector3(1.32f,.035f,1.32f);
            Apply(glow.GetComponent<Renderer>(),
                new Color(2.5f,.9f,.04f,1f),
                new Color(.05f,1.3f,4f,1f),
                3f);

            var core=CreatePrimitiveChild(
                coin,"CoinCore",PrimitiveType.Sphere);

            core.transform.localPosition=new Vector3(0,0,.03f);
            core.transform.localScale=Vector3.one*.28f;
            Apply(core.GetComponent<Renderer>(),
                new Color(2.2f,.45f,.02f,1f),
                new Color(2.2f,.1f,.02f,1f),
                2.2f);
        }
    }

    void StylePowerups()
    {
        var powerups=FindObjectsByType<Transform>(
            FindObjectsInactive.Exclude,
            FindObjectsSortMode.None);

        for(int i=0;i<powerups.Length;i++)
        {
            var p=powerups[i];
            if(p==null) continue;

            Color glow;
            if(p.name=="OverdriveCore")
                glow=new Color(.08f,1.8f,5f,1f);
            else if(p.name=="MagnetCore")
                glow=new Color(2f,.06f,3.8f,1f);
            else if(p.name=="ShieldCore")
                glow=new Color(2.8f,1.4f,.04f,1f);
            else
                continue;

            for(int ring=0;ring<3;ring++)
            {
                float angle=ring*120f;
                var bar=CreatePrimitiveChild(
                    p,"PowerRing_"+ring,PrimitiveType.Cube);

                bar.transform.localPosition=Vector3.zero;
                bar.transform.localRotation=
                    Quaternion.Euler(0f,angle,18f);
                bar.transform.localScale=
                    new Vector3(.07f,.55f,.07f);

                Apply(bar.GetComponent<Renderer>(),
                    glow,glow,2.8f+ring*.3f);
            }
        }
    }

    void StyleTraffic()
    {
        var traffic=FindObjectsByType<Transform>(
            FindObjectsInactive.Exclude,
            FindObjectsSortMode.None);

        for(int i=0;i<traffic.Length;i++)
        {
            var t=traffic[i];
            if(t==null) continue;

            if(t.name=="HoverCar")
            {
                AddBar(t,new Vector3(0,.26f,1.94f),
                    new Vector3(.8f,.045f,.045f),
                    new Color(1.9f,.05f,.75f,1f));
                AddBar(t,new Vector3(0,.26f,-1.94f),
                    new Vector3(.8f,.045f,.045f),
                    new Color(.05f,1.4f,4.2f,1f));
            }
            else if(t.name=="SkyDrone")
            {
                AddBar(t,new Vector3(0,-.13f,0),
                    new Vector3(.95f,.035f,.035f),
                    new Color(.05f,1.2f,4.2f,1f));
            }
        }
    }

    GameObject CreatePrimitiveChild(
        Transform parent,string name,PrimitiveType type)
    {
        var g=GameObject.CreatePrimitive(type);
        g.name=name;
        g.transform.SetParent(parent,false);

        var collider=g.GetComponent<Collider>();
        if(collider!=null) Destroy(collider);

        return g;
    }

    void AddBar(
        Transform parent,Vector3 position,
        Vector3 scale,Color glow)
    {
        var g=CreatePrimitiveChild(
            parent,"NeonDetail",PrimitiveType.Cube);

        g.transform.localPosition=position;
        g.transform.localScale=scale;
        Apply(g.GetComponent<Renderer>(),
            glow,glow,2.8f);
    }

    void Apply(Renderer renderer,
        Color baseColor,Color rimColor,float strength)
    {
        if(renderer==null) return;

        if(neonMaterial==null) return;

        renderer.sharedMaterial=neonMaterial;

        var block=new MaterialPropertyBlock();
        block.SetColor("_BaseColor",baseColor);
        block.SetFloat("_GlowStrength",.7f);
        block.SetColor("_RimColor",rimColor);
        block.SetFloat("_RimStrength",strength);
        block.SetFloat("_PulseSpeed",3.4f);
        renderer.SetPropertyBlock(block);

        renderer.shadowCastingMode=
            UnityEngine.Rendering.ShadowCastingMode.Off;
        renderer.receiveShadows=false;
        renderer.lightProbeUsage=
            UnityEngine.Rendering.LightProbeUsage.Off;
        renderer.reflectionProbeUsage=
            UnityEngine.Rendering.ReflectionProbeUsage.Off;
    }
}
