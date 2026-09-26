using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public sealed class CyberRunVisualOverdrive : MonoBehaviour
{
    static readonly Dictionary<string,Material> materials=new();
    Shader surfaceShader;

    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
    static void Install()
    {
        var existing=FindFirstObjectByType<CyberRunVisualOverdrive>();
        if(existing!=null) return;

        var host=new GameObject("CyberRunVisualOverdrive");
        host.AddComponent<CyberRunVisualOverdrive>();
        DontDestroyOnLoad(host);
    }

    IEnumerator Start()
    {
        yield return null;
        yield return null;
        surfaceShader=Shader.Find("CyberRun/Surface");
        if(surfaceShader==null) yield break;

        ApplyToWorld();
    }

    void ApplyToWorld()
    {
        var renderers=FindObjectsByType<Renderer>(
            FindObjectsInactive.Exclude,
            FindObjectsSortMode.None);

        for(int i=0;i<renderers.Length;i++)
        {
            var r=renderers[i];
            if(r==null) continue;

            var ps=r.GetComponent<ParticleSystemRenderer>();
            if(ps!=null) continue;

            var canvas=r.GetComponentInParent<Canvas>();
            if(canvas!=null) continue;

            string name=r.gameObject.name;

            // Specialized visual passes own these renderers.
            if(name.Contains("Building",System.StringComparison.Ordinal) ||
               name=="Road" ||
               name=="HologramBillboard" ||
               name=="NeonDetail" ||
               name.StartsWith("CoinHalo",System.StringComparison.Ordinal) ||
               name.StartsWith("CoinCore",System.StringComparison.Ordinal) ||
               name.StartsWith("PowerRing_",System.StringComparison.Ordinal) ||
               name=="AntennaCore" ||
               name=="AntennaBeacon")
                continue;

            Color baseColor=ReadBaseColor(r);
            var style=GetStyle(name,baseColor);

            string key=BuildMaterialKey(style,baseColor);

            if(!materials.TryGetValue(key,out var mat)||mat==null)
            {
                mat=new Material(surfaceShader);
                mat.name="CyberVisual_"+style+"_"+key;
                mat.enableInstancing=true;
                SetSurface(mat,baseColor,style);
                materials[key]=mat;
            }

            r.sharedMaterial=mat;
            r.shadowCastingMode=
                UnityEngine.Rendering.ShadowCastingMode.Off;
            r.receiveShadows=false;
            r.lightProbeUsage=
                UnityEngine.Rendering.LightProbeUsage.Off;
            r.reflectionProbeUsage=
                UnityEngine.Rendering.ReflectionProbeUsage.Off;
        }
    }

    Color ReadBaseColor(Renderer renderer)
    {
        var mat=renderer.sharedMaterial;
        if(mat!=null)
        {
            if(mat.HasProperty("_BaseColor"))
                return mat.GetColor("_BaseColor");
            if(mat.HasProperty("_Color"))
                return mat.GetColor("_Color");
        }

        return new Color(.04f,.05f,.09f,1f);
    }

    string GetStyle(string name,Color color)
    {
        if(name.Contains("Building",System.StringComparison.Ordinal))
            return "CITY";

        if(name.Contains("Road",System.StringComparison.Ordinal) ||
           name.Contains("LaneStrip",System.StringComparison.Ordinal))
            return "ROAD";

        if(name.Contains("Neon",System.StringComparison.Ordinal) ||
           name.Contains("Frame",System.StringComparison.Ordinal) ||
           name.Contains("Sign",System.StringComparison.Ordinal) ||
           name.Contains("SkyRail",System.StringComparison.Ordinal))
            return "NEON";

        if(name.Contains("Obstacle",System.StringComparison.Ordinal) ||
           name.Contains("SlideGate",System.StringComparison.Ordinal) ||
           name.Contains("JumpObstacle",System.StringComparison.Ordinal))
            return "HAZARD";

        if(name.Contains("Coin",System.StringComparison.Ordinal))
            return "COIN";

        if(name.Contains("Core",System.StringComparison.Ordinal))
            return "POWER";

        if(name.Contains("Car",System.StringComparison.Ordinal) ||
           name.Contains("Drone",System.StringComparison.Ordinal))
            return "TRAFFIC";

        if(name.Contains("Torso",System.StringComparison.Ordinal) ||
           name.Contains("Head",System.StringComparison.Ordinal) ||
           name.Contains("Arm",System.StringComparison.Ordinal) ||
           name.Contains("Leg",System.StringComparison.Ordinal) ||
           name.Contains("Boot",System.StringComparison.Ordinal) ||
           name.Contains("Visor",System.StringComparison.Ordinal) ||
           name.Contains("Shoulder",System.StringComparison.Ordinal) ||
           name.Contains("Chest",System.StringComparison.Ordinal))
            return "RUNNER";

        return "GENERAL";
    }

    string BuildMaterialKey(string style,Color color)
    {
        int r=Mathf.RoundToInt(color.r*32f);
        int g=Mathf.RoundToInt(color.g*32f);
        int b=Mathf.RoundToInt(color.b*32f);
        return style+"_"+r+"_"+g+"_"+b;
    }

    void SetSurface(Material mat,Color baseColor,string style)
    {
        Color rim=baseColor;
        float glow=.2f;
        float strength=1f;
        float pulse=1.7f;

        switch(style)
        {
            case "CITY":
                rim=(Mathf.Abs(Mathf.Floor(baseColor.r*10f))%2==0)
                    ? new Color(.04f,1.3f,4f,1f)
                    : new Color(1.6f,.05f,3.6f,1f);
                glow=.32f;
                strength=1.35f;
                pulse=1.35f;
                break;

            case "ROAD":
                rim=new Color(.03f,.75f,2.2f,1f);
                glow=.12f;
                strength=.8f;
                pulse=1.1f;
                break;

            case "NEON":
                rim=baseColor;
                glow=.72f;
                strength=2.5f;
                pulse=3.2f;
                break;

            case "HAZARD":
                rim=new Color(2.2f,.04f,.42f,1f);
                glow=.58f;
                strength=2.15f;
                pulse=4.2f;
                break;

            case "COIN":
                rim=new Color(2.8f,1.05f,.05f,1f);
                glow=.72f;
                strength=2.7f;
                pulse=3.7f;
                break;

            case "POWER":
                rim=baseColor;
                glow=.85f;
                strength=2.8f;
                pulse=4.8f;
                break;

            case "TRAFFIC":
                rim=new Color(.05f,1.05f,3.2f,1f);
                glow=.44f;
                strength=1.8f;
                pulse=2.6f;
                break;

            case "RUNNER":
                rim=new Color(.12f,1.25f,3.8f,1f);
                glow=.5f;
                strength=1.9f;
                pulse=2.3f;
                break;
        }

        mat.SetColor("_BaseColor",baseColor);
        mat.SetFloat("_GlowStrength",glow);
        mat.SetColor("_RimColor",rim);
        mat.SetFloat("_RimStrength",strength);
        mat.SetFloat("_PulseSpeed",pulse);
    }
}
