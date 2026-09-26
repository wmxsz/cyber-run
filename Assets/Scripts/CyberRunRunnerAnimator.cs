using UnityEngine;

public sealed class CyberRunRunnerAnimator : MonoBehaviour
{
    Transform armL,armR,legL,legR,torso,head;
    CyberRunBootstrap bootstrap;
    Vector3 torsoBase;
    Vector3 headBase;

    void Awake()
    {
        armL=transform.Find("ArmL");
        armR=transform.Find("ArmR");
        legL=transform.Find("LegL");
        legR=transform.Find("LegR");
        torso=transform.Find("Torso");
        head=transform.Find("Head");
        bootstrap=FindFirstObjectByType<CyberRunBootstrap>();

        if(torso!=null) torsoBase=torso.localPosition;
        if(head!=null) headBase=head.localPosition;
    }

    void LateUpdate()
    {
        float speed=bootstrap!=null
            ? bootstrap.CurrentSpeed
            : 0f;

        float normalized=Mathf.InverseLerp(0f,19f,speed);
        float frequency=Mathf.Lerp(0f,10.5f,normalized);

        if(frequency<=0.01f) return;

        float phase=Time.time*frequency;
        float swing=Mathf.Sin(phase);
        float swingOpposite=Mathf.Sin(phase+Mathf.PI);

        if(armL!=null)
            armL.localRotation=Quaternion.Euler(swing*28f,0f,0f);
        if(armR!=null)
            armR.localRotation=Quaternion.Euler(swingOpposite*28f,0f,0f);
        if(legL!=null)
            legL.localRotation=Quaternion.Euler(swingOpposite*22f,0f,0f);
        if(legR!=null)
            legR.localRotation=Quaternion.Euler(swing*22f,0f,0f);

        if(torso!=null)
        {
            torso.localPosition=torsoBase+
                Vector3.up*(Mathf.Abs(swing)*.028f*normalized);
            torso.localRotation=
                Quaternion.Euler(5f+normalized*8f,0f,-swing*1.7f*normalized);
        }

        if(head!=null)
        {
            head.localPosition=headBase+
                Vector3.up*(Mathf.Abs(swing)*.012f);
            head.localRotation=
                Quaternion.Euler(0f,-swing*2.2f*normalized,0f);
        }
    }
}
