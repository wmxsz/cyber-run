using UnityEngine;
using UnityEngine.InputSystem;
using System.Collections.Generic;

[DefaultExecutionOrder(-100)]
public sealed class CyberRunBootstrap : MonoBehaviour
{
    const float LaneWidth = 2.7f;
    const float SegmentLength = 36f;
    const int SegmentCount = 14;
    readonly List<Transform> segments = new();
    readonly List<Collider> obstacles = new();
    readonly List<Transform> movingHazards = new();
    readonly Dictionary<Transform,int> segmentCycles=new();
    readonly Dictionary<Transform,Transform[]> hazardCache=new();
    static readonly Dictionary<int,Material> materialCache=new();
    static readonly int[][] HazardLanePatterns=
    {
        new[]{-1,1},
        new[]{0,-1},
        new[]{1,0},
        new[]{-1,0},
        new[]{0,1},
        new[]{1,-1},
        new[]{-1,1},
        new[]{0,1}
    };
    Transform player;
    Camera cam;
    int lane;
    float speed = 11f, distance;
    float speedBurstTimer;
    float speedBurstBonus;
    float yVelocity;
    float hitGraceTimer;
    bool gameOver, sliding;
    float slideTimer;
    Vector2 touchStart;
    Vector3 previousPlayerPosition;
    CapsuleCollider playerCollider;
    Vector3 playerBaseScale;
    const float PlayerGroundY = 1.1f;
    public bool IsGameOver => gameOver;
    public bool IsSliding => sliding;
    public float CurrentSpeed => speed+speedBurstBonus;
    public float Distance => distance;
    public int ResetVersion { get; private set; }
    public bool IsSpeedBurstActive => speedBurstTimer>0f;
    public float SpeedBurstRemaining => speedBurstTimer;

    public void TriggerSpeedBurst(float bonus,float duration)
    {
        if(gameOver) return;
        speedBurstBonus=Mathf.Max(speedBurstBonus,Mathf.Max(0f,bonus));
        speedBurstTimer=Mathf.Max(speedBurstTimer,Mathf.Max(0f,duration));
    }

    public void RestartRun()
    {
        Restart();
    }

    public bool CancelHitWithShield()
    {
        if(gameOver)
        {
            gameOver=false;
            yVelocity=0f;
            sliding=false;
            slideTimer=0f;
            if(player!=null)
            {
                player.position=new Vector3(
                    player.position.x,PlayerGroundY+.02f,player.position.z);
                player.position+=Vector3.forward*2.6f;
                player.localScale=playerBaseScale;
                previousPlayerPosition=player.position;
                Physics.SyncTransforms();
            }
            hitGraceTimer=.75f;
            return true;
        }
        return false;
    }



    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
    static void Boot()
    {
        if (FindFirstObjectByType<CyberRunBootstrap>() == null)
            new GameObject("CyberRun").AddComponent<CyberRunBootstrap>();
    }

    void Awake()
    {
        DontDestroyOnLoad(gameObject);
        Application.targetFrameRate = 60;
        QualitySettings.vSyncCount = 0;
        Physics.autoSyncTransforms=false;
        Screen.orientation=ScreenOrientation.Portrait;
        Screen.autorotateToPortrait=true;
        Screen.autorotateToPortraitUpsideDown=false;
        Screen.autorotateToLandscapeLeft=false;
        Screen.autorotateToLandscapeRight=false;
        Screen.sleepTimeout=SleepTimeout.NeverSleep;
        BuildWorld();
    }

