using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.InputSystem;

public sealed class CyberRunContentSystems : MonoBehaviour
{
    const float LaneWidth=2.7f;
    const float SegmentLength=36f;
    const float PlayerGroundY=1.1f;
    const int CoinsPerSegment=4;

    sealed class SegmentData
    {
        public Transform root;
        public readonly List<GameObject> coins=new();
        public readonly List<Vector3> coinSpawnPositions=new();
        public readonly List<GameObject> powerups=new();
        public readonly List<Transform> vehicles=new();
        public readonly List<Collider> obstacles=new();
        public Renderer[] renderers;
        public int cycle;
        public float lastZ;
    }

    readonly List<SegmentData> data=new();
    readonly List<Transform> segmentRoots=new();
    readonly Dictionary<int,Material> materialCache=new();
    readonly Dictionary<Collider,float> nearMissMarker=new();
    Shader projectShader;
    CyberRunBootstrap bootstrap;

    Transform player;
    Camera cam;
    ParticleSystem trail;
    ParticleSystem collectBurst;
    ParticleSystem rain;
    ParticleSystem speedLines;
    AudioSource sfx;
    AudioSource ambience;
    readonly List<Transform> drones=new();
    AudioClip coinClip,jumpClip,slideClip,laneClip,powerupClip,crashClip;

    long bonusScore;
    int combo;
    float comboTimer;
    float runStartDistance;
    float lastPlayerY;
    float lastPlayerX;
    float lastCameraX;
    float lastWorldZ;
    float lastBootstrapDistance;
    bool lastGameOver;
    bool wasSliding;
    bool paused;
    bool initialized;
    bool started;
    bool appAutoPaused;
    float introTimer=4f;
    int coinCount;
    float overdriveTimer;
    float magnetTimer;
    float shieldTimer;
    long bestScore;
    float overdriveFlash;
    Color flashColor=new Color(.05f,.85f,1f,1f);

    GUIStyle hudStyle;
    GUIStyle subStyle;
    GUIStyle buttonStyle;
    GUIStyle panelStyle;

    float hudRefreshTimer;
    string hudMeters="";
    string hudScore="";
    string hudData="";
    string hudCombo="";
    string hudOverdrive="";
    string hudMagnet="";
    string hudShield="";
    string hudSpeed="";
    string hudSector="";
    Color hudAccent=new Color(.55f,.95f,1f,1f);

    public bool IsOverdriveActive=>overdriveTimer>0f;
    public bool IsMagnetActive=>magnetTimer>0f;
    public bool IsShieldActive=>shieldTimer>0f;

    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
    static void Install()
    {
        var existing=FindFirstObjectByType<CyberRunContentSystems>();
        if(existing!=null) return;
        var host=GameObject.Find("CyberRun") ?? new GameObject("CyberRunContent");
        host.AddComponent<CyberRunContentSystems>();
    }

    IEnumerator Start()
    {
        yield return WaitForBootstrap();
        SetupEnvironment();
        SetupAudio();
        SetupParticleTrail();
        SetupCollectBurst();
        SetupRain();
        SetupSpeedLines();
        SetupGuiStyles();

        started=false;
        paused=false;
        appAutoPaused=false;
        Time.timeScale=0f;
        DontDestroyOnLoad(gameObject);
        UpdateHudCache();
        initialized=true;
    }

    IEnumerator WaitForBootstrap()
    {
        for(int i=0;i<120;i++)
        {
            player=GameObject.Find("Runner")?.transform;
            cam=Camera.main ?? GameObject.Find("Main Camera")?.GetComponent<Camera>();
            if(player!=null) break;
            yield return null;
        }

        if(player==null) yield break;

        bootstrap=GetComponent<CyberRunBootstrap>();
        if(bootstrap==null)
            bootstrap=FindFirstObjectByType<CyberRunBootstrap>();

        runStartDistance=bootstrap!=null ? bootstrap.Distance : 0f;
        lastBootstrapDistance=runStartDistance;
        lastPlayerY=player.position.y;
        lastPlayerX=player.position.x;
        lastCameraX=player.position.x;
        lastWorldZ=player.position.z;

        lastGameOver=bootstrap!=null && bootstrap.IsGameOver;
        bestScore=PlayerPrefs.GetInt("CyberRun_BestScore",0);
    }

    void SetupEnvironment()
    {
        projectShader=Shader.Find("CyberRun/Unlit");
        if(projectShader==null)
            projectShader=Shader.Find("Universal Render Pipeline/Unlit");

        RenderSettings.fog=true;
        RenderSettings.fogMode=FogMode.ExponentialSquared;
        RenderSettings.fogColor=new Color(.008f,.012f,.04f,1f);
        RenderSettings.fogDensity=.0065f;
        RenderSettings.ambientLight=new Color(.012f,.018f,.045f);

        var volumeGo=new GameObject("CyberRunPostFX");
        var volume=volumeGo.AddComponent<UnityEngine.Rendering.Volume>();
        volume.isGlobal=true;
        volume.priority=5f;
        var profile=ScriptableObject.CreateInstance<UnityEngine.Rendering.VolumeProfile>();
        var bloom=profile.Add<UnityEngine.Rendering.Universal.Bloom>();
        bloom.active=true;
        bloom.intensity.value=1.15f;
        bloom.threshold.value=.7f;
        bloom.scatter.value=.8f;

        var grading=profile.Add<UnityEngine.Rendering.Universal.ColorAdjustments>();
        grading.active=true;
        grading.postExposure.value=.15f;
        grading.contrast.value=8f;
        grading.saturation.value=12f;
        grading.colorFilter.value=new Color(.9f,.97f,1f,1f);

        var tonemapping=profile.Add<UnityEngine.Rendering.Universal.Tonemapping>();
        tonemapping.active=true;
        tonemapping.mode.value=
            UnityEngine.Rendering.Universal.TonemappingMode.ACES;

        var vignette=profile.Add<UnityEngine.Rendering.Universal.Vignette>();
        vignette.active=true;
        vignette.intensity.value=.16f;
        vignette.smoothness.value=.72f;

        volume.profile=profile;

        if(cam!=null)
        {
            cam.fieldOfView=67f;
            cam.farClipPlane=Mathf.Max(cam.farClipPlane,260f);
            cam.backgroundColor=new Color(.003f,.005f,.015f,1f);
            cam.allowHDR=true;

            var additional=cam.GetComponent<UnityEngine.Rendering.Universal.UniversalAdditionalCameraData>();
            if(additional==null)
                additional=cam.gameObject.AddComponent<UnityEngine.Rendering.Universal.UniversalAdditionalCameraData>();
            additional.renderPostProcessing=true;

            if(cam.GetComponent<AudioListener>()==null)
                cam.gameObject.AddComponent<AudioListener>();
        }

        CacheSegments();
        foreach(var s in data)
            BuildSegmentContent(s);
    }

    void CacheSegments()
    {
        segmentRoots.Clear();
        data.Clear();

        var all=FindObjectsByType<Transform>(
            FindObjectsInactive.Exclude,FindObjectsSortMode.None);

        foreach(var t in all)
        {
            if(t.name.StartsWith("Segment_",StringComparison.Ordinal))
                segmentRoots.Add(t);
        }

        segmentRoots.Sort((a,b)=>a.position.z.CompareTo(b.position.z));

        foreach(var root in segmentRoots)
        {
            var segData=new SegmentData
            {
                root=root,
                renderers=root.GetComponentsInChildren<Renderer>(true),
                lastZ=root.position.z
            };
            data.Add(segData);

            var colliders=root.GetComponentsInChildren<Collider>(true);
            for(int i=0;i<colliders.Length;i++)
                if(colliders[i]!=null)
                    segData.obstacles.Add(colliders[i]);
        }
    }

