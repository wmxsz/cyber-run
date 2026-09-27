using UnityEngine;

public sealed class CyberRunRunnerAnimator : MonoBehaviour
{
    Transform armL,armR,legL,legR,torso,head;
    Transform visualRoot;
    CyberRunBootstrap bootstrap;
    Vector3 torsoBase;
    Vector3 headBase;

    void Awake()
    {
        visualRoot=transform.Find("RunnerVisualRoot");
        var root=visualRoot!=null ? visualRoot : transform;
        armL=root.Find("ArmL");
        armR=root.Find("ArmR");
        legL=root.Find("LegL");
        legR=root.Find("LegR");
        torso=root.Find("Torso");
        head=root.Find("Head");
        bootstrap=FindFirstObjectByType<CyberRunBootstrap>();

        if(torso!=null) torsoBase=torso.localPosition;
        if(head!=null) headBase=head.localPosition;
    }

    void LateUpdate()
    {
        float speed=bootstrap!=null
            ? bootstrap.CurrentSpeed
            : 0f;

        bool dead=bootstrap!=null && bootstrap.IsGameOver;
        bool sliding=bootstrap!=null && bootstrap.IsSliding;
        bool airborne=transform.position.y>1.16f;

        if(dead)
        {
            if(armL!=null) armL.localRotation=Quaternion.Euler(-6f,0f,-10f);
            if(armR!=null) armR.localRotation=Quaternion.Euler(14f,0f,10f);
            if(legL!=null) legL.localRotation=Quaternion.Euler(-8f,0f,0f);
            if(legR!=null) legR.localRotation=Quaternion.Euler(12f,0f,0f);
            if(torso!=null) torso.localRotation=Quaternion.Euler(0f,0f,-7f);
            return;
        }

        float normalized=Mathf.InverseLerp(0f,19f,speed);
        float frequency=Mathf.Lerp(0f,10.5f,normalized);

        if(frequency<=0.01f) return;

        float phase=Time.time*frequency;
        float swing=Mathf.Sin(phase);
        float swingOpposite=Mathf.Sin(phase+Mathf.PI);

        float armSwing=sliding ? 10f : airborne ? 18f : 28f;
        float legSwing=sliding ? 7f : airborne ? 12f : 22f;

        if(armL!=null)
            armL.localRotation=Quaternion.Euler(swing*armSwing,0f,0f);
        if(armR!=null)
            armR.localRotation=Quaternion.Euler(swingOpposite*armSwing,0f,0f);
        if(legL!=null)
            legL.localRotation=Quaternion.Euler(swingOpposite*legSwing,0f,0f);
        if(legR!=null)
            legR.localRotation=Quaternion.Euler(swing*legSwing,0f,0f);

        if(torso!=null)
        {
            float bob=sliding
                ? -.055f
                : airborne
                    ? .045f
                    : Mathf.Abs(swing)*.028f*normalized;
            torso.localPosition=torsoBase+Vector3.up*bob;
            torso.localRotation=Quaternion.Euler(
                sliding ? 18f : airborne ? -4f : 5f+normalized*8f,
                0f,
                -swing*1.7f*normalized);
        }

        if(head!=null)
        {
            float headBob=sliding ? -.035f : airborne ? .035f : Mathf.Abs(swing)*.012f;
            head.localPosition=headBase+Vector3.up*headBob;
            head.localRotation=Quaternion.Euler(
                sliding ? -10f : airborne ? 4f : 0f,
                -swing*2.2f*normalized,
                0f);
        }
    }
}