    void BuildWorld()
    {
        RenderSettings.ambientLight = new Color(0.02f,0.035f,0.07f);
        var lightGo = new GameObject("CityLight");
        var light = lightGo.AddComponent<Light>();
        light.type = LightType.Directional;
        light.intensity = 0.8f;
        light.color = new Color(0.55f,0.7f,1f);
        light.transform.rotation = Quaternion.Euler(50f,-30f,0f);

        player = GameObject.CreatePrimitive(PrimitiveType.Capsule).transform;
        player.name = "Runner";
        player.position = new Vector3(0,PlayerGroundY,4);
        player.localScale = new Vector3(.72f,1.05f,.72f);
        playerBaseScale = player.localScale;
        ApplyMaterial(player.GetComponent<Renderer>(), new Color(.05f,.65f,1f));
        playerCollider = player.GetComponent<CapsuleCollider>();
        CreateRunnerDetails();
        previousPlayerPosition=player.position;

        for(int i=0;i<SegmentCount;i++) CreateSegment(i, 18f+i*SegmentLength);

        var camGo = new GameObject("Main Camera");
        cam = camGo.AddComponent<Camera>();
        cam.tag = "MainCamera";
        cam.fieldOfView = 68f;
        cam.nearClipPlane = .05f;
        cam.farClipPlane = 240f;
        cam.clearFlags = CameraClearFlags.SolidColor;
        cam.backgroundColor = new Color(.005f,.008f,.02f,1f);
        cam.transform.position = new Vector3(0,5,-8);
    }

    void CreateSegment(int index,float z)
    {
        var root = new GameObject("Segment_"+index).transform;
        root.position = new Vector3(0,0,z);
        Cube("Road",root,new Vector3(9,.25f,SegmentLength),Vector3.zero,new Color(.025f,.035f,.06f));
        Strip(root,-4.2f);
        Strip(root,4.2f);
        LaneStrip(root,-1.35f);
        LaneStrip(root,1.35f);

        for(int side=-1;side<=1;side+=2)
            for(int b=0;b<3;b++)
            {
                float h=6f+b*3f;
                Cube("Building",root,new Vector3(2.2f,h,8f),
                    new Vector3(side*(7f+b*2.3f),h*.5f,-10f+b*11f),
                    new Color(.035f,.055f,.11f));
                Cube("BuildingNeon",root,new Vector3(2.25f,.07f,.16f),
                    new Vector3(side*(7f+b*2.3f),h-.16f,-10f+b*11f),
                    (b&1)==0 ? new Color(.05f,.8f,1f) : new Color(.95f,.08f,.65f));
            }

        int pattern=index%8;
        int[] obstacleLanes;
        bool[] slideTypes;

        switch(pattern)
        {
            case 0:
                obstacleLanes=new[]{-1,1};
                slideTypes=new[]{false,true};
                break;
            case 1:
                obstacleLanes=new[]{0,-1};
                slideTypes=new[]{false,true};
                break;
            case 2:
                obstacleLanes=new[]{1,0};
                slideTypes=new[]{true,false};
                break;
            case 3:
                obstacleLanes=new[]{-1,0};
                slideTypes=new[]{true,false};
                break;
            case 4:
                obstacleLanes=new[]{0,1};
                slideTypes=new[]{true,false};
                break;
            case 5:
                obstacleLanes=new[]{1,-1};
                slideTypes=new[]{false,true};
                break;
            case 6:
                obstacleLanes=new[]{-1,1};
                slideTypes=new[]{true,false};
                break;
            default:
                obstacleLanes=new[]{0,1};
                slideTypes=new[]{false,true};
                break;
        }

        for(int o=0;o<2;o++)
        {
            bool slideGate=slideTypes[o];
            float x=obstacleLanes[o]*LaneWidth;
            Vector3 scale=slideGate
                ? new Vector3(1.8f,.4f,1.1f)
                : new Vector3(1.8f,1.4f,1.1f);
            Vector3 localPos=slideGate
                ? new Vector3(x,2.15f,-8f+o*17f)
                : new Vector3(x,.7f,-8f+o*17f);

            var obstacle=Cube(
                slideGate?"SlideGate":"JumpObstacle",
                root,scale,localPos,
                slideGate
                    ? new Color(1f,.25f,.85f)
                    : new Color(1f,.12f,.05f),
                true);

            var obstacleCollider=obstacle.GetComponent<Collider>();
            if(obstacleCollider!=null)
                obstacles.Add(obstacleCollider);
        }

        if((index&1)==0)
            OverheadFrame(root);

        if(index%7==5)
            CreateCyberTunnel(root,index);

        if(index%6==3)
        {
            int hazardLane=((index/3)%3)-1;
            var moving=Cube(
                "MovingLaser",
                root,
                new Vector3(1.55f,.22f,1.05f),
                new Vector3(hazardLane*LaneWidth,1.55f,2.5f),
                new Color(1.7f,.04f,.42f),
                true);
            var movingCollider=moving.GetComponent<Collider>();
            if(movingCollider!=null)
                obstacles.Add(movingCollider);
            movingHazards.Add(moving.transform);
        }

        segments.Add(root);

        var hazardTransforms=root.GetComponentsInChildren<Transform>(true);
        var cachedHazards=new List<Transform>(3);
        for(int h=0;h<hazardTransforms.Length;h++)
        {
            var hazard=hazardTransforms[h];
            if(hazard!=null &&
               (hazard.name=="JumpObstacle" ||
                hazard.name=="SlideGate" ||
                hazard.name=="MovingLaser"))
                cachedHazards.Add(hazard);
        }
        hazardCache[root]=cachedHazards.ToArray();
    }