    void BuildSegmentContent(SegmentData seg)
    {
        if(seg.root==null) return;

        int index=GetSegmentIndex(seg.root.name);

        int coinPattern=index%6;
        for(int i=0;i<CoinsPerSegment;i++)
        {
            float z=-13f+i*8.2f;
            int lane;
            float y;

            switch(coinPattern)
            {
                case 0:
                    lane=new[]{-1,0,1,0}[i];
                    y=new[]{1.35f,1.45f,1.35f,1.55f}[i];
                    break;
                case 1:
                    lane=new[]{1,1,0,-1}[i];
                    y=new[]{1.35f,1.65f,1.85f,1.35f}[i];
                    break;
                case 2:
                    lane=new[]{-1,-1,0,1}[i];
                    y=new[]{1.35f,1.8f,1.95f,1.55f}[i];
                    break;
                case 3:
                    lane=new[]{0,1,1,0}[i];
                    y=new[]{1.35f,1.55f,1.9f,1.45f}[i];
                    break;
                case 4:
                    lane=new[]{1,0,-1,-1}[i];
                    y=new[]{1.35f,1.55f,1.85f,1.35f}[i];
                    break;
                default:
                    lane=new[]{-1,0,0,1}[i];
                    y=new[]{1.45f,1.8f,1.95f,1.45f}[i];
                    break;
            }

            var coin=CreateCoin(
                seg.root,
                new Vector3(lane*LaneWidth,y,z));
            seg.coins.Add(coin);
            seg.coinSpawnPositions.Add(coin.transform.localPosition);
        }

        if((index&1)==0)
        {
            var car=CreateHoverCar(
                seg.root,
                new Vector3(index%2==0?-5.4f:5.4f,1.1f,-2f));
            seg.vehicles.Add(car);
        }

        if(index%4==2)
            drones.Add(CreateDrone(seg.root,
                new Vector3((index%2==0?-1:1)*5.2f,7.5f,4f)));

        if(index%5==0)
        {
            float x=(((index+2)%3)-1)*LaneWidth;
            int kind=(index/5)%3;
            var powerup=CreatePowerup(
                seg.root,new Vector3(x,1.45f,12f),kind);
            seg.powerups.Add(powerup);
        }

        CreateRoadReflections(seg.root,index);

        // Include all content created above in the distance-culling cache.
        seg.renderers=seg.root.GetComponentsInChildren<Renderer>(true);

        if(index%3==0)
            CreateCyberSign(seg.root,new Vector3(-5.45f,4.2f,7f),true);

        if(index%3==1)
            CreateCyberSign(seg.root,new Vector3(5.45f,5.1f,-7f),false);

        if((index%4)==0)
            CreateSkyRail(seg.root);
    }

    int GetSegmentIndex(string name)
    {
        if(name.StartsWith("Segment_",StringComparison.Ordinal) &&
           int.TryParse(name.Substring(8),out var value))
            return value;
        return 0;
    }

    GameObject CreateCoin(Transform parent,Vector3 localPos)
    {
        var g=GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        g.name="Coin";
        g.transform.SetParent(parent,false);
        g.transform.localPosition=localPos;
        g.transform.localRotation=Quaternion.Euler(90f,0f,0f);
        g.transform.localScale=new Vector3(.34f,.09f,.34f);

        ApplyMaterial(g.GetComponent<Renderer>(),
            new Color(2.3f,1.05f,.08f));

        var collider=g.GetComponent<Collider>();
        if(collider!=null) Destroy(collider);
        return g;
    }

    Transform CreateHoverCar(Transform parent,Vector3 localPos)
    {
        var root=new GameObject("HoverCar").transform;
        root.SetParent(parent,false);
        root.localPosition=localPos;

        var body=Cube("CarBody",root,new Vector3(2.2f,.55f,3.8f),
            Vector3.zero,new Color(.045f,.055f,.11f));
        Cube("CarGlow",root,new Vector3(1.6f,.08f,3.35f),
            new Vector3(0,.3f,0),new Color(.05f,.75f,1f));
        Cube("CarTail",root,new Vector3(1.4f,.1f,.08f),
            new Vector3(0,.2f,-1.91f),new Color(1f,.06f,.55f));

        root.localRotation=Quaternion.Euler(0f,180f,0f);
        return root;
    }

    Transform CreateDrone(Transform parent,Vector3 localPos)
    {
        var root=new GameObject("SkyDrone").transform;
        root.SetParent(parent,false);
        root.localPosition=localPos;

        Color cyan=new Color(.06f,1.6f,4.5f);
        Color magenta=new Color(1.8f,.05f,3.4f);

        Cube("DroneBody",root,new Vector3(.75f,.22f,1.45f),
            Vector3.zero,new Color(.02f,.03f,.07f));
        Cube("DroneLight",root,new Vector3(.9f,.035f,.05f),
            new Vector3(0,-.14f,0),cyan);
        Cube("DroneTail",root,new Vector3(.1f,.1f,.45f),
            new Vector3(0,0,-.85f),magenta);

        return root;
    }

    GameObject CreatePowerup(Transform parent,Vector3 localPos,int kind)
    {
        var g=GameObject.CreatePrimitive(PrimitiveType.Sphere);
        g.name=kind switch
        {
            0=>"OverdriveCore",
            1=>"MagnetCore",
            _=>"ShieldCore"
        };
        g.transform.SetParent(parent,false);
        g.transform.localPosition=localPos;
        g.transform.localScale=Vector3.one*.42f;

        Color color=kind switch
        {
            0=>new Color(.2f,2.1f,4.8f),
            1=>new Color(1.8f,.08f,2.8f),
            _=>new Color(1.9f,1.4f,.12f)
        };
        ApplyMaterial(g.GetComponent<Renderer>(),color);

        var collider=g.GetComponent<Collider>();
        if(collider!=null) Destroy(collider);
        return g;
    }

    void CreateRoadReflections(Transform parent,int index)
    {
        Color[] accents=
        {
            new Color(.04f,.45f,1.8f),
            new Color(1.7f,.04f,1.3f),
            new Color(.05f,1.2f,1.6f)
        };

        for(int i=0;i<3;i++)
        {
            float x=(i-1)*2.1f;
            float z=-12f+i*11.5f+(index%3)*1.5f;
            Cube("RoadReflection",parent,
                new Vector3(.55f,.025f,3.8f),
                new Vector3(x,.145f,z),accents[(index+i)%accents.Length]);
        }
    }

    void CreateCyberSign(Transform parent,Vector3 localPos,bool cyan)
    {
        var root=new GameObject("CyberSign").transform;
        root.SetParent(parent,false);
        root.localPosition=localPos;

        Color main=cyan?new Color(.05f,1.8f,5f):new Color(1.8f,.08f,3.8f);

        Cube("SignFrame",root,new Vector3(2.8f,1.5f,.08f),
            Vector3.zero,new Color(.015f,.02f,.055f));
        Cube("SignGlow",root,new Vector3(2.5f,.08f,.1f),
            new Vector3(0,.63f,-.08f),main);
        Cube("SignCore",root,new Vector3(.12f,.95f,.1f),
            Vector3.zero,main);
        Cube("SignCore2",root,new Vector3(.12f,.95f,.1f),
            new Vector3(.65f,0,-.08f),main);
    }

