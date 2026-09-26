using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.SceneManagement;
using System.Collections.Generic;

public sealed class CyberRunBootstrap : MonoBehaviour
{
    const float LaneWidth = 2.7f;
    const float SegmentLength = 36f;
    const int SegmentCount = 14;
    readonly List<Transform> segments = new();
    Transform player;
    Camera cam;
    int lane;
    float speed = 11f, distance;
    float yVelocity;
    bool gameOver, sliding;
    float slideTimer;
    Vector2 touchStart;

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
        player.position = new Vector3(0,1.1f,4);
        player.localScale = new Vector3(.72f,1.05f,.72f);
        ApplyMaterial(player.GetComponent<Renderer>(), new Color(.05f,.85f,1f));

        for(int i=0;i<SegmentCount;i++) CreateSegment(i, 18f+i*SegmentLength);

        var camGo = new GameObject("Main Camera");
        cam = camGo.AddComponent<Camera>();
        cam.tag = "MainCamera";
        cam.fieldOfView = 68f;
        cam.nearClipPlane = .05f;
        cam.farClipPlane = 220f;
        cam.transform.position = new Vector3(0,5,-8);
    }

    void CreateSegment(int index,float z)
    {
        var root = new GameObject("Segment_"+index).transform;
        root.position = new Vector3(0,0,z);
        var road = Cube("Road",root,new Vector3(9,.25f,SegmentLength),Vector3.zero,new Color(.025f,.035f,.06f));
        Strip(root,-4.2f); Strip(root,4.2f);
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
            Cube("Obstacle",root,new Vector3(1.8f,1.4f,1.1f),
                new Vector3(x,.7f,-8f+o*17f),new Color(1f,.12f,.05f));
        }
        segments.Add(root);
    }

    static GameObject Cube(string name,Transform parent,Vector3 scale,Vector3 localPos,Color color)
    {
        var g=GameObject.CreatePrimitive(PrimitiveType.Cube);
        g.name=name; g.transform.SetParent(parent,false);
        g.transform.localScale=scale; g.transform.localPosition=localPos;
        ApplyMaterial(g.GetComponent<Renderer>(), color);
        return g;
    }

    static void ApplyMaterial(Renderer renderer, Color color)
    {
        if(!renderer) return;
        Shader shader = Shader.Find("Universal Render Pipeline/Unlit");
        if(shader == null) shader = Shader.Find("Universal Render Pipeline/Lit");
        if(shader == null) shader = Shader.Find("Sprites/Default");
        if(shader == null) return;
        var mat = new Material(shader);
        mat.color = color;
        if(mat.HasProperty("_BaseColor")) mat.SetColor("_BaseColor", color);
        if(mat.HasProperty("_EmissionColor")) mat.SetColor("_EmissionColor", color * 0.35f);
        renderer.sharedMaterial = mat;
    }

    static void Strip(Transform parent,float x)
    {
        Cube("NeonStrip",parent,new Vector3(.08f,.08f,SegmentLength),new Vector3(x,.18f,0),new Color(.1f,.8f,1f));
    }

    void Update()
    {
        if(gameOver)
        {
            if(Keyboard.current?.rKey.wasPressedThisFrame == true) Restart();
            return;
        }

        InputFrame();
        float dt=Mathf.Min(Time.deltaTime,.05f);
        speed=Mathf.Min(19f,speed+dt*.1f);
        distance+=speed*dt;
        player.position += Vector3.forward*speed*dt;

        float targetX=lane*LaneWidth;
        float x=Mathf.Lerp(player.position.x,targetX,1f-Mathf.Exp(-14f*dt));
        yVelocity += -28f*dt;
        float y=player.position.y+yVelocity*dt;
        if(y<1.1f){y=1.1f;yVelocity=0;}
        player.position=new Vector3(x,y,player.position.z);

        if(sliding && (slideTimer-=dt)<=0) sliding=false;
        Recycle();
        FollowCamera(dt);
        Collide();
    }

    void InputFrame()
    {
        if(Keyboard.current!=null)
        {
            if(Keyboard.current.leftArrowKey.wasPressedThisFrame||Keyboard.current.aKey.wasPressedThisFrame) lane=Mathf.Max(-1,lane-1);
            if(Keyboard.current.rightArrowKey.wasPressedThisFrame||Keyboard.current.dKey.wasPressedThisFrame) lane=Mathf.Min(1,lane+1);
            if((Keyboard.current.upArrowKey.wasPressedThisFrame||Keyboard.current.spaceKey.wasPressedThisFrame)&&player.position.y<=1.11f) yVelocity=11f;
            if(Keyboard.current.downArrowKey.wasPressedThisFrame) Slide();
        }
        if(Touchscreen.current!=null)
        {
            var t=Touchscreen.current.primaryTouch;
            if(t.press.wasPressedThisFrame) touchStart=t.position.ReadValue();
            if(t.press.wasReleasedThisFrame)
            {
                Vector2 d=t.position.ReadValue()-touchStart;
                if(d.magnitude>=55f)
                {
                    if(Mathf.Abs(d.x)>Mathf.Abs(d.y)) lane=Mathf.Clamp(lane+(d.x>0?1:-1),-1,1);
                    else if(d.y>0f && player.position.y<=1.11f) yVelocity=11f;
                    else if(d.y<0f) Slide();
                }
            }
        }
    }

    void Slide(){sliding=true;slideTimer=.7f;}

    void Recycle()
    {
        float behind=player.position.z-50f;
        foreach(var s in segments)
            if(s.position.z+SegmentLength*.5f<behind)
                s.position += Vector3.forward*SegmentLength*SegmentCount;
    }

    void FollowCamera(float dt)
    {
        if(!cam) return;
        Vector3 target=new Vector3(player.position.x*.35f,4.8f,player.position.z-8f);
        cam.transform.position=Vector3.Lerp(cam.transform.position,target,1f-Mathf.Exp(-7f*dt));
        cam.transform.LookAt(player.position+Vector3.up*.7f+Vector3.forward*9f);
    }

    void Collide()
    {
        Vector3 p=player.position;
        foreach(var s in segments)
            foreach(var o in s.GetComponentsInChildren<Transform>())
                if(o.name=="Obstacle" && Mathf.Abs(o.position.z-p.z)<1.05f && Mathf.Abs(o.position.x-p.x)<1.25f && p.y<2f)
                { gameOver=true; return; }
    }

    void Restart()
    {
        SceneManager.LoadScene(SceneManager.GetActiveScene().buildIndex);
    }

    void OnGUI()
    {
        GUI.Label(new Rect(24,18,700,40),"CYBER RUN   DIST "+distance.ToString("00000")+"   SPEED "+speed.ToString("0.0"));
        if(gameOver)
        {
            GUI.Box(new Rect(Screen.width*.5f-170,Screen.height*.5f-80,340,160),"RUN TERMINATED");
            if(GUI.Button(new Rect(Screen.width*.5f-85,Screen.height*.5f+5,170,50),"RESTART")) Restart();
        }
    }
}