    void CreateRunnerDetails()
    {
        var baseRenderer=player.GetComponent<Renderer>();
        if(baseRenderer!=null) baseRenderer.enabled=false;

        Color suit=new Color(.02f,.035f,.075f);
        Color cyan=new Color(.05f,1.8f,5f);
        Color magenta=new Color(1.8f,.06f,3.7f);
        Color white=new Color(.65f,.85f,1.2f);

        Cube("Torso",player,new Vector3(.56f,.68f,.34f),
            new Vector3(0,.02f,.02f),suit);
        Cube("ChestLight",player,new Vector3(.42f,.055f,.055f),
            new Vector3(0,.18f,.19f),cyan);
        Cube("Core",player,new Vector3(.14f,.23f,.07f),
            new Vector3(0,-.05f,.19f),magenta);

        var head=GameObject.CreatePrimitive(PrimitiveType.Sphere);
        head.name="Head";
        head.transform.SetParent(player,false);
        head.transform.localPosition=new Vector3(0,.5f,.02f);
        head.transform.localScale=new Vector3(.43f,.43f,.43f);
        ApplyMaterial(head.GetComponent<Renderer>(),suit);
        var headCollider=head.GetComponent<Collider>();
        if(headCollider!=null) Destroy(headCollider);

        Cube("Visor",player,new Vector3(.3f,.09f,.04f),
            new Vector3(0,.54f,.22f),magenta);
        Cube("VisorGlow",player,new Vector3(.22f,.025f,.025f),
            new Vector3(0,.54f,.245f),white);

        Cube("ShoulderL",player,new Vector3(.18f,.18f,.32f),
            new Vector3(-.35f,.16f,.02f),cyan);
        Cube("ShoulderR",player,new Vector3(.18f,.18f,.32f),
            new Vector3(.35f,.16f,.02f),magenta);

        Cube("ArmL",player,new Vector3(.14f,.48f,.15f),
            new Vector3(-.38f,-.12f,.02f),suit);
        Cube("ArmR",player,new Vector3(.14f,.48f,.15f),
            new Vector3(.38f,-.12f,.02f),suit);

        Cube("LegL",player,new Vector3(.18f,.5f,.18f),
            new Vector3(-.16f,-.55f,.01f),suit);
        Cube("LegR",player,new Vector3(.18f,.5f,.18f),
            new Vector3(.16f,-.55f,.01f),suit);

        Cube("BootL",player,new Vector3(.22f,.12f,.32f),
            new Vector3(-.16f,-.82f,.08f),cyan);
        Cube("BootR",player,new Vector3(.22f,.12f,.32f),
            new Vector3(.16f,-.82f,.08f),magenta);

        if(player.GetComponent<CyberRunRunnerAnimator>()==null)
            player.gameObject.AddComponent<CyberRunRunnerAnimator>();
    }

