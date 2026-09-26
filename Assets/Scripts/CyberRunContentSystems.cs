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
        public readonly List<GameObject> powerups=new();
        public readonly List<Transform> vehicles=new();
        public float lastZ;
    }

    readonly List<SegmentData> data=new();
    readonly List<Transform> segmentRoots=new();
    readonly Dictionary<int,Material> materialCache=new();
    Shader projectShader;

    Transform player;
    Camera cam;
    ParticleSystem trail;
    ParticleSystem collectBurst;
    AudioSource sfx;
    AudioSource ambience;
    AudioClip coinClip,jumpClip,slideClip,laneClip,powerupClip,crashClip;

    long bonusScore;
    int combo;
    float comboTimer;
    float startZ;
    float lastPlayerY;
    bool wasSliding;
    bool paused;
    bool initialized;
    bool started;
    bool appAutoPaused;
    float introTimer=4f;
    int coinCount;
    float overdriveTimer;
    long bestScore;
    float overdriveFlash;

    GUIStyle hudStyle;
    GUIStyle subStyle;
    GUIStyle buttonStyle;
    GUIStyle panelStyle;

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

        startZ=player.position.z;
        lastPlayerY=player.position.y;
        lastPlayerX=player.position.x;

        bootstrap=GetComponent<CyberRunBootstrap>();
        if(bootstrap==null)
            bootstrap=FindFirstObjectByType<CyberRunBootstrap>();

        lastPlayerZ=player.position.z;
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
            data.Add(new SegmentData{root=root,lastZ=root.position.z});
    }

    void BuildSegmentContent(SegmentData seg)
    {
        if(seg.root==null) return;

        int index=GetSegmentIndex(seg.root.name);

        for(int i=0;i<CoinsPerSegment;i++)
        {
            float z=-13f+i*8.2f;
            int pattern=(index+i)%5;
            int lane=pattern switch
            {
                0=>-1,
                1=>0,
                2=>1,
                3=>(i&1)==0?-1:1,
                _=>0
            };

            var coin=CreateCoin(
                seg.root,
                new Vector3(lane*LaneWidth,1.35f,z));
            seg.coins.Add(coin);
        }

        if((index&1)==0)
        {
            var car=CreateHoverCar(
                seg.root,
                new Vector3(index%2==0?-5.4f:5.4f,1.1f,-2f));
            seg.vehicles.Add(car);
        }

        if(index%5==0)
        {
            float x=(((index+2)%3)-1)*LaneWidth;
            var powerup=CreatePowerup(seg.root,
                new Vector3(x,1.45f,12f));
            seg.powerups.Add(powerup);
        }

        CreateRoadReflections(seg.root,index);

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

    GameObject CreatePowerup(Transform parent,Vector3 localPos)
    {
        var g=GameObject.CreatePrimitive(PrimitiveType.Sphere);
        g.name="OverdriveCore";
        g.transform.SetParent(parent,false);
        g.transform.localPosition=localPos;
        g.transform.localScale=Vector3.one*.42f;

        ApplyMaterial(g.GetComponent<Renderer>(),
            new Color(.2f,2.1f,4.8f));

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
            ResetMetaState();
            started=true;
            paused=false;
            appAutoPaused=false;
            Time.timeScale=1f;
            introTimer=2.2f;
        }

        if(introTimer>0f) introTimer-=Time.unscaledDeltaTime;

        UpdateSegments();
        UpdateCoins();
        UpdatePowerups();
        UpdateVehicles();
        UpdateScore();

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

    void UpdateSegments()
    {
        for(int i=0;i<data.Count;i++)
        {
            var s=data[i];
            if(s.root==null) continue;

            if(s.root.position.z-s.lastZ>SegmentLength*5f)
            {
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
                powerup.SetActive(false);
                overdriveTimer=8f;
                overdriveFlash=.35f;
                PlaySfx(powerupClip);
                Handheld.Vibrate();

                if(collectBurst!=null)
                {
                    collectBurst.transform.position=pos;
                    collectBurst.Emit(18);
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
    }

    void ResetMetaState()
    {
        startZ=player.position.z;
        lastPlayerZ=player.position.z;
        bonusScore=0;
        coinCount=0;
        overdriveTimer=0f;
        combo=0;
        comboTimer=0f;
    }

    void UpdateHudCache()
    {
        hudMeters=Mathf.Max(0f,player.position.z-startZ)
            .ToString("0")+" M";
        hudScore=(DistanceScore+bonusScore).ToString("0000000");
        hudData=coinCount.ToString("000");

        hudCombo=combo>1&&comboTimer>0f
            ? "COMBO x"+combo
            : "";

        hudOverdrive=overdriveTimer>0f
            ? "OVERCLOCK "+overdriveTimer.ToString("0.0")+"s"
            : "";
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

        if(overdriveFlash>0f)
            overdriveFlash-=Time.unscaledDeltaTime;

        if(player.position.z<lastPlayerZ-20f)
            ResetMetaState();

        lastPlayerZ=player.position.z;
    }

    void UpdateCamera()
    {
        if(cam==null) return;

        float speed=bootstrap!=null
            ? bootstrap.CurrentSpeed
            : 0f;

        float targetFov=Mathf.Clamp(67f+speed*.23f,67f,73f);
        cam.fieldOfView=Mathf.Lerp(
            cam.fieldOfView,targetFov,1f-Mathf.Exp(-4.5f*Time.unscaledDeltaTime));
    }

    long DistanceScore
    {
        get
        {
            return Math.Max(0L,
                Mathf.FloorToInt((player.position.z-startZ)*10f));
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
        if(pause && started && !IsGameOver())
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
            GUI.color=new Color(.006f,.008f,.025f,.96f);
            GUI.DrawTexture(
                new Rect(0,0,Screen.width,Screen.height),
                Texture2D.whiteTexture);
            GUI.color=Color.white;

            GUI.Label(
                new Rect(Screen.width*.5f-180f,Screen.height*.28f,360f,60f),
                "CYBER RUN",hudStyle);

            GUI.Label(
                new Rect(Screen.width*.5f-180f,Screen.height*.28f+52f,360f,28f),
                "NEON METROPOLIS",subStyle);

            GUI.Label(
                new Rect(Screen.width*.5f-150f,Screen.height*.62f,300f,32f),
                "TAP TO START",hudStyle);

            GUI.Label(
                new Rect(Screen.width*.5f-170f,Screen.height*.62f+38f,340f,26f),
                "SWIPE  /  JUMP  /  SLIDE",subStyle);
            return;
        }
        float left=safe.x+18f;
        float top=Screen.height-safe.yMax+16f;

        string score=(DistanceScore+bonusScore).ToString("0000000");
        string meters=Mathf.Max(0f,player.position.z-startZ).ToString("0")+" M";

        GUI.Label(new Rect(left,top,340f,32f),
            "CYBER RUN  //  "+meters,hudStyle);
        GUI.Label(new Rect(left,top+30f,300f,26f),
            "SCORE "+score+"  BEST "+bestScore,subStyle);
        GUI.Label(new Rect(left,top+50f,240f,26f),
            "DATA "+coinCount.ToString("000"),subStyle);

        if(overdriveTimer>0f)
            GUI.Label(new Rect(left,top+96f,260f,26f),
                "OVERCLOCK "+overdriveTimer.ToString("0.0")+"s",subStyle);

        if(overdriveFlash>0f)
        {
            GUI.color=new Color(.05f,.85f,1f,
                Mathf.Clamp01(overdriveFlash*1.8f));
            GUI.DrawTexture(
                new Rect(0,0,Screen.width,Screen.height),
                Texture2D.whiteTexture);
            GUI.color=Color.white;
        }

        if(combo>1&&comboTimer>0f)
            GUI.Label(new Rect(left,top+74f,220f,28f),
                "COMBO x"+combo,subStyle);

        Rect pauseRect=new Rect(
            safe.xMax-78f,Screen.height-safe.yMax+14f,62f,40f);

        if(GUI.Button(pauseRect,paused?"▶":"Ⅱ",buttonStyle))
            SetPaused(!paused);

        if(introTimer>0f&&!paused&&!IsGameOver())
        {
            GUI.Label(
                new Rect(Screen.width*.5f-150f,Screen.height*.73f,300f,35f),
                "SWIPE  /  DODGE  /  SURVIVE",
                subStyle);
        }

        if(IsGameOver())
            GUI.Label(
                new Rect(Screen.width*.5f-150f,Screen.height*.5f+82f,300f,28f),
                "SCORE "+(DistanceScore+bonusScore).ToString("0000000"),
                subStyle);

        if(paused)
        {
            GUI.Box(
                new Rect(Screen.width*.5f-145f,Screen.height*.5f-75f,290f,150f),
                "SYSTEM PAUSED",panelStyle);

            if(GUI.Button(
                new Rect(Screen.width*.5f-80f,Screen.height*.5f+5f,160f,44f),
                "RESUME",buttonStyle))
            {
                SetPaused(false);
            }
        }
    }
}