    void CreateSkyRail(Transform parent)
    {
        Color rail=new Color(.08f,1.2f,4.2f);
        Cube("SkyRail",parent,new Vector3(.16f,.16f,SegmentLength),
            new Vector3(-3.9f,6.3f,0),rail);
        Cube("SkyRailTop",parent,new Vector3(8f,.12f,.12f),
            new Vector3(0,6.55f,0),new Color(.9f,.08f,.65f));
    }

    GameObject Cube(string name,Transform parent,Vector3 scale,
        Vector3 localPos,Color color)
    {
        var g=GameObject.CreatePrimitive(PrimitiveType.Cube);
        g.name=name;
        g.transform.SetParent(parent,false);
        g.transform.localScale=scale;
        g.transform.localPosition=localPos;
        ApplyMaterial(g.GetComponent<Renderer>(),color);

        var collider=g.GetComponent<Collider>();
        if(collider!=null) Destroy(collider);

        return g;
    }

    void ApplyMaterial(Renderer renderer,Color color)
    {
        if(renderer==null||projectShader==null) return;

        int key=ColorKey(color);
        if(!materialCache.TryGetValue(key,out var mat)||mat==null)
        {
            mat=new Material(projectShader);
            mat.name="CyberRunMat_"+key;
            if(mat.HasProperty("_BaseColor"))
                mat.SetColor("_BaseColor",color);
            if(mat.HasProperty("_Color"))
                mat.SetColor("_Color",color);
            mat.enableInstancing=true;
            materialCache[key]=mat;
        }

        renderer.sharedMaterial=mat;
        renderer.shadowCastingMode=
            UnityEngine.Rendering.ShadowCastingMode.Off;
        renderer.receiveShadows=false;
        renderer.lightProbeUsage=
            UnityEngine.Rendering.LightProbeUsage.Off;
        renderer.reflectionProbeUsage=
            UnityEngine.Rendering.ReflectionProbeUsage.Off;
    }

    int ColorKey(Color color)
    {
        int r=Mathf.RoundToInt(color.r*256f);
        int g=Mathf.RoundToInt(color.g*256f);
        int b=Mathf.RoundToInt(color.b*256f);
        int a=Mathf.RoundToInt(color.a*256f);
        unchecked
        {
            return (((r*397)^g)*397^b)*397^a;
        }
    }

    void SetupAudio()
    {
        sfx=gameObject.AddComponent<AudioSource>();
        sfx.playOnAwake=false;
        sfx.spatialBlend=0f;
        sfx.volume=.24f;

        ambience=gameObject.AddComponent<AudioSource>();
        ambience.playOnAwake=false;
        ambience.loop=true;
        ambience.spatialBlend=0f;
        ambience.volume=.035f;

        coinClip=CreateTone("coin",880f,.075f,.055f);
        jumpClip=CreateSweep("jump",320f,700f,.11f,.045f);
        slideClip=CreateTone("slide",180f,.09f,.035f);
        laneClip=CreateTone("lane",520f,.045f,.022f);
        powerupClip=CreateSweep("powerup",520f,1200f,.16f,.055f);
        crashClip=CreateSweep("crash",210f,60f,.18f,.06f);

        var ambient=CreateAmbience();
        ambience.clip=ambient;
        ambience.Play();
    }

    AudioClip CreateTone(string name,float frequency,float length,float volume)
    {
        const int sampleRate=44100;
        int samples=Mathf.CeilToInt(sampleRate*length);
        var clip=AudioClip.Create(name,samples,1,sampleRate,false);
        var data=new float[samples];

        for(int i=0;i<samples;i++)
        {
            float t=i/(float)samples;
            float envelope=Mathf.Pow(1f-t,2.2f);
            data[i]=Mathf.Sin(2f*Mathf.PI*frequency*i/sampleRate)
                *envelope*volume;
        }

        clip.SetData(data,0);
        return clip;
    }

    AudioClip CreateSweep(string name,float startFreq,float endFreq,
        float length,float volume)
    {
        const int sampleRate=44100;
        int samples=Mathf.CeilToInt(sampleRate*length);
        var clip=AudioClip.Create(name,samples,1,sampleRate,false);
        var data=new float[samples];

        for(int i=0;i<samples;i++)
        {
            float t=i/(float)samples;
            float f=Mathf.Lerp(startFreq,endFreq,t*t);
            float env=Mathf.Sin(Mathf.PI*t);
            data[i]=Mathf.Sin(2f*Mathf.PI*f*i/sampleRate)
                *env*volume;
        }

        clip.SetData(data,0);
        return clip;
    }

    AudioClip CreateAmbience()
    {
        const int sampleRate=22050;
        const float length=2f;
        int samples=(int)(sampleRate*length);
        var clip=AudioClip.Create("CyberAmbience",samples,1,sampleRate,false);
        var data=new float[samples];

        for(int i=0;i<samples;i++)
        {
            float t=i/(float)sampleRate;
            float carrier=Mathf.Sin(2f*Mathf.PI*55f*t)*.45f;
            float sub=Mathf.Sin(2f*Mathf.PI*82.5f*t)*.2f;
            float pulse=.5f+.5f*Mathf.Sin(2f*Mathf.PI*.5f*t);
            data[i]=(carrier+sub)*pulse*.08f;
        }

        clip.SetData(data,0);
        return clip;
    }

    void SetupParticleTrail()
    {
        if(player==null) return;

        var go=new GameObject("RunnerTrail");
        go.transform.SetParent(player,false);
        go.transform.localPosition=new Vector3(0,-.75f,-.25f);

        trail=go.AddComponent<ParticleSystem>();

        var main=trail.main;
        main.loop=true;
        main.startLifetime=.42f;
        main.startSpeed=.25f;
        main.startSize=new ParticleSystem.MinMaxCurve(.035f,.085f);
        main.startColor=new Color(.05f,.8f,1f,.55f);
        main.maxParticles=45;
        main.simulationSpace=ParticleSystemSimulationSpace.World;

        var emission=trail.emission;
        emission.rateOverTime=18f;

        var shape=trail.shape;
        shape.shapeType=ParticleSystemShapeType.Box;
        shape.scale=new Vector3(.5f,.12f,.08f);

        var renderer=trail.GetComponent<ParticleSystemRenderer>();
        var shader=Shader.Find("CyberRun/Unlit");
        if(shader!=null)
        {
            if(materialCache.Count>0)
            {
                int key=ColorKey(new Color(.05f,.8f,1f));
                if(!materialCache.TryGetValue(key,out var trailMat)||trailMat==null)
                {
                    trailMat=new Material(shader);
                    trailMat.name="CyberRunMat_Trail";
                    if(trailMat.HasProperty("_BaseColor"))
                        trailMat.SetColor("_BaseColor",new Color(.05f,.8f,1f));
                    materialCache[key]=trailMat;
                }
                renderer.sharedMaterial=trailMat;
            }
            renderer.shadowCastingMode=
                UnityEngine.Rendering.ShadowCastingMode.Off;
            renderer.receiveShadows=false;
        }
    }

