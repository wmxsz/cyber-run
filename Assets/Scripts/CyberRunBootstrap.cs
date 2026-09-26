using UnityEngine;
using UnityEngine.InputSystem;
using System.Collections.Generic;

public sealed class CyberRunBootstrap : MonoBehaviour
{
    const float LaneWidth = 2.7f;
    const float SegmentLength = 36f;
    const int SegmentCount = 14;
    readonly List<Transform> segments = new();
    readonly List<Collider> obstacles = new();
    Transform player;
    Camera cam;
    int lane;
    float speed = 11f, distance;
    float yVelocity;
    bool gameOver, sliding;
    float slideTimer;
    Vector2 touchStart;
    Vector3 previousPlayerPosition;
    CapsuleCollider playerCollider;
    Vector3 playerBaseScale;
    const float PlayerGroundY = 1.1f;

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
        ApplyMaterial(player.GetComponent<Renderer>(), new Color(.05f,.85f,1f));
        playerCollider = player.GetComponent<CapsuleCollider>();
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

        for(int side=-1;side<=1;side+=2)
            for(int b=0;b<3;b++)
            {
                float h=6f+b*3f;
                Cube("Building",root,new Vector3(2.2f,h,8f),
                    new Vector3(side*(7f+b*2.3f),h*.5f,-10f+b*11f),
                    new Color(.035f,.055f,.11f));
            }

        for(int o=0;o<2;o++)
        {
            float x=(((index+o)%3)-1)*LaneWidth;
            bool slideGate=((index+o)&1)==1;
            Vector3 scale=slideGate
                ? new Vector3(1.8f,.4f,1.1f)
                : new Vector3(1.8f,1.4f,1.1f);
            Vector3 localPos=slideGate
                ? new Vector3(x,2.15f,-8f+o*17f)
                : new Vector3(x,.7f,-8f+o*17f);

            var obstacle=Cube(slideGate?"SlideGate":"JumpObstacle",root,scale,localPos,
                slideGate?new Color(1f,.25f,.85f):new Color(1f,.12f,.05f));
            var obstacleCollider=obstacle.GetComponent<Collider>();
            if(obstacleCollider!=null) obstacles.Add(obstacleCollider);
        }

        segments.Add(root);
    }

    static GameObject Cube(string name,Transform parent,Vector3 scale,Vector3 localPos,Color color)
    {
        var g=GameObject.CreatePrimitive(PrimitiveType.Cube);
        g.name=name;
        g.transform.SetParent(parent,false);
        g.transform.localScale=scale;
        g.transform.localPosition=localPos;
        ApplyMaterial(g.GetComponent<Renderer>(), color);
        return g;
    }

    static void ApplyMaterial(Renderer renderer, Color color)
    {
        if(!renderer) return;
        Shader shader = Shader.Find("CyberRun/Unlit");
        if(shader == null) shader = Shader.Find("Universal Render Pipeline/Unlit");
        if(shader == null) shader = Shader.Find("Universal Render Pipeline/Lit");
        if(shader == null) shader = Shader.Find("Sprites/Default");
        if(shader == null) return;

        var mat = new Material(shader);
        if(mat.HasProperty("_BaseColor")) mat.SetColor("_BaseColor", color);
        else if(mat.HasProperty("_Color")) mat.SetColor("_Color", color);
        if(mat.HasProperty("_EmissionColor")) mat.SetColor("_EmissionColor", color * 0.35f);
        renderer.sharedMaterial = mat;
    }

    static void Strip(Transform parent,float x)
    {
        Cube("NeonStrip",parent,new Vector3(.08f,.08f,SegmentLength),
            new Vector3(x,.18f,0),new Color(.1f,.8f,1f));
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

        InputFrame();
        float dt=Mathf.Min(Time.deltaTime,.05f);

        previousPlayerPosition=player.position;

        speed=Mathf.Min(19f,speed+dt*.1f);
        distance+=speed*dt;
        player.position += Vector3.forward*speed*dt;

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

        Recycle();
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

        if(!t.press.wasReleasedThisFrame) return false;

        Vector2 position=t.position.ReadValue();
        Vector2 delta=position-touchStart;
        touchStart=Vector2.zero;

        if(delta.sqrMagnitude>30f*30f) return false;

        Vector2 guiPosition=new Vector2(position.x,Screen.height-position.y);
        Rect restartRect=new Rect(
            Screen.width*.5f-85f,
            Screen.height*.5f+5f,
            170f,
            50f);

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

            if(t.press.wasReleasedThisFrame)
            {
                Vector2 delta=t.position.ReadValue()-touchStart;

                if(delta.magnitude>=55f)
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

    void Recycle()
    {
        float behind=player.position.z-50f;

        foreach(var s in segments)
        {
            if(s.position.z+SegmentLength*.5f<behind)
                s.position += Vector3.forward*SegmentLength*SegmentCount;
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
        if(playerCollider==null) return;

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
        lane=0;
        speed=11f;
        distance=0f;
        yVelocity=0f;
        gameOver=false;
        sliding=false;
        slideTimer=0f;
        touchStart=Vector2.zero;

        if(player!=null)
        {
            SetSliding(false);
            player.position=new Vector3(0,PlayerGroundY,4f);
            player.localScale=playerBaseScale;
            player.rotation=Quaternion.identity;
            previousPlayerPosition=player.position;
        }

        for(int i=0;i<segments.Count;i++)
        {
            if(segments[i]!=null)
                segments[i].position=new Vector3(0,0,18f+i*SegmentLength);
        }

        if(cam!=null)
        {
            cam.transform.position=new Vector3(0,5,-8);
            cam.transform.LookAt(new Vector3(0,1.8f,13));
        }
    }

    void OnGUI()
    {
        GUI.Label(
            new Rect(24,18,700,40),
            "CYBER RUN   DIST "+distance.ToString("00000")+"   SPEED "+speed.ToString("0.0"));

        if(gameOver)
        {
            GUI.Box(
                new Rect(Screen.width*.5f-170,Screen.height*.5f-80,340,160),
                "RUN TERMINATED");

            if(GUI.Button(
                new Rect(Screen.width*.5f-85,Screen.height*.5f+5,170,50),
                "RESTART"))
            {
                Restart();
            }
        }
    }
}
