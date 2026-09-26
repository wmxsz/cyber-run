using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public sealed class CyberRunCityVisual : MonoBehaviour
{
    Shader cityShader;
    Material cityMaterial;

    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
    static void Install()
    {
        var existing=FindFirstObjectByType<CyberRunCityVisual>();
        if(existing!=null) return;

        var go=new GameObject("CyberRunCityVisual");
        go.AddComponent<CyberRunCityVisual>();
        DontDestroyOnLoad(go);
    }

    IEnumerator Start()
    {
        yield return null;
        yield return null;

        cityShader=Shader.Find("CyberRun/City");
        if(cityShader==null) yield break;

        cityMaterial=new Material(cityShader);
        cityMaterial.name="CyberRunCityShared";
        cityMaterial.enableInstancing=true;

        var renderers=FindObjectsByType<Renderer>(
            FindObjectsInactive.Exclude,
            FindObjectsSortMode.None);

        int buildingIndex=0;

        for(int i=0;i<renderers.Length;i++)
        {
            var r=renderers[i];
            if(r==null) continue;

            var ps=r.GetComponent<ParticleSystemRenderer>();
            if(ps!=null) continue;

            if(!r.gameObject.name.Contains(
                "Building",System.StringComparison.Ordinal))
                continue;

            r.sharedMaterial=cityMaterial;
            var block=new MaterialPropertyBlock();

            Color baseColor=
                (buildingIndex++&1)==0
                    ? new Color(.022f,.035f,.085f,1f)
                    : new Color(.035f,.018f,.075f,1f);

            Color window=
                (buildingIndex&1)==0
                    ? new Color(.04f,1.3f,4.5f,1f)
                    : new Color(1.8f,.05f,3.8f,1f);

            block.SetColor("_BaseColor",baseColor);
            block.SetColor("_WindowColor",window);
            block.SetFloat("_WindowDensity",
                1.2f+(buildingIndex%3)*.25f);
            block.SetFloat("_WindowStrength",1.7f);
            block.SetColor("_RimColor",window);
            block.SetFloat("_RimStrength",1.35f);
            block.SetFloat("_PulseSpeed",
                1.05f+(buildingIndex%4)*.18f);

            r.SetPropertyBlock(block);
            r.shadowCastingMode=
                UnityEngine.Rendering.ShadowCastingMode.Off;
            r.receiveShadows=false;
        }

        AddRooftopDetails();
    }

    void AddRooftopDetails()
    {
        var buildings=FindObjectsByType<Transform>(
            FindObjectsInactive.Exclude,
            FindObjectsSortMode.None);

        for(int i=0;i<buildings.Length;i++)
        {
            var building=buildings[i];
            if(building==null) continue;
            if(building.name!="Building") continue;
            if((i&1)!=0) continue;

            var antenna=new GameObject("NeonAntenna").transform;
            antenna.SetParent(building,false);
            antenna.localPosition=new Vector3(0,.62f,0);
            antenna.localScale=new Vector3(.5f,1.8f,.5f);

            var mesh=GameObject.CreatePrimitive(
                PrimitiveType.Cylinder);
            mesh.name="AntennaCore";
            mesh.transform.SetParent(antenna,false);
            mesh.transform.localScale=new Vector3(.12f,1f,.12f);
            mesh.transform.localPosition=Vector3.zero;

            var col=mesh.GetComponent<Collider>();
            if(col!=null) Destroy(col);

            var renderer=mesh.GetComponent<Renderer>();
            if(renderer!=null && cityMaterial!=null)
            {
                renderer.sharedMaterial=cityMaterial;
                var block=new MaterialPropertyBlock();
                block.SetColor("_BaseColor",new Color(.02f,.025f,.06f,1f));
                block.SetColor("_WindowColor",new Color(
                    .05f,1.2f,4.3f,1f));
                block.SetFloat("_WindowStrength",2.2f);
                block.SetColor("_RimColor",new Color(
                    1.6f,.05f,3.6f,1f));
                block.SetFloat("_RimStrength",2f);
                block.SetFloat("_PulseSpeed",3.5f);
                renderer.SetPropertyBlock(block);
                renderer.shadowCastingMode=
                    UnityEngine.Rendering.ShadowCastingMode.Off;
                renderer.receiveShadows=false;
            }
        }
    }
}