    void SetupCollectBurst()
    {
        var go=new GameObject("CollectBurst");
        go.transform.SetParent(transform,false);
        collectBurst=go.AddComponent<ParticleSystem>();

        var main=collectBurst.main;
        main.loop=false;
        main.startLifetime=.3f;
        main.startSpeed=new ParticleSystem.MinMaxCurve(.9f,2.2f);
        main.startSize=new ParticleSystem.MinMaxCurve(.025f,.07f);
        main.startColor=new Color(1f,.55f,.04f,1f);
        main.maxParticles=48;
        main.simulationSpace=ParticleSystemSimulationSpace.World;

        var emission=collectBurst.emission;
        emission.enabled=false;

        var shape=collectBurst.shape;
        shape.shapeType=ParticleSystemShapeType.Sphere;
        shape.radius=.08f;

        var renderer=collectBurst.GetComponent<ParticleSystemRenderer>();
        renderer.shadowCastingMode=
            UnityEngine.Rendering.ShadowCastingMode.Off;
        renderer.receiveShadows=false;

        var shader=Shader.Find("CyberRun/Particle");
        if(shader!=null)
        {
            var mat=new Material(shader);
            mat.name="CyberRunParticleBurst";
            if(mat.HasProperty("_BaseColor"))
                mat.SetColor("_BaseColor",new Color(2.5f,1.1f,.05f));
            renderer.sharedMaterial=mat;
        }
    }

    void SetupRain()
    {
        var go=new GameObject("CyberRain");
        go.transform.position=Vector3.zero;
        rain=go.AddComponent<ParticleSystem>();

        var main=rain.main;
        main.loop=true;
        main.startLifetime=1.15f;
        main.startSpeed=new ParticleSystem.MinMaxCurve(9f,13f);
        main.startSize=new ParticleSystem.MinMaxCurve(.012f,.026f);
        main.startColor=new Color(.25f,.55f,1f,.32f);
        main.maxParticles=140;
        main.simulationSpace=ParticleSystemSimulationSpace.World;

        var emission=rain.emission;
        emission.rateOverTime=75f;

        var shape=rain.shape;
        shape.shapeType=ParticleSystemShapeType.Box;
        shape.position=new Vector3(0,7f,16f);
        shape.scale=new Vector3(14f,1f,60f);
        shape.rotation=new Vector3(8f,0f,0f);

        var renderer=rain.GetComponent<ParticleSystemRenderer>();
        renderer.renderMode=ParticleSystemRenderMode.Stretch;
        renderer.lengthScale=2.4f;
        renderer.velocityScale=.65f;
        renderer.shadowCastingMode=
            UnityEngine.Rendering.ShadowCastingMode.Off;
        renderer.receiveShadows=false;

        var shader=Shader.Find("CyberRun/Particle");
        if(shader!=null)
        {
            var mat=new Material(shader);
            mat.name="CyberRunRain";
            if(mat.HasProperty("_BaseColor"))
                mat.SetColor("_BaseColor",new Color(.12f,.55f,1.2f,.55f));
            renderer.sharedMaterial=mat;
        }

        DontDestroyOnLoad(go);
    }

    void SetupSpeedLines()
    {
        var go=new GameObject("SpeedLines");
        go.transform.SetParent(player,false);
        go.transform.localPosition=new Vector3(0,.15f,2.5f);

        speedLines=go.AddComponent<ParticleSystem>();
        var main=speedLines.main;
        main.loop=true;
        main.startLifetime=.22f;
        main.startSpeed=new ParticleSystem.MinMaxCurve(11f,19f);
        main.startSize=new ParticleSystem.MinMaxCurve(.012f,.028f);
        main.startColor=new Color(.35f,.8f,1f,.24f);
        main.maxParticles=70;
        main.simulationSpace=ParticleSystemSimulationSpace.World;

        var emission=speedLines.emission;
        emission.rateOverTime=0f;

        var shape=speedLines.shape;
        shape.shapeType=ParticleSystemShapeType.Box;
        shape.scale=new Vector3(8f,3f,2f);

        var renderer=speedLines.GetComponent<ParticleSystemRenderer>();
        renderer.renderMode=ParticleSystemRenderMode.Stretch;
        renderer.lengthScale=3.2f;
        renderer.velocityScale=.7f;
        renderer.shadowCastingMode=
            UnityEngine.Rendering.ShadowCastingMode.Off;
        renderer.receiveShadows=false;

        var shader=Shader.Find("CyberRun/Particle");
        if(shader!=null)
        {
            var mat=new Material(shader);
            mat.name="CyberRunSpeedLines";
            if(mat.HasProperty("_BaseColor"))
                mat.SetColor("_BaseColor",new Color(.18f,.7f,1.1f,.42f));
            renderer.sharedMaterial=mat;
        }
    }

    void SetupGuiStyles()
    {
        hudStyle=new GUIStyle(GUI.skin.label)
        {
            fontSize=18,
            fontStyle=FontStyle.Bold,
            alignment=TextAnchor.UpperLeft
        };

        subStyle=new GUIStyle(GUI.skin.label)
        {
            fontSize=12,
            alignment=TextAnchor.UpperLeft
        };

        hudStyle.normal.textColor=new Color(.55f,.95f,1f);
        subStyle.normal.textColor=new Color(.55f,.7f,.9f);

        buttonStyle=new GUIStyle(GUI.skin.button)
        {
            fontSize=14,
            fontStyle=FontStyle.Bold
        };

        panelStyle=new GUIStyle(GUI.skin.box)
        {
            alignment=TextAnchor.MiddleCenter,
            fontSize=16,
            fontStyle=FontStyle.Bold
        };
    }

    bool StartScreenTapped()
    {
        if(Keyboard.current!=null &&
           (Keyboard.current.enterKey.wasPressedThisFrame ||
            Keyboard.current.spaceKey.wasPressedThisFrame))
            return true;

        if(Touchscreen.current==null) return false;

        var touch=Touchscreen.current.primaryTouch;
        if(touch.press.wasPressedThisFrame)
        {
            touchStart=touch.position.ReadValue();
            return false;
        }

        if(touch.phase.ReadValue()==TouchPhase.Canceled)
        {
            touchStart=Vector2.zero;
            return false;
        }

        if(!touch.press.wasReleasedThisFrame) return false;

        Vector2 delta=touch.position.ReadValue()-touchStart;
        touchStart=Vector2.zero;
        float threshold=Mathf.Clamp(
            Mathf.Min(Screen.width,Screen.height)*.07f,40f,110f);

        return delta.magnitude<threshold;
    }

    void StartRun()
    {
        started=true;
        paused=false;
        appAutoPaused=false;
        introTimer=4f;
        Time.timeScale=1f;
    }