    static void CreateCyberTunnel(Transform parent,int index)
    {
        Color frame=(index&1)==0
            ? new Color(.05f,1.2f,4f)
            : new Color(1.6f,.05f,3.5f);

        float z=0f;

        Cube("TunnelLeft",parent,
            new Vector3(.22f,7f,.22f),
            new Vector3(-4.55f,3.5f,z),frame,true);
        Cube("TunnelRight",parent,
            new Vector3(.22f,7f,.22f),
            new Vector3(4.55f,3.5f,z),frame,true);
        Cube("TunnelRoof",parent,
            new Vector3(9.1f,.24f,.22f),
            new Vector3(0,7f,z),frame,true);

        for(int i=0;i<5;i++)
        {
            Color light=(i&1)==0
                ? new Color(.04f,1.25f,4.2f)
                : new Color(1.7f,.06f,3.4f);

            Cube("TunnelLight",parent,
                new Vector3(1.2f,.055f,.10f),
                new Vector3(-3.4f+i*1.7f,6.72f,-11f+i*5.5f),
                light);
        }
    }

    static void OverheadFrame(Transform parent)
    {
        Color neon=new Color(.9f,.08f,.7f);
        Cube("FrameLeft",parent,new Vector3(.16f,6f,.16f),
            new Vector3(-4.65f,3f,0),neon);
        Cube("FrameRight",parent,new Vector3(.16f,6f,.16f),
            new Vector3(4.65f,3f,0),neon);
        Cube("FrameTop",parent,new Vector3(9.3f,.16f,.16f),
            new Vector3(0,6f,0),neon);
    }

    static GameObject Cube(string name,Transform parent,Vector3 scale,Vector3 localPos,Color color,bool withCollider=false)
    {
        var g=GameObject.CreatePrimitive(PrimitiveType.Cube);
        g.name=name;
        g.transform.SetParent(parent,false);
        g.transform.localScale=scale;
        g.transform.localPosition=localPos;
        ApplyMaterial(g.GetComponent<Renderer>(), color);

        if(!withCollider)
        {
            var unusedCollider=g.GetComponent<Collider>();
            if(unusedCollider!=null)
                Object.Destroy(unusedCollider);
        }

        return g;
    }

