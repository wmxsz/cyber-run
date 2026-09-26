using System.Collections;
using UnityEngine;

public sealed class CyberRunActionVFX : MonoBehaviour
{
    Transform player;
    ParticleSystem laneBurst;
    ParticleSystem jumpBurst;
    ParticleSystem landingBurst;
    ParticleSystem slideSparks;
    float lastGroundY=1.1f;
    float lastX;
    float laneFlash;
    float slideFlash;

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

        laneBurst=CreateBurst("ActionBurst",new Color(.05f,1.45f,4.5f,.9f),5,.16f,.9f,2.4f);
        jumpBurst=CreateBurst("JumpBurst",new Color(.95f,.08f,3.8f,.85f),8,.2f,1.15f,2.8f);
        landingBurst=CreateBurst("LandingBurst",new Color(.05f,1.5f,4.8f,.9f),12,.25f,1.4f,3.1f);
        slideSparks=CreateBurst("SlideSparks",new Color(1.8f,.08f,3.8f,.85f),9,.18f,1.8f,3.6f);

        lastX=player.position.x;
        lastGroundY=player.position.y;
    }

    ParticleSystem CreateBurst(string name,Color color,int maxParticles,
        float lifetime,float speed,float size)
    {
        var go=new GameObject(name);
        go.transform.SetParent(player,false);
        go.transform.localPosition=new Vector3(0,-.85f,0);

        var ps=go.AddComponent<ParticleSystem>();
        var main=ps.main;
        main.loop=false;
        main.playOnAwake=false;
        main.startLifetime=new ParticleSystem.MinMaxCurve(lifetime*.7f,lifetime);
        main.startSpeed=new ParticleSystem.MinMaxCurve(speed*.55f,speed);
        main.startSize=new ParticleSystem.MinMaxCurve(size*.018f,size*.04f);
        main.startColor=color;
        main.maxParticles=maxParticles;
        main.simulationSpace=ParticleSystemSimulationSpace.World;
        main.stopAction=ParticleSystemStopAction.None;

        var emission=ps.emission;
        emission.enabled=false;

        var shape=ps.shape;
        shape.shapeType=ParticleSystemShapeType.Circle;
        shape.radius=.12f;

        var velocity=ps.velocityOverLifetime;
        velocity.enabled=true;
        velocity.space=ParticleSystemSimulationSpace.Local;
        velocity.radial=new ParticleSystem.MinMaxCurve(.2f,.75f);

        var sizeOverLifetime=ps.sizeOverLifetime;
        sizeOverLifetime.enabled=true;
        var sizeCurve=new AnimationCurve(
            new Keyframe(0f,.45f),
            new Keyframe(.15f,1f),
            new Keyframe(1f,0f));
        sizeOverLifetime.size=new ParticleSystem.MinMaxCurve(1f,sizeCurve);

        var colorOverLifetime=ps.colorOverLifetime;
        colorOverLifetime.enabled=true;
        var gradient=new Gradient();
        gradient.SetKeys(
            new[]
            {
                new GradientColorKey(Color.white,0f),
                new GradientColorKey(color,1f)
            },
            new[]
            {
                new GradientAlphaKey(color.a,0f),
                new GradientAlphaKey(0f,1f)
            });
        colorOverLifetime.color=new ParticleSystem.MinMaxGradient(gradient);

        var renderer=ps.GetComponent<ParticleSystemRenderer>();
        renderer.renderMode=ParticleSystemRenderMode.Billboard;
        renderer.shadowCastingMode=
            UnityEngine.Rendering.ShadowCastingMode.Off;
        renderer.receiveShadows=false;
        if(material!=null)
            renderer.sharedMaterial=material;

        return ps;
    }

    void Update()
    {
        if(player==null) return;

        Vector3 p=player.position;
        bool grounded=p.y<=1.12f;
        float dx=p.x-lastX;

        if(Mathf.Abs(dx)>.22f&&laneFlash<=0f)
            EmitLaneBurst(p,Mathf.Sign(dx));

        if(!grounded&&lastGroundY<=1.12f)
            EmitJumpStart(p);

        if(grounded&&lastGroundY>1.18f)
            EmitLanding(p);

        bool sliding=player.localScale.y<.99f;
        if(sliding&&slideFlash<=0f)
        {
            EmitSlideSparks(p);
            slideFlash=.12f;
        }

        laneFlash=Mathf.Max(0f,laneFlash-Time.unscaledDeltaTime);
        slideFlash=Mathf.Max(0f,slideFlash-Time.unscaledDeltaTime);

        lastX=p.x;
        lastGroundY=p.y;
    }

    void EmitLaneBurst(Vector3 p,float direction)
    {
        laneBurst.transform.position=
            p+new Vector3(-direction*.42f,-.92f,0);
        laneBurst.transform.rotation=
            Quaternion.Euler(0f,direction>0f?90f:-90f,0f);
        laneBurst.Emit(5);
        laneFlash=.12f;
    }

    void EmitJumpStart(Vector3 p)
    {
        jumpBurst.transform.position=p+Vector3.down*.86f;
        jumpBurst.transform.rotation=Quaternion.identity;
        jumpBurst.Emit(8);
    }

    void EmitLanding(Vector3 p)
    {
        landingBurst.transform.position=p+Vector3.down*.86f;
        landingBurst.transform.rotation=Quaternion.identity;
        landingBurst.Emit(12);
    }

    void EmitSlideSparks(Vector3 p)
    {
        slideSparks.transform.position=p+new Vector3(0,-.72f,-.18f);
        slideSparks.transform.rotation=Quaternion.Euler(0f,90f,0f);
        slideSparks.Emit(4);
    }
}