    void Update()
    {
        if(!initialized||player==null) return;

        if(!started)
        {
            if(StartScreenTapped())
                StartRun();
            return;
        }

        if(Application.platform==RuntimePlatform.Android &&
           Keyboard.current!=null &&
           Keyboard.current.escapeKey.wasPressedThisFrame &&
           !IsGameOver())
            SetPaused(!paused);

        bool nowGameOver=IsGameOver();
        if(nowGameOver)
        {
            if(shieldTimer>0f && bootstrap!=null &&
               bootstrap.CancelHitWithShield())
            {
                shieldTimer=0f;
                lastGameOver=false;
                overdriveFlash=.5f;
                PlaySfx(powerupClip);
                Handheld.Vibrate();
                return;
            }

            if(!lastGameOver)
            {
                SaveBestScore();
                PlaySfx(crashClip);
                Handheld.Vibrate();
            }

            lastGameOver=true;
            if(hudRefreshTimer>0f)
                hudRefreshTimer-=Time.unscaledDeltaTime;
            else
            {
                UpdateHudCache();
                hudRefreshTimer=.12f;
            }
            return;
        }

        if(lastGameOver)
        {
            lastGameOver=false;
            ResetCollectibles();
            ResetMetaState();
            started=true;
            paused=false;
            appAutoPaused=false;
            Time.timeScale=1f;
            introTimer=2.2f;
        }

        if(introTimer>0f) introTimer-=Time.unscaledDeltaTime;

        if(bootstrap!=null)
        {
            float currentBootstrapDistance=bootstrap.Distance;
            if(currentBootstrapDistance+.5f<lastBootstrapDistance)
                ResetSegmentTracking();
            lastBootstrapDistance=currentBootstrapDistance;
        }

        if(visualCullTimer>0f)
            visualCullTimer-=Time.unscaledDeltaTime;
        else
        {
            UpdateVisualCulling();
            visualCullTimer=.25f;
        }

        if(visualCacheRefreshTimer>0f)
            visualCacheRefreshTimer-=Time.unscaledDeltaTime;
        else
        {
            RefreshSegmentRendererCache();
            visualCacheRefreshTimer=4f;
        }

        UpdateSegments();
        UpdateCoins();
        UpdatePowerups();
        UpdateVehicles();
        UpdateNearMisses();
        UpdateScore();
        UpdateSpeedLineIntensity();

        if(hudRefreshTimer>0f)
            hudRefreshTimer-=Time.unscaledDeltaTime;
        else
        {
            UpdateHudCache();
            hudRefreshTimer=.12f;
        }

        if(laneSfxCooldown>0f)
            laneSfxCooldown-=Time.unscaledDeltaTime;

        if(Mathf.Abs(player.position.x-lastPlayerX)>.08f &&
           laneSfxCooldown<=0f &&
           bootstrap!=null &&
           Mathf.Abs(bootstrap.CurrentSpeed)>0f)
        {
            PlaySfx(laneClip);
            laneSfxCooldown=.16f;
        }
        lastPlayerX=player.position.x;

        float y=player.position.y;
        if(lastPlayerY<=PlayerGroundY+.03f && y>PlayerGroundY+.08f)
            PlaySfx(jumpClip);

        bool sliding=player.localScale.y<1f;
        if(!wasSliding && sliding)
            PlaySfx(slideClip);
        wasSliding=sliding;

        lastPlayerY=y;

        if(!paused)
            UpdateCamera();
    }

    void UpdateSpeedLineIntensity()
    {
        if(speedLines==null||bootstrap==null) return;

        float speed=bootstrap.CurrentSpeed;
        float amount=Mathf.InverseLerp(13f,19f,speed);

        var emission=speedLines.emission;
        emission.rateOverTime=Mathf.Lerp(0f,55f,amount);
        speedLines.gameObject.SetActive(amount>.02f);
    }

    void RefreshSegmentRendererCache()
    {
        for(int i=0;i<data.Count;i++)
        {
            var segment=data[i];
            if(segment.root==null) continue;

            segment.renderers=
                segment.root.GetComponentsInChildren<Renderer>(true);
        }
    }

    void UpdateVisualCulling()
    {
        float playerZ=player.position.z;
        const float visibleDistance=250f;
        const float hysteresis=24f;

        for(int i=0;i<data.Count;i++)
        {
            var s=data[i];
            if(s.root==null||s.renderers==null) continue;

            float dz=Mathf.Abs(s.root.position.z-playerZ);
            bool visible=dz<visibleDistance;
            bool currentlyEnabled=true;

            if(s.renderers.Length>0 && s.renderers[0]!=null)
                currentlyEnabled=s.renderers[0].enabled;

            if(currentlyEnabled && dz>visibleDistance+hysteresis)
                visible=false;
            else if(!currentlyEnabled && dz<visibleDistance)
                visible=true;

            for(int j=0;j<s.renderers.Length;j++)
            {
                var renderer=s.renderers[j];
                if(renderer!=null && renderer.enabled!=visible)
                    renderer.enabled=visible;
            }
        }
    }

    void ResetSegmentTracking()
    {
        nearMissMarker.Clear();

        for(int i=0;i<data.Count;i++)
        {
            var segment=data[i];
            if(segment.root==null) continue;

            segment.cycle=0;
            segment.lastZ=segment.root.position.z;
            RebuildCoinPath(segment);

            for(int j=0;j<segment.coins.Count;j++)
                if(segment.coins[j]!=null)
                    segment.coins[j].SetActive(true);

            for(int j=0;j<segment.powerups.Count;j++)
                if(segment.powerups[j]!=null)
                    segment.powerups[j].SetActive(true);
        }
    }

    void UpdateSegments()
    {
        for(int i=0;i<data.Count;i++)
        {
            var s=data[i];
            if(s.root==null) continue;

            if(s.root.position.z-s.lastZ>SegmentLength*5f)
            {
                Physics.SyncTransforms();
                s.cycle++;

                RebuildCoinPath(s);

                foreach(var coin in s.coins)
                {
                    if(coin!=null) coin.SetActive(true);
                }
                foreach(var powerup in s.powerups)
                {
                    if(powerup!=null) powerup.SetActive(true);
                }
            }

            s.lastZ=s.root.position.z;
        }
    }

    void RebuildCoinPath(SegmentData segment)
    {
        if(segment.coins.Count==0||segment.root==null) return;

        int seed=Mathf.Abs(
            segment.root.GetInstanceID()+segment.cycle*31);
        int[] laneOrder={-1,0,1};

        for(int i=0;i<segment.coins.Count;i++)
        {
            var coin=segment.coins[i];
            if(coin==null) continue;

            float z=-13f+i*8.2f;
            int desired=Mathf.Abs(seed+i*17)%3-1;
            float y=(i==1||i==2)
                ? 1.55f+((seed+i)%3)*.16f
                : 1.35f;

            int chosen=desired;
            for(int probe=0;probe<3;probe++)
            {
                int candidate=laneOrder[
                    (Array.IndexOf(laneOrder,desired)+probe)%3];

                bool blocked=false;
                for(int j=0;j<segment.obstacles.Count;j++)
                {
                    var obstacle=segment.obstacles[j];
                    if(obstacle==null) continue;

                    Vector3 local=segment.root.InverseTransformPoint(
                        obstacle.bounds.center);

                    if(Mathf.Abs(local.z-z)<4.2f &&
                       Mathf.Abs(local.x-candidate*LaneWidth)<1.35f)
                    {
                        blocked=true;
                        break;
                    }
                }

                if(!blocked)
                {
                    chosen=candidate;
                    break;
                }
            }

            coin.transform.localPosition=
                new Vector3(chosen*LaneWidth,y,z);

            if(i<segment.coinSpawnPositions.Count)
                segment.coinSpawnPositions[i]=coin.transform.localPosition;
        }
    }

