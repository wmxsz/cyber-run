using System.Collections;
using UnityEngine;

public sealed class CyberRunActionVFX : MonoBehaviour
{
    Transform player;
    ParticleSystem burst;
    Vector3 lastPosition;
    float lastGroundY=1.1f;
    float laneFlash;

    Shader particleShader;
    Material material;

    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
    static void Install()
    {
        if(FindFirstObjectByType<CyberRunActionVFX>()!=null) return;

        var go=new GameObject("CyberRunActionVFX");
        go.AddComponent<CyberRunActionVFX>();
        DontDestroyOnLoad(go);
    }

    IEnumerator Start()
    {
        yield return null;
        yield return null;

        player=GameObject.Find("Runner")?.transform;
        if(player==null) yield break;

        particleShader=Shader.Find("CyberRun/Particle");
        if(particleShader!=null)
        {
            material=new Material(particleShader);
            material.name="CyberRunActionParticle";
        }

        var go=new GameObject("ActionBurst");
        go.transform.SetParent(player,false);
        go.transform.localPosition=new Vector3(0,-.9f,0);
        burst=go.AddComponent<ParticleSystem>();

        var main=burst.main;
        main.loop=false;
        main.startLifetime=.22f;
        main.startSpeed=new ParticleSystem.MinMaxCurve(.7f,2.1f);
        main.startSize=new ParticleSystem.MinMaxCurve(.018f,.06f);
        main.startColor=new Color(.05f,1.4f,4f,.6f);
        main.maxParticles=36;
        main.simulationSpace=ParticleSystemSimulationSpace.World;

        var emission=burst.emission;
        emission.enabled=false;

        var shape=burst.shape;
        shape.shapeType=ParticleSystemShapeType.Circle;
        shape.radius=.18f;

        var renderer=burst.GetComponent<ParticleSystemRenderer>();
        renderer.renderMode=ParticleSystemRenderMode.Billboard;
        renderer.shadowCastingMode=
            UnityEngine.Rendering.ShadowCastingMode.Off;
        renderer.receiveShadows=false;
        if(material!=null) renderer.sharedMaterial=material;

        lastPosition=player.position;
        lastGroundY=player.position.y;
    }

    void Update()
    {
        if(player==null||burst==null) return;

        Vector3 p=player.position;
        bool grounded=p.y<=1.12f;

        if(lastPosition.x!=p.x)
        {
            float dx=Mathf.Abs(p.x-lastPosition.x);
            if(dx>.22f&&laneFlash<=0f)
                EmitLaneBurst(p,Mathf.Sign(p.x-lastPosition.x));
        }

        if(!grounded && lastGroundY<=1.12f)
        {
            EmitJumpStart(p);
        }

        if(grounded && lastGroundY>1.18f)
        {
            EmitLanding(p);
        }

        if(laneFlash>0f)
            laneFlash-=Time.unscaledDeltaTime;

        lastPosition=p;
        lastGroundY=p.y;
    }

    void EmitLaneBurst(Vector3 p,float direction)
    {
        burst.transform.position=
            p+new Vector3(-direction*.35f,-.92f,0);
        burst.Emit(5);
        laneFlash=.12f;
    }

    void EmitJumpStart(Vector3 p)
    {
        burst.transform.position=p+Vector3.down*.85f;
        burst.Emit(7);
    }

    void EmitLanding(Vector3 p)
    {
        burst.transform.position=p+Vector3.down*.86f;
        burst.Emit(11);
    }
}
