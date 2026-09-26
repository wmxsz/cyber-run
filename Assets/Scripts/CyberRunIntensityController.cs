using System.Collections;
using UnityEngine;

public sealed class CyberRunIntensityController : MonoBehaviour
{
    CyberRunBootstrap bootstrap;
    UnityEngine.Rendering.Volume volume;
    UnityEngine.Rendering.Universal.Bloom bloom;
    UnityEngine.Rendering.Universal.ColorAdjustments grading;
    ParticleSystem rain;

    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
    static void Install()
    {
        if(FindFirstObjectByType<CyberRunIntensityController>()!=null) return;

        var go=new GameObject("CyberRunIntensityController");
        go.AddComponent<CyberRunIntensityController>();
        DontDestroyOnLoad(go);
    }

    IEnumerator Start()
    {
        yield return null;
        yield return null;
        yield return null;

        bootstrap=FindFirstObjectByType<CyberRunBootstrap>();
        var post=GameObject.Find("CyberRunPostFX");

        if(post!=null)
        {
            volume=post.GetComponent<UnityEngine.Rendering.Volume>();
            if(volume!=null&&volume.profile!=null)
            {
                volume.profile.TryGet(out bloom);
                volume.profile.TryGet(out grading);
            }
        }

        var rainGo=GameObject.Find("CyberRain");
        if(rainGo!=null)
            rain=rainGo.GetComponent<ParticleSystem>();
    }

    void Update()
    {
        if(bootstrap==null) return;

        float distance=Mathf.Max(0f,bootstrap.Distance);
        float intensity=Mathf.Clamp01(distance/2200f);
        float speed=Mathf.InverseLerp(11f,19f,bootstrap.CurrentSpeed);

        if(bloom!=null)
        {
            bloom.intensity.value=
                Mathf.Lerp(1.05f,1.75f,Mathf.Max(intensity,speed*.7f));
            bloom.threshold.value=
                Mathf.Lerp(.76f,.58f,speed);
        }

        if(grading!=null)
        {
            grading.postExposure.value=
                Mathf.Lerp(.08f,.24f,intensity);
            grading.contrast.value=
                Mathf.Lerp(7f,16f,intensity);
            grading.saturation.value=
                Mathf.Lerp(8f,21f,intensity);
        }

        RenderSettings.fogDensity=
            Mathf.Lerp(.0052f,.0074f,Mathf.Max(intensity,speed*.35f));

        if(rain!=null)
        {
            var emission=rain.emission;
            emission.rateOverTime=
                Mathf.Lerp(58f,128f,Mathf.Max(intensity,speed*.55f));
        }
    }
}