    void UpdateCoins()
    {
        float playerZ=player.position.z;

        foreach(var s in data)
        foreach(var coin in s.coins)
        {
            if(coin==null||!coin.activeSelf) continue;

            float dz=Mathf.Abs(coin.transform.position.z-playerZ);
            if(dz>90f) continue;

            float dx=coin.transform.position.x-player.position.x;
            float dy=coin.transform.position.y-player.position.y;

            if(magnetTimer>0f && dz<18f)
            {
                float pull=1f-Mathf.Clamp01(dz/18f);
                Vector3 target=player.position+Vector3.up*.22f;
                coin.transform.position=Vector3.Lerp(
                    coin.transform.position,target,
                    Mathf.Clamp01((7f+pull*12f)*Time.deltaTime));
                dx=coin.transform.position.x-player.position.x;
                dy=coin.transform.position.y-player.position.y;
            }

            float d2=dz*dz+dx*dx+dy*dy;

            coin.transform.Rotate(0f,210f*Time.deltaTime,0f,Space.Self);

            if(d2<1.45f)
            {
                Vector3 burstPosition=coin.transform.position;
                coin.SetActive(false);
                coinCount++;
                CollectCoin(burstPosition);
            }
        }
    }

    void CollectCoin(Vector3 position)
    {
        combo=Mathf.Min(combo+1,9);
        comboTimer=3.2f;
        int multiplier=1+Mathf.Min(combo/3,3);
        if(overdriveTimer>0f)
            multiplier*=2;
        bonusScore+=100L*multiplier;
        PlaySfx(coinClip);

        if(collectBurst!=null)
        {
            collectBurst.transform.position=position;
            collectBurst.Emit(10);
        }
    }

    void UpdatePowerups()
    {
        float playerZ=player.position.z;
        float time=Time.time;

        foreach(var s in data)
        foreach(var powerup in s.powerups)
        {
            if(powerup==null||!powerup.activeSelf) continue;

            float dz=Mathf.Abs(powerup.transform.position.z-playerZ);
            if(dz>90f) continue;

            powerup.transform.Rotate(
                0f,240f*Time.deltaTime,0f,Space.Self);
            float pulse=1f+.12f*Mathf.Sin(time*5.5f);
            powerup.transform.localScale=Vector3.one*.42f*pulse;

            float dx=powerup.transform.position.x-player.position.x;
            float dy=powerup.transform.position.y-player.position.y;
            float d2=dx*dx+dy*dy+dz*dz;

            if(d2<1.75f)
            {
                Vector3 pos=powerup.transform.position;
                string powerName=powerup.name;
                powerup.SetActive(false);

                if(powerName=="OverdriveCore")
                {
                    overdriveTimer=8f;
                    overdriveFlash=.35f;
                    flashColor=new Color(.05f,1.8f,5f,1f);
                }
                else if(powerName=="MagnetCore")
                {
                    magnetTimer=8f;
                    overdriveFlash=.22f;
                    flashColor=new Color(1.9f,.05f,3.8f,1f);
                }
                else if(powerName=="ShieldCore")
                {
                    shieldTimer=18f;
                    overdriveFlash=.28f;
                    flashColor=new Color(2.8f,1.2f,.04f,1f);
                }
                else
                {
                    overdriveFlash=.12f;
                flashColor=new Color(.55f,.7f,1f,1f);
                }

                PlaySfx(powerupClip);
                Handheld.Vibrate();

                if(collectBurst!=null)
                {
                    collectBurst.transform.position=pos;
                    collectBurst.Emit(
                        powerName=="ShieldCore" ? 24 : 18);
                }
            }
        }
    }

    void UpdateVehicles()
    {
        float time=Time.time;

        foreach(var s in data)
        foreach(var v in s.vehicles)
        {
            if(v==null) continue;

            float phase=s.root.GetInstanceID()%100*.13f;
            var pos=v.localPosition;
            pos.y=1.1f+Mathf.Sin(time*1.7f+phase)*.035f;
            pos.z=Mathf.PingPong(time*.85f+phase*3f,26f)-13f;
            v.localPosition=pos;

            float pulse=.5f+.5f*Mathf.Sin(time*4f+phase);
            var glow=v.Find("CarGlow");
            if(glow!=null)
                glow.localScale=new Vector3(1f,.85f+.25f*pulse,1f);
        }

        for(int i=0;i<drones.Count;i++)
        {
            var d=drones[i];
            if(d==null) continue;

            float phase=d.GetInstanceID()%100*.11f;
            var dp=d.localPosition;
            dp.x=5.5f*Mathf.Sin(time*.55f+phase);
            dp.y=7.3f+Mathf.Sin(time*1.1f+phase)*.28f;
            dp.z=Mathf.PingPong(time*.42f+phase*4f,28f)-14f;
            d.localPosition=dp;
            d.localRotation=Quaternion.Euler(
                0f,Mathf.Sin(time*.8f+phase)*10f,0f);
        }
    }

    void ResetCollectibles()
    {
        nearMissMarker.Clear();

        for(int i=0;i<data.Count;i++)
        {
            var segment=data[i];

            for(int j=0;j<segment.coins.Count;j++)
            {
                var coin=segment.coins[j];
                if(coin==null) continue;

                if(j<segment.coinSpawnPositions.Count)
                    coin.transform.localPosition=
                        segment.coinSpawnPositions[j];

                coin.transform.localRotation=
                    Quaternion.Euler(90f,0f,0f);
                coin.transform.localScale=
                    new Vector3(.34f,.09f,.34f);
                coin.SetActive(true);
            }

            for(int j=0;j<segment.powerups.Count;j++)
            {
                var powerup=segment.powerups[j];
                if(powerup==null) continue;

                powerup.transform.localRotation=Quaternion.identity;
                powerup.transform.localScale=Vector3.one*.42f;
                powerup.SetActive(true);
            }
        }

        magnetTimer=0f;
        overdriveTimer=0f;
        shieldTimer=0f;
        combo=0;
        comboTimer=0f;
        coinCount=0;
        bonusScore=0;
    }

    void ResetMetaState()
    {
        runStartDistance=bootstrap!=null
            ? bootstrap.Distance
            : runStartDistance;
        bonusScore=0;
        coinCount=0;
        overdriveTimer=0f;
        magnetTimer=0f;
        shieldTimer=0f;
        combo=0;
        comboTimer=0f;
    }

    void UpdateHudCache()
    {
        float meters=bootstrap!=null
            ? Mathf.Max(0f,bootstrap.Distance-runStartDistance)
            : 0f;
        hudMeters=meters.ToString("0")+" M";
        hudScore=(DistanceScore+bonusScore).ToString("0000000");
        hudData=coinCount.ToString("000");

        hudCombo=combo>1&&comboTimer>0f
            ? "COMBO x"+combo
            : "";

        hudOverdrive=overdriveTimer>0f
            ? "OVERCLOCK "+overdriveTimer.ToString("0.0")+"s"
            : "";

        hudMagnet=magnetTimer>0f
            ? "MAGNET "+magnetTimer.ToString("0.0")+"s"
            : "";

        hudShield=shieldTimer>0f
            ? "SHIELD "+shieldTimer.ToString("0.0")+"s"
            : "";

        hudSpeed=bootstrap!=null
            ? bootstrap.CurrentSpeed.ToString("0.0")
            : "0.0";

        int sector=bootstrap!=null
            ? Mathf.Max(0,Mathf.FloorToInt(
                bootstrap.Distance/650f))
            : 0;

        hudSector=GetSectorName(sector);
        hudAccent=GetSectorAccent(sector);

        hudStyle.normal.textColor=hudAccent;
        subStyle.normal.textColor=Color.Lerp(
            hudAccent,Color.white,.35f);
    }

