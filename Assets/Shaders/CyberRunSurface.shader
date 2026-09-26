Shader "CyberRun/Surface"
{
    Properties
    {
        _BaseColor ("Base Color", Color) = (1,1,1,1)
        _GlowStrength ("Glow Strength", Range(0,4)) = 0.45
        _RimColor ("Rim Color", Color) = (0.05,0.8,1,1)
        _RimStrength ("Rim Strength", Range(0,5)) = 1.15
        _PulseSpeed ("Pulse Speed", Range(0,8)) = 1.8
        _GridColor ("Circuit Color", Color) = (0.02,0.55,1.2,1)
        _GridDensity ("Circuit Density", Range(0.1,6)) = 1.4
        _GridStrength ("Circuit Strength", Range(0,2)) = 0.12
        _ScanSpeed ("Scan Speed", Range(0,8)) = 1.5
        _ScanStrength ("Scan Strength", Range(0,2)) = 0.08
    }

    SubShader
    {
        Tags
        {
            "RenderType" = "Opaque"
            "Queue" = "Geometry"
            "RenderPipeline" = "UniversalPipeline"
        }

        Pass
        {
            Name "CyberSurface"
            Tags { "LightMode" = "UniversalForward" }

            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #pragma multi_compile_instancing

            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"

            struct Attributes
            {
                float4 positionOS : POSITION;
                float3 normalOS : NORMAL;
                UNITY_VERTEX_INPUT_INSTANCE_ID
            };

            struct Varyings
            {
                float4 positionHCS : SV_POSITION;
                float3 positionWS : TEXCOORD0;
                float3 normalWS : TEXCOORD1;
                float fogFactor : TEXCOORD2;
            };

            CBUFFER_START(UnityPerMaterial)
            float4 _BaseColor;
            float _GlowStrength;
            float4 _RimColor;
            float _RimStrength;
            float _PulseSpeed;
            float4 _GridColor;
            float _GridDensity;
            float _GridStrength;
            float _ScanSpeed;
            float _ScanStrength;
            CBUFFER_END

            Varyings vert(Attributes IN)
            {
                UNITY_SETUP_INSTANCE_ID(IN);

                Varyings OUT;
                OUT.positionWS=TransformObjectToWorld(IN.positionOS.xyz);
                OUT.positionHCS=TransformWorldToHClip(OUT.positionWS);
                OUT.normalWS=TransformObjectToWorldNormal(IN.normalOS);
                OUT.fogFactor=ComputeFogFactor(OUT.positionHCS.z);
                return OUT;
            }

            half4 frag(Varyings IN) : SV_Target
            {
                float3 normalWS=normalize(IN.normalWS);
                float3 viewDir=normalize(
                    _WorldSpaceCameraPos.xyz-IN.positionWS);

                float fresnel=pow(
                    1.0-saturate(dot(normalWS,viewDir)),3.2);

                float pulse=.65+.35*sin(
                    _Time.y*_PulseSpeed+IN.positionWS.y*.35);

                float2 gridPos=IN.positionWS.xz*_GridDensity;
                float2 cell=abs(frac(gridPos)-.5);
                float gridX=smoothstep(.5,.455,cell.x);
                float gridZ=smoothstep(.5,.455,cell.y);
                float gridLines=max(gridX,gridZ);

                float scanCoord=
                    IN.positionWS.y+
                    IN.positionWS.z*.06+
                    IN.positionWS.x*.025;
                float scanWave=.5+.5*sin(
                    scanCoord*_ScanSpeed+_Time.y*3.6);
                float scanBand=pow(scanWave,14.0);

                float3 baseRGB=_BaseColor.rgb;
                float3 glow=baseRGB*(_GlowStrength*pulse);

                glow+=_RimColor.rgb*
                    (fresnel*_RimStrength);

                glow+=_GridColor.rgb*
                    gridLines*_GridStrength;

                glow+=_GridColor.rgb*
                    scanBand*_ScanStrength;

                half3 rgb=baseRGB+glow;
                rgb=MixFog(rgb,IN.fogFactor);
                return half4(rgb,_BaseColor.a);
            }
            ENDHLSL
        }
    }
}
