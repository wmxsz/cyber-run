using System;
using System.Collections;
using UnityEngine;

public sealed class CyberRunMusicSystem : MonoBehaviour
{
    CyberRunBootstrap bootstrap;
    AudioSource source;
    AudioClip music;

    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
    static void Install()
    {
        if(FindAnyObjectByType<CyberRunMusicSystem>()!=null) return;

        var go=new GameObject("CyberRunMusicSystem");
        go.AddComponent<CyberRunMusicSystem>();
        DontDestroyOnLoad(go);
    }

    IEnumerator Start()
    {
        yield return null;
        bootstrap=FindAnyObjectByType<CyberRunBootstrap>();
        if(bootstrap==null) yield break;

        source=gameObject.AddComponent<AudioSource>();
        source.playOnAwake=false;
        source.loop=true;
        source.spatialBlend=0f;
        source.volume=.025f;
        source.priority=32;

        music=CreateCyberTrack();
        source.clip=music;
        source.Play();
    }

    AudioClip CreateCyberTrack()
    {
        const int rate=22050;
        const float bars=8f;
        const float bpm=118f;
        const float beat=60f/bpm;
        float seconds=beat*4f*bars;
        int samples=Mathf.CeilToInt(seconds*rate);

        var clip=AudioClip.Create(
            "CyberRun_MainTheme",samples,1,rate,false);
        var data=new float[samples];

        for(int i=0;i<samples;i++)
        {
            float t=i/(float)rate;
            float phase=(t/beat)%4f;
            float barIndex=Mathf.Floor(t/(beat*4f));

            float kick=Kick(t,beat);
            float bass=Bass(t,beat,barIndex);
            float arp=Arp(t,beat,barIndex);
            float pad=Pad(t,barIndex);
            float noise=HashNoise(i)*.008f;

            float duck=1f-Mathf.Clamp01(kick*.9f);
            data[i]=(kick*.26f+bass*.16f+arp*.075f*duck+pad*.035f+noise);

            if(i>samples-rate/20)
            {
                float fade=Mathf.InverseLerp(
                    samples-rate/20,samples-1,i);
                data[i]*=1f-fade;
            }
        }

        clip.SetData(data,0);
        return clip;
    }

    float Kick(float t,float beat)
    {
        float p=Mathf.Repeat(t,beat);
        float env=Mathf.Exp(-p*18f);
        float f=Mathf.Lerp(155f,52f,
            Mathf.Clamp01(p/Mathf.Max(.001f,beat*.32f)));
        return Mathf.Sin(2f*Mathf.PI*f*t)*env;
    }

    float Bass(float t,float beat,float bar)
    {
        int step=Mathf.FloorToInt(
            Mathf.Repeat(t,beat*4f)/beat);

        int[] notes={0,0,7,0,10,0,3,0};
        int note=notes[Mathf.Abs(
            (Mathf.FloorToInt(bar)*2+step)%notes.Length)];

        float semitone=Mathf.Pow(
            2f,(note-12f)/12f);
        float f=55f*semitone;

        float p=Mathf.Repeat(t,beat);
        float env=.6f+.4f*Mathf.Exp(-p*5f);
        return Mathf.Sin(2f*Mathf.PI*f*t)*env;
    }

    float Arp(float t,float beat,float bar)
    {
        int[] notes={12,19,24,31,24,19,15,19};
        int idx=Mathf.FloorToInt(
            t/(beat*.5f))%notes.Length;
        int note=notes[Mathf.Abs(
            (idx+Mathf.FloorToInt(bar))%notes.Length)];

        float f=110f*Mathf.Pow(
            2f,(note-12f)/12f);
        float env=Mathf.Exp(
            -Mathf.Repeat(t,beat*.5f)*13f);

        return Mathf.Sin(2f*Mathf.PI*f*t)*
            (Mathf.Sin(t*3f)+1.4f)*.42f*env;
    }

    float Pad(float t,float bar)
    {
        int[] chords={0,5,10,7};
        int chord=Mathf.Abs(
            Mathf.FloorToInt(bar))%chords.Length;
        float root=110f*Mathf.Pow(
            2f,chords[chord]/12f);

        float a=Mathf.Sin(2f*Mathf.PI*root*t);
        float b=Mathf.Sin(2f*Mathf.PI*root*1.5f*t);
        float c=Mathf.Sin(2f*Mathf.PI*root*2f*t);

        return (a+b*.55f+c*.28f)/3f;
    }

    float HashNoise(int sample)
    {
        uint x=(uint)sample;
        x^=x<<13;
        x^=x>>17;
        x^=x<<5;
        return ((x&0xffff)/32768f)-1f;
    }

    void Update()
    {
        if(source==null||bootstrap==null) return;

        if(Time.timeScale<=.001f)
        {
            source.volume=Mathf.MoveTowards(
                source.volume,0f,
                Time.unscaledDeltaTime*.06f);
            return;
        }

        float speed=bootstrap.CurrentSpeed;
        float intensity=Mathf.InverseLerp(11f,19f,speed);

        source.pitch=Mathf.Lerp(.94f,1.06f,intensity);
        source.volume=Mathf.Lerp(.018f,.035f,intensity);
    }

    void OnDestroy()
    {
        if(music!=null)
            Destroy(music);
    }
}