    void SaveBestScore()
    {
        long currentScore=DistanceScore+bonusScore;
        if(currentScore<=bestScore) return;

        bestScore=currentScore;
        PlayerPrefs.SetInt(
            "CyberRun_BestScore",
            (int)Mathf.Min(bestScore,int.MaxValue));
        PlayerPrefs.Save();
    }

    void UpdateNearMisses()
    {
        if(Mathf.Abs(player.position.z-lastWorldZ)>1000f)
            nearMissMarker.Clear();

        lastWorldZ=player.position.z;

        float playerZ=player.position.z;
        float playerX=player.position.x;
        float playerY=player.position.y;

        for(int i=0;i<data.Count;i++)
        {
            var seg=data[i];
            if(seg.obstacles.Count==0) continue;

            for(int j=0;j<seg.obstacles.Count;j++)
            {
                var obstacle=seg.obstacles[j];
                if(obstacle==null) continue;

                float z=obstacle.bounds.center.z;
                float dz=z-playerZ;

                if(dz>12f||dz<-6f)
                {
                    nearMissMarker[obstacle]=dz;
                    continue;
                }

                if(!nearMissMarker.TryGetValue(
                    obstacle,out float previousDz))
                {
                    nearMissMarker[obstacle]=dz;
                    continue;
                }

                if(previousDz>0f && dz<=-1.2f)
                {
                    float dx=Mathf.Abs(
                        obstacle.bounds.center.x-playerX);
                    float dy=Mathf.Abs(
                        obstacle.bounds.center.y-playerY);

                    if(dx<1.55f && dy<2.1f)
                    {
                        bonusScore+=35L;
                        combo=Mathf.Min(combo+1,9);
                        comboTimer=2.4f;
                        PlaySfx(laneClip);

                        if(collectBurst!=null)
                        {
                            collectBurst.transform.position=
                                obstacle.bounds.center;
                            collectBurst.Emit(6);
                        }
                    }
                }

                nearMissMarker[obstacle]=dz;
            }
        }
    }

    void UpdateScore()
    {
        if(comboTimer>0f)
            comboTimer-=Time.deltaTime;
        else
            combo=0;

        if(overdriveTimer>0f)
            overdriveTimer-=Time.deltaTime;
        else
            overdriveTimer=0f;

        if(magnetTimer>0f)
            magnetTimer-=Time.deltaTime;
        else
            magnetTimer=0f;

        if(shieldTimer>0f)
            shieldTimer-=Time.deltaTime;
        else
            shieldTimer=0f;

        if(overdriveFlash>0f)
            overdriveFlash-=Time.unscaledDeltaTime;
    }

    void UpdateCamera()
    {
        if(cam==null) return;

        float speed=bootstrap!=null
            ? bootstrap.CurrentSpeed
            : 0f;

        float targetFov=Mathf.Clamp(
            67f+speed*.23f,67f,73f);

        cam.fieldOfView=Mathf.Lerp(
            cam.fieldOfView,
            targetFov,
            1f-Mathf.Exp(-4.5f*Time.unscaledDeltaTime));
    }

    void LateUpdate()
    {
        if(!initialized||!started||paused||IsGameOver()||cam==null||player==null)
            return;

        float dt=Mathf.Max(.008f,Time.unscaledDeltaTime);
        float lateralDelta=player.position.x-lastCameraX;
        float lateralVelocity=lateralDelta/dt;

        float targetRoll=Mathf.Clamp(
            -lateralVelocity*1.8f,-6.5f,6.5f);

        float speed=bootstrap!=null
            ? bootstrap.CurrentSpeed
            : 0f;

        float targetPitch=Mathf.Clamp(
            (speed-11f)*.18f+
            (player.position.y-PlayerGroundY)*-1.2f,
            -2.5f,3f);

        Vector3 forward=cam.transform.forward;
        if(forward.sqrMagnitude<.01f)
            forward=Vector3.forward;

        Vector3 flatForward=Vector3.ProjectOnPlane(
            forward,Vector3.up);

        if(flatForward.sqrMagnitude<.01f)
            flatForward=Vector3.forward;

        Quaternion baseRotation=Quaternion.LookRotation(
            flatForward.normalized,Vector3.up);

        Quaternion desired=baseRotation*
            Quaternion.Euler(targetPitch,0f,targetRoll);

        cam.transform.rotation=Quaternion.Slerp(
            cam.transform.rotation,
            desired,
            1f-Mathf.Exp(-8f*dt));

        lastCameraX=player.position.x;
    }

    string GetSectorName(int sector)
    {
        switch(sector%4)
        {
            case 0: return "NEXUS";
            case 1: return "VIOLET";
            case 2: return "GOLDLINE";
            default: return "SYNTHWAVE";
        }
    }

    Color GetSectorAccent(int sector)
    {
        switch(sector%4)
        {
            case 0: return new Color(.45f,1f,2.8f,1f);
            case 1: return new Color(1.7f,.18f,3.8f,1f);
            case 2: return new Color(2.6f,1.1f,.05f,1f);
            default: return new Color(.15f,2f,2.4f,1f);
        }
    }

    long DistanceScore
    {
        get
        {
            float distance=bootstrap!=null
                ? bootstrap.Distance-runStartDistance
                : 0f;
            return Math.Max(0L,Mathf.FloorToInt(distance*10f));
        }
    }

    bool IsGameOver()
    {
        return bootstrap!=null && bootstrap.IsGameOver;
    }

    void PlaySfx(AudioClip clip)
    {
        if(sfx!=null&&clip!=null)
            sfx.PlayOneShot(clip);
    }

    void SetPaused(bool value)
    {
        paused=value;
        if(paused)
            Time.timeScale=0f;
        else
        {
            started=true;
            Time.timeScale=1f;
        }
    }

    void OnApplicationPause(bool pause)
    {
        if(pause && started && !IsGameOver() && !paused)
        {
            appAutoPaused=true;
            SetPaused(true);
        }
        else if(!pause && appAutoPaused)
        {
            appAutoPaused=false;
            SetPaused(false);
        }
    }

    void OnDestroy()
    {
        if(paused)
            Time.timeScale=1f;
    }

