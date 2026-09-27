using System;
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
        var existing=FindAnyObjectByType<CyberRunCityVisual>();
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
            if(building.parent==null) continue;

            float height=building.localScale.y;
            float roofY=building.localPosition.y+height*.5f;

            var antenna=new GameObject("NeonAntenna").transform;
            antenna.SetParent(building.parent,false);
            antenna.localPosition=building.localPosition+
                Vector3.up*(height*.5f+1.0f);
            antenna.localScale=Vector3.one;

            var mesh=GameObject.CreatePrimitive(
                PrimitiveType.Cylinder);
            mesh.name="AntennaCore";
            mesh.transform.SetParent(antenna,false);
            mesh.transform.localPosition=new Vector3(0,.6f,0);
            mesh.transform.localScale=new Vector3(.09f,.6f,.09f);

            var col=mesh.GetComponent<Collider>();
            if(col!=null) Destroy(col);

            Color cyan=new Color(.05f,1.25f,4.3f,1f);
            Color magenta=new Color(1.7f,.05f,3.6f,1f);

            var renderer=mesh.GetComponent<Renderer>();
            if(renderer!=null && cityMaterial!=null)
            {
                renderer.sharedMaterial=cityMaterial;
                var block=new MaterialPropertyBlock();

                Color baseColor=(i&2)==0
                    ? new Color(.018f,.022f,.055f,1f)
                    : new Color(.028f,.018f,.05f,1f);

                block.SetColor("_BaseColor",baseColor);
                block.SetColor("_WindowColor",
                    (i&2)==0 ? cyan : magenta);
                block.SetFloat("_WindowStrength",2.15f);
                block.SetColor("_RimColor",
                    (i&2)==0 ? cyan : magenta);
                block.SetFloat("_RimStrength",2.1f);
                block.SetFloat("_PulseSpeed",3.2f);
                renderer.SetPropertyBlock(block);
                renderer.shadowCastingMode=
                    UnityEngine.Rendering.ShadowCastingMode.Off;
                renderer.receiveShadows=false;
            }

            var beacon=GameObject.CreatePrimitive(
                PrimitiveType.Sphere);
            beacon.name="AntennaBeacon";
            beacon.transform.SetParent(antenna,false);
            beacon.transform.localPosition=new Vector3(0,1.3f,0);
            beacon.transform.localScale=Vector3.one*.16f;

            var beaconCol=beacon.GetComponent<Collider>();
            if(beaconCol!=null) Destroy(beaconCol);

            var beaconRenderer=beacon.GetComponent<Renderer>();
            if(beaconRenderer!=null && cityMaterial!=null)
            {
                beaconRenderer.sharedMaterial=cityMaterial;
                var block=new MaterialPropertyBlock();
                Color glow=(i&2)==0 ? cyan : magenta;

                block.SetColor("_BaseColor",glow);
                block.SetColor("_WindowColor",glow);
                block.SetFloat("_WindowStrength",2.5f);
                block.SetColor("_RimColor",glow);
                block.SetFloat("_RimStrength",3f);
                block.SetFloat("_PulseSpeed",4.5f);
                beaconRenderer.SetPropertyBlock(block);
                beaconRenderer.shadowCastingMode=
                    UnityEngine.Rendering.ShadowCastingMode.Off;
                beaconRenderer.receiveShadows=false;
            }
        }
    }
}