    static void ApplyMaterial(Renderer renderer, Color color)
    {
        if(renderer==null) return;

        int key=ColorKey(color);
        if(!materialCache.TryGetValue(key,out var mat)||mat==null)
        {
            Shader shader=Shader.Find("CyberRun/Unlit");
            if(shader==null) shader=Shader.Find("Universal Render Pipeline/Unlit");
            if(shader==null) shader=Shader.Find("Universal Render Pipeline/Lit");
            if(shader==null) shader=Shader.Find("Sprites/Default");
            if(shader==null) return;

            mat=new Material(shader);
            mat.name="CyberRunBaseMat_"+key;
            if(mat.HasProperty("_BaseColor"))
                mat.SetColor("_BaseColor",color);
            else if(mat.HasProperty("_Color"))
                mat.SetColor("_Color",color);
            if(mat.HasProperty("_EmissionColor"))
                mat.SetColor("_EmissionColor",color*.35f);
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

    static int ColorKey(Color color)
    {
        int r=Mathf.RoundToInt(color.r*256f);
        int g=Mathf.RoundToInt(color.g*256f);
        int b2=Mathf.RoundToInt(color.b*256f);
        int a2=Mathf.RoundToInt(color.a*256f);
        unchecked
        {
            return (((r*397)^g)*397^b2)*397^a2;
        }
    }

    static void Strip(Transform parent,float x)
    {
        Cube("NeonStrip",parent,new Vector3(.08f,.08f,SegmentLength),
            new Vector3(x,.18f,0),new Color(.1f,.8f,1f));
    }

    static void LaneStrip(Transform parent,float x)
    {
        Cube("LaneStrip",parent,new Vector3(.035f,.035f,SegmentLength),
            new Vector3(x,.16f,0),new Color(.05f,.35f,.55f));
    }

    void Update()
    {
        if(gameOver)
        {
            if(Keyboard.current?.rKey.wasPressedThisFrame == true)
                Restart();
            else if(IsRestartTapped())
                Restart();
            return;
        }

        // ContentSystems owns the start/pause state via Time.timeScale.
        // Never queue gameplay input while time is stopped.
        if(Time.timeScale<=.001f)
            return;

        InputFrame();
        float dt=Mathf.Min(Time.deltaTime,.05f);

        previousPlayerPosition=player.position;

        if(hitGraceTimer>0f)
            hitGraceTimer=Mathf.Max(0f,hitGraceTimer-dt);

        float difficulty=Mathf.Clamp01(distance/1800f);
        speed=Mathf.Min(
            21.5f,
            speed+dt*(.1f+difficulty*.045f));

        if(speedBurstTimer>0f)
        {
            speedBurstTimer=Mathf.Max(0f,speedBurstTimer-dt);
            if(speedBurstTimer<=0f)
                speedBurstBonus=0f;
        }

        float activeSpeed=CurrentSpeed;
        distance+=activeSpeed*dt;
        player.position += Vector3.forward*activeSpeed*dt;

        float targetX=lane*LaneWidth;
        float x=Mathf.Lerp(player.position.x,targetX,1f-Mathf.Exp(-14f*dt));
        yVelocity += -28f*dt;
        float y=player.position.y+yVelocity*dt;
        if(y<PlayerGroundY)
        {
            y=PlayerGroundY;
            yVelocity=0;
        }
        player.position=new Vector3(x,y,player.position.z);

        if(sliding && (slideTimer-=dt)<=0) SetSliding(false);

        UpdateMovingHazards();
        Recycle();
        RecenterWorldIfNeeded();
        FollowCamera(dt);
        Collide(previousPlayerPosition);
    }

    bool IsRestartTapped()
    {
        if(Touchscreen.current==null) return false;

        var t=Touchscreen.current.primaryTouch;
        if(t.press.wasPressedThisFrame)
        {
            touchStart=t.position.ReadValue();
            return false;
        }

        if(t.phase.ReadValue()==UnityEngine.InputSystem.TouchPhase.Canceled)
        {
            touchStart=Vector2.zero;
            return false;
        }

        if(!t.press.wasReleasedThisFrame) return false;

        Vector2 position=t.position.ReadValue();
        Vector2 delta=position-touchStart;
        touchStart=Vector2.zero;

        float tapThreshold=Mathf.Clamp(
            Mathf.Min(Screen.width,Screen.height)*.045f,24f,72f);
        if(delta.sqrMagnitude>tapThreshold*tapThreshold) return false;

        Vector2 guiPosition=new Vector2(position.x,Screen.height-position.y);
        Rect restartRect=new Rect(
            Screen.width*.5f-85f,
            Screen.height*.5f+28f,
            170f,
            46f);

        return restartRect.Contains(guiPosition);
    }

    void InputFrame()
    {
        if(Keyboard.current!=null)
        {
            if(Keyboard.current.leftArrowKey.wasPressedThisFrame||Keyboard.current.aKey.wasPressedThisFrame)
                lane=Mathf.Max(-1,lane-1);

            if(Keyboard.current.rightArrowKey.wasPressedThisFrame||Keyboard.current.dKey.wasPressedThisFrame)
                lane=Mathf.Min(1,lane+1);

            if((Keyboard.current.upArrowKey.wasPressedThisFrame||Keyboard.current.spaceKey.wasPressedThisFrame)
                &&player.position.y<=PlayerGroundY+.01f)
            {
                SetSliding(false);
                yVelocity=11f;
            }

            if(Keyboard.current.downArrowKey.wasPressedThisFrame && IsGrounded())
                Slide();
        }

        if(Touchscreen.current!=null)
        {
            var t=Touchscreen.current.primaryTouch;

            if(t.press.wasPressedThisFrame)
                touchStart=t.position.ReadValue();

            if(t.phase.ReadValue()==UnityEngine.InputSystem.TouchPhase.Canceled)
            {
                touchStart=Vector2.zero;
                return;
            }

            if(t.press.wasReleasedThisFrame)
            {
                Vector2 delta=t.position.ReadValue()-touchStart;
                float swipeThreshold=Mathf.Clamp(
                    Mathf.Min(Screen.width,Screen.height)*.07f,40f,110f);

                if(delta.magnitude>=swipeThreshold)
                {
                    if(Mathf.Abs(delta.x)>Mathf.Abs(delta.y))
                    {
                        lane=Mathf.Clamp(lane+(delta.x>0f?1:-1),-1,1);
                    }
                    else if(delta.y>0f && player.position.y<=PlayerGroundY+.01f)
                    {
                        SetSliding(false);
                        yVelocity=11f;
                    }
                    else if(delta.y<0f && IsGrounded())
                    {
                        Slide();
                    }
                }

                touchStart=Vector2.zero;
            }
        }
    }

    bool IsGrounded()
    {
        return player!=null
            && player.position.y<=PlayerGroundY+.02f
            && Mathf.Abs(yVelocity)<.25f;
    }

    void Slide()
    {
        slideTimer=.7f;
        SetSliding(true);
    }

    void SetSliding(bool value)
    {
        sliding=value;
        if(player==null) return;

        if(value)
        {
            float scaleY=playerBaseScale.y*.6f;
            float yOffset=(playerBaseScale.y-scaleY);
            var scale=playerBaseScale;
            scale.y=scaleY;
            player.localScale=scale;
            var pos=player.position;
            pos.y=PlayerGroundY-yOffset;
            player.position=pos;
        }
        else
        {
            player.localScale=playerBaseScale;
            var pos=player.position;
            if(pos.y<PlayerGroundY) pos.y=PlayerGroundY;
            player.position=pos;
        }
    }

    void RecenterWorldIfNeeded()
    {
        const float threshold=5000f;
        const float shift=4000f;

        if(player==null || player.position.z<threshold) return;

        player.position-=Vector3.forward*shift;

        for(int i=0;i<segments.Count;i++)
        {
            if(segments[i]!=null)
                segments[i].position-=Vector3.forward*shift;
        }

        if(cam!=null)
            cam.transform.position-=Vector3.forward*shift;

        previousPlayerPosition=player.position;
    }

    void UpdateMovingHazards()
    {
        float t=Time.time;
        float intensity=Mathf.InverseLerp(11f,25f,CurrentSpeed);
        float frequency=Mathf.Lerp(2.0f,2.65f,intensity);
        float amplitude=Mathf.Lerp(.34f,.52f,intensity);

        for(int i=0;i<movingHazards.Count;i++)
        {
            var hazard=movingHazards[i];
            if(hazard==null) continue;

            float phase=hazard.GetInstanceID()*.013f;
            Vector3 pos=hazard.localPosition;
            pos.y=1.55f+
                Mathf.Sin(t*frequency+phase)*amplitude;
            hazard.localPosition=pos;
        }
    }

    void Recycle()
    {
        float behind=player.position.z-50f;

        foreach(var s in segments)
        {
            if(s.position.z+SegmentLength*.5f<behind)
            {
                s.position += Vector3.forward*SegmentLength*SegmentCount;

                if(!segmentCycles.TryGetValue(s,out int cycle))
                    cycle=0;

                cycle++;
                segmentCycles[s]=cycle;
                ReconfigureSegmentObstacles(s,cycle);
            }
        }
    }

    void ReconfigureSegmentObstacles(Transform segment,int cycle)
    {
        if(!hazardCache.TryGetValue(segment,out var cached) ||
           cached==null || cached.Length<2)
            return;

        Transform first=null;
        Transform second=null;
        Transform movingLaser=null;

        for(int i=0;i<cached.Length;i++)
        {
            var child=cached[i];
            if(child==null) continue;

            if(child.name=="MovingLaser")
                movingLaser=child;
            else if(first==null)
                first=child;
            else if(second==null)
                second=child;
        }

        if(first==null||second==null) return;

        int difficultyStep=Mathf.FloorToInt(
            distance/1800f);
        int segmentIndex=0;
        if(segment.name.StartsWith("Segment_"))
            int.TryParse(segment.name.Substring(8),out segmentIndex);
        int basePattern=cycle<=0
            ? PositiveModulo(segmentIndex,8)
            : PatternIndex(segmentIndex,cycle,difficultyStep);

        int[] selected=HazardLanePatterns[basePattern];

        for(int i=0;i<2;i++)
        {
            var hazard=i==0 ? first : second;
            if(hazard==null) continue;

            float x=selected[i]*LaneWidth;
            hazard.localPosition=new Vector3(
                x,hazard.localPosition.y,hazard.localPosition.z);
        }

        if((cycle&3)==3)
        {
            int shift=PatternIndex(segmentIndex,cycle,3)%3-1;
            for(int i=0;i<2;i++)
            {
                var hazard=i==0 ? first : second;
                float laneX=Mathf.Clamp(
                    (hazard.localPosition.x/LaneWidth)+shift,-1f,1f);
                hazard.localPosition=new Vector3(
                    laneX*LaneWidth,
                    hazard.localPosition.y,
                    hazard.localPosition.z);
            }
        }

        if(movingLaser!=null)
        {
            int chosenLane=cycle<=0
                ? PositiveModulo(segmentIndex/3,3)-1
                : PatternIndex(segmentIndex,cycle,5)%3-1;
            bool collidesWithStatic=
                Mathf.Abs(first.localPosition.x-
                    chosenLane*LaneWidth)<.01f ||
                Mathf.Abs(second.localPosition.x-
                    chosenLane*LaneWidth)<.01f;

            if(collidesWithStatic)
                chosenLane=Mathf.Clamp(chosenLane+1,-1,1);

            movingLaser.localPosition=new Vector3(
                chosenLane*LaneWidth,
                1.55f,
                2.5f);
        }
    }

    static int PositiveModulo(int value,int modulus)
    {
        int remainder=value%modulus;
        return remainder<0 ? remainder+modulus : remainder;
    }

    static int PatternIndex(int segmentIndex,int cycle,int salt)
    {
        unchecked
        {
            uint hash=(uint)segmentIndex*73856093u;
            hash^=(uint)cycle*19349663u;
            hash^=(uint)salt*83492791u;
            hash^=hash>>13;
            hash*=1274126177u;
            return (int)(hash%8u);
        }
    }

    void FollowCamera(float dt)
    {
        if(!cam) return;

        Vector3 target=new Vector3(player.position.x*.35f,4.8f,player.position.z-8f);
        cam.transform.position=Vector3.Lerp(
            cam.transform.position,
            target,
            1f-Mathf.Exp(-7f*dt));

        cam.transform.LookAt(
            player.position+Vector3.up*.7f+Vector3.forward*9f);
    }

    void Collide(Vector3 previousPosition)
    {
        if(playerCollider==null||hitGraceTimer>0f) return;

        Physics.SyncTransforms();

        Bounds sweptBounds=playerCollider.bounds;
        Vector3 movement=player.position-previousPosition;
        sweptBounds.Expand(new Vector3(
            Mathf.Abs(movement.x),
            Mathf.Abs(movement.y),
            Mathf.Abs(movement.z)));

        for(int i=0;i<obstacles.Count;i++)
        {
            var obstacle=obstacles[i];
            if(obstacle!=null && sweptBounds.Intersects(obstacle.bounds))
            {
                gameOver=true;
                SetSliding(false);
                return;
            }
        }
    }

    void Restart()
    {
        ResetVersion++;
        lane=0;
        speed=11f;
        speedBurstTimer=0f;
        speedBurstBonus=0f;
        distance=0f;
        yVelocity=0f;
        gameOver=false;
        sliding=false;
        slideTimer=0f;
        hitGraceTimer=0f;
        touchStart=Vector2.zero;

        if(player!=null)
        {
            SetSliding(false);
            Physics.SyncTransforms();
            player.position=new Vector3(0,PlayerGroundY,4f);
            player.localScale=playerBaseScale;
            player.rotation=Quaternion.identity;
            previousPlayerPosition=player.position;
        }

        segmentCycles.Clear();

        for(int i=0;i<segments.Count;i++)
        {
            if(segments[i]!=null)
            {
                segments[i].position=new Vector3(
                    0,0,18f+i*SegmentLength);
                ReconfigureSegmentObstacles(segments[i],0);
            }
        }

        Physics.SyncTransforms();

        if(cam!=null)
        {
            cam.transform.position=new Vector3(0,5,-8);
            cam.transform.LookAt(new Vector3(0,1.8f,13));
        }
    }


    }