    void OnGUI()
    {
        if(!initialized||player==null||hudStyle==null) return;

        var safe=Screen.safeArea;

        if(!started && !IsGameOver())
        {
            GUI.color=new Color(.003f,.005f,.018f,.97f);
            GUI.DrawTexture(
                new Rect(0,0,Screen.width,Screen.height),
                Texture2D.whiteTexture);

            GUI.color=new Color(.05f,.85f,1f,.65f);
            GUI.DrawTexture(
                new Rect(Screen.width*.5f-150f,Screen.height*.25f,300f,2f),
                Texture2D.whiteTexture);
            GUI.color=new Color(1f,.06f,.55f,.65f);
            GUI.DrawTexture(
                new Rect(Screen.width*.5f-95f,Screen.height*.25f+82f,190f,2f),
                Texture2D.whiteTexture);
            GUI.color=Color.white;

            float startPulse=.65f+
                .35f*Mathf.Sin(Time.unscaledTime*2.4f);
            GUI.color=new Color(
                .05f, .85f, 1f, .16f+.14f*startPulse);
            GUI.DrawTexture(
                new Rect(0,
                    Mathf.Repeat(Time.unscaledTime*62f,Screen.height),
                    Screen.width,2f),
                Texture2D.whiteTexture);
            GUI.color=Color.white;

            GUI.Label(
                new Rect(Screen.width*.5f-190f,Screen.height*.28f,380f,60f),
                "CYBER RUN",hudStyle);

            GUI.Label(
                new Rect(Screen.width*.5f-190f,Screen.height*.28f+52f,380f,28f),
                "NEON METROPOLIS // SECTOR 07",subStyle);

            GUI.Label(
                new Rect(Screen.width*.5f-155f,Screen.height*.62f,310f,32f),
                "TAP TO START",hudStyle);

            GUI.Label(
                new Rect(Screen.width*.5f-180f,Screen.height*.62f+38f,360f,26f),
                "SWIPE  /  JUMP  /  SLIDE  /  SURVIVE",subStyle);

            float pulseWidth=150f+80f*startPulse;
            GUI.color=new Color(.05f,.85f,1f,.28f);
            GUI.DrawTexture(
                new Rect(Screen.width*.5f-pulseWidth*.5f,
                    Screen.height*.62f+66f,pulseWidth,1f),
                Texture2D.whiteTexture);
            GUI.color=Color.white;
            return;
        }

        float left=safe.x+18f;
        float top=Screen.height-safe.yMax+16f;

        GUI.color=new Color(.004f,.009f,.028f,.82f);
        GUI.DrawTexture(
            new Rect(left-10f,top-8f,355f,150f),
            Texture2D.whiteTexture);
        GUI.color=new Color(.04f,.75f,1f,.85f);
        GUI.DrawTexture(
            new Rect(left-10f,top-8f,3f,150f),
            Texture2D.whiteTexture);
        GUI.color=new Color(1f,.06f,.55f,.7f);
        GUI.DrawTexture(
            new Rect(left-7f,top-8f,260f,2f),
            Texture2D.whiteTexture);
        GUI.color=Color.white;

        GUI.Label(new Rect(left,top,360f,32f),
            "CYBER RUN  //  "+hudMeters+"  ["+hudSector+"]",hudStyle);
        GUI.Label(new Rect(left,top+30f,340f,26f),
            "SCORE "+hudScore+"  BEST "+bestScore,subStyle);
        GUI.Label(new Rect(left,top+50f,260f,26f),
            "DATA "+hudData+"   SPEED "+hudSpeed,subStyle);

        float scanY=top-7f+
            Mathf.Repeat(Time.unscaledTime*34f,145f);
        GUI.color=new Color(
            hudAccent.r,hudAccent.g,hudAccent.b,.10f);
        GUI.DrawTexture(
            new Rect(left-8f,scanY,330f,1f),
            Texture2D.whiteTexture);
        GUI.color=Color.white;

        if(!string.IsNullOrEmpty(hudCombo))
            GUI.Label(new Rect(left,top+74f,220f,26f),
                hudCombo,subStyle);

        if(!string.IsNullOrEmpty(hudOverdrive))
            GUI.Label(new Rect(left,top+96f,260f,26f),
                hudOverdrive,subStyle);

        if(!string.IsNullOrEmpty(hudMagnet))
            GUI.Label(new Rect(left,top+118f,260f,26f),
                hudMagnet,subStyle);

        if(!string.IsNullOrEmpty(hudShield))
            GUI.Label(new Rect(left,top+140f,260f,26f),
                hudShield,subStyle);

        Rect pauseRect=new Rect(
            safe.xMax-78f,Screen.height-safe.yMax+14f,62f,40f);

        Color oldBg=GUI.backgroundColor;
        GUI.backgroundColor=new Color(.015f,.09f,.16f,.92f);
        if(GUI.Button(pauseRect,paused?"▶":"Ⅱ",buttonStyle))
            SetPaused(!paused);
        GUI.backgroundColor=oldBg;

        if(introTimer>0f&&!paused&&!IsGameOver())
        {
            GUI.Label(
                new Rect(Screen.width*.5f-165f,Screen.height*.73f,330f,35f),
                "SWIPE  /  DODGE  /  SURVIVE",
                subStyle);
        }

        if(IsGameOver())
        {
            GUI.color=new Color(.003f,.006f,.02f,.88f);
            GUI.DrawTexture(
                new Rect(Screen.width*.5f-175f,Screen.height*.5f-120f,350f,245f),
                Texture2D.whiteTexture);
            GUI.color=new Color(1f,.05f,.45f,.85f);
            GUI.DrawTexture(
                new Rect(Screen.width*.5f-140f,Screen.height*.5f-120f,280f,3f),
                Texture2D.whiteTexture);
            GUI.color=new Color(.05f,.8f,1f,.75f);
            GUI.DrawTexture(
                new Rect(Screen.width*.5f-95f,Screen.height*.5f+92f,190f,2f),
                Texture2D.whiteTexture);
            GUI.color=Color.white;

            GUI.Label(
                new Rect(Screen.width*.5f-150f,Screen.height*.5f-82f,300f,40f),
                "RUN TERMINATED",hudStyle);
            GUI.Label(
                new Rect(Screen.width*.5f-150f,Screen.height*.5f-42f,300f,28f),
                "SCORE "+(DistanceScore+bonusScore).ToString("0000000"),
                subStyle);
            GUI.Label(
                new Rect(Screen.width*.5f-150f,Screen.height*.5f-18f,300f,26f),
                "BEST "+bestScore.ToString("0000000"),
                subStyle);

            if(GUI.Button(
                new Rect(Screen.width*.5f-85f,Screen.height*.5f+28f,170f,46f),
                "RESTART",buttonStyle))
            {
                bootstrap?.RestartRun();
            }
        }

        if(paused)
        {
            GUI.color=new Color(.003f,.006f,.02f,.9f);
            GUI.DrawTexture(
                new Rect(Screen.width*.5f-155f,Screen.height*.5f-82f,310f,165f),
                Texture2D.whiteTexture);
            GUI.color=new Color(.05f,.85f,1f,.8f);
            GUI.DrawTexture(
                new Rect(Screen.width*.5f-125f,Screen.height*.5f-82f,250f,2f),
                Texture2D.whiteTexture);
            GUI.color=Color.white;

            GUI.Label(
                new Rect(Screen.width*.5f-135f,Screen.height*.5f-62f,270f,34f),
                "SYSTEM PAUSED",hudStyle);

            Color previousBg=GUI.backgroundColor;
            GUI.backgroundColor=new Color(.015f,.09f,.16f,.96f);

            if(GUI.Button(
                new Rect(Screen.width*.5f-80f,Screen.height*.5f+2f,160f,44f),
                "RESUME",buttonStyle))
            {
                SetPaused(false);
            }

            GUI.backgroundColor=previousBg;
        }

        if(overdriveFlash>0f)
        {
            GUI.color=new Color(
                flashColor.r,flashColor.g,flashColor.b,
                Mathf.Clamp01(overdriveFlash*1.8f));
            GUI.DrawTexture(
                new Rect(0,0,Screen.width,Screen.height),
                Texture2D.whiteTexture);
            GUI.color=Color.white;
        }
    }
}
