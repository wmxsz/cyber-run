using System;
using System.Collections;
using UnityEngine;

public sealed class CyberRunSectorPalette : MonoBehaviour
{
    CyberRunBootstrap bootstrap;
    Renderer[] renderers;
    readonly MaterialPropertyBlock block=new();
    float refreshTimer=-1f;
    int activeSector=-1;

    struct Palette
    {
        public Color cyan;
        public Color magenta;
        public Color gold;
        public Color road;
    }

    static readonly Palette[] palettes=
    {
        new Palette
        {
            cyan=new Color(.03f,1.5f,4.8f,1f),
            magenta=new Color(1.8f,.04f,4f,1f),
            gold=new Color(2.4f,1.0f,.04f,1f),
            road=new Color(.02f,.75f,2.1f,1f)
        },
        new Palette
        {
            cyan=new Color(.12f,.65f,3.2f,1f),
            magenta=new Color(2.1f,.02f,3.8f,1f),
            gold=new Color(1.5f,.08f,2.9f,1f),
            road=new Color(.38f,.08f,1.55f,1f)
        },
        new Palette
        {
            cyan=new Color(.05f,1.2f,3.2f,1f),
            magenta=new Color(1.15f,.12f,2.1f,1f),
            gold=new Color(3.1f,1.35f,.04f,1f),
            road=new Color(1.15f,.32f,.035f,1f)
        },
        new Palette
        {
            cyan=new Color(.02f,2.0f,3.5f,1f),
            magenta=new Color(.18f,1.9f,3.4f,1f),
            gold=new Color(.65f,1.9f,.08f,1f),
            road=new Color(.03f,1.35f,1.8f,1f)
        }
    };

    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
    static void Install()
    {
        if(FindFirstObjectByType<CyberRunSectorPalette>()!=null) return;

        var go=new GameObject("CyberRunSectorPalette");
        go.AddComponent<CyberRunSectorPalette>();
        DontDestroyOnLoad(go);
    }

    IEnumerator Start()
    {
        yield return null;
        yield return null;
        bootstrap=FindFirstObjectByType<CyberRunBootstrap>();

        renderers=FindObjectsByType<Renderer>(
            FindObjectsInactive.Exclude,
            FindObjectsSortMode.None);
    }

    void Update()
    {
        if(bootstrap==null||renderers==null||renderers.Length==0) return;

        if(refreshTimer>0f)
        {
            refreshTimer-=Time.unscaledDeltaTime;
            return;
        }

        refreshTimer=.65f;

        float distance=Mathf.Max(0f,bootstrap.Distance);
        int sector=Mathf.Max(0,Mathf.FloorToInt(distance/650f));

        if(sector==activeSector) return;
        activeSector=sector;

        Palette p=palettes[sector%palettes.Length];
        ApplyPalette(p,sector);
    }

    void ApplyPalette(Palette p,int sector)
    {
        for(int i=0;i<renderers.Length;i++)
        {
            var r=renderers[i];
            if(r==null||!r.enabled) continue;

            string name=r.gameObject.name;

            if(name=="Road")
            {
                block.Clear();
                block.SetColor("_BaseColor",new Color(.006f,.01f,.027f,1f));
                block.SetColor("_GridColor",p.road);
                block.SetFloat("_GridDensity",.45f);
                block.SetFloat("_GridStrength",
                    .62f+Mathf.Min(.18f,sector*.02f));
                block.SetFloat("_FlowSpeed",.22f);
                block.SetFloat("_FlowStrength",.7f);
                block.SetFloat("_ReflectStrength",.95f);
                r.SetPropertyBlock(block);
                continue;
            }

            if(name=="HologramBillboard")
            {
                block.Clear();
                Color c=(i+sector)%2==0?p.cyan:p.magenta;
                block.SetColor("_BaseColor",new Color(c.r,c.g,c.b,.62f));
                block.SetFloat("_ScanSpeed",1.8f+(sector%3)*.2f);
                block.SetFloat("_ScanDensity",58f);
                block.SetFloat("_GlowStrength",2.55f);
                r.SetPropertyBlock(block);
                continue;
            }

            if(name=="Building"||name=="SkylineTower"||name=="SkylineBeacon")
            {
                Color window=(i+sector)%3==0
                    ? p.cyan
                    : (i+sector)%3==1
                        ? p.magenta
                        : p.gold;

                block.Clear();
                block.SetColor("_BaseColor",
                    name=="Building"
                        ? new Color(.018f,.024f,.06f,1f)
                        : new Color(.012f,.016f,.04f,1f));
                block.SetColor("_WindowColor",window);
                block.SetFloat("_WindowDensity",
                    name=="Building" ? 1.35f : .95f);
                block.SetFloat("_WindowStrength",
                    name=="Building" ? 1.8f : 1.15f);
                block.SetColor("_RimColor",window);
                block.SetFloat("_RimStrength",
                    name=="Building" ? 1.55f : 1.1f);
                block.SetFloat("_PulseSpeed",
                    .95f+(sector%4)*.18f);
                r.SetPropertyBlock(block);
            }
        }
    }
}
