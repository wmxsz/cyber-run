using System.Collections;
using UnityEngine;

public sealed class CyberRunEngineAudio : MonoBehaviour
{
    CyberRunBootstrap bootstrap;
    AudioSource source;
    AudioClip engineClip;

    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
    static void Install()
    {
        if(FindFirstObjectByType<CyberRunEngineAudio>()!=null) return;

        var go=new GameObject("CyberRunEngineAudio");
        go.AddComponent<CyberRunEngineAudio>();
        DontDestroyOnLoad(go);
    }

    IEnumerator Start()
    {
        yield return null;
        bootstrap=FindFirstObjectByType<CyberRunBootstrap>();
        if(bootstrap==null) yield break;

        source=gameObject.AddComponent<AudioSource>();
        source.loop=true;
        source.playOnAwake=false;
        source.spatialBlend=0f;
        source.volume=.045f;

        engineClip=CreateEngineClip();
        source.clip=engineClip;
        source.Play();
    }

    AudioClip CreateEngineClip()
    {
        const int rate=22050;
        const float length=2f;
        int samples=(int)(rate*length);
        var clip=AudioClip.Create("CyberEngine",samples,1,rate,true);
        var data=new float[samples];

        for(int i=0;i<samples;i++)
        {
            float t=i/(float)rate;
            float low=Mathf.Sin(2f*Mathf.PI*54f*t);
            float mid=Mathf.Sin(2f*Mathf.PI*108f*t)*.42f;
            float grit=Mathf.Sin(2f*Mathf.PI*173f*t)*.16f;
            float pulse=.75f+.25f*Mathf.Sin(
                2f*Mathf.PI*.8f*t);
            data[i]=(low+mid+grit)*pulse*.22f;
        }

        clip.SetData(data,0);
        return clip;
    }

    void Update()
    {
        if(source==null||bootstrap==null) return;

        float speed=bootstrap.CurrentSpeed;
        float normalized=Mathf.InverseLerp(11f,19f,speed);

        source.pitch=Mathf.Lerp(.88f,1.34f,normalized);
        source.volume=Mathf.Lerp(.028f,.065f,normalized);
    }
}
