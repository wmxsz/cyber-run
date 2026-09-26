Shader "CyberRun/City"
{
    Properties
    {
        _BaseColor ("Base Color", Color) = (0.03,0.05,0.12,1)
        _WindowColor ("Window Color", Color) = (0.05,1.0,2.5,1)
        _WindowDensity ("Window Density", Float) = 1.8
        _WindowStrength ("Window Strength", Range(0,5)) = 1.8
        _RimColor ("Rim Color", Color) = (0.05,0.8,1,1)
        _RimStrength ("Rim Strength", Range(0,5)) = 1.25
        _PulseSpeed ("Pulse Speed", Range(0,8)) = 1.2
    }

    SubShader
    {
        Tags
        {
            "RenderType"="Opaque"
            "Queue"="Geometry"
            "RenderPipeline"="UniversalPipeline"
        }

        Pass
        {
            Name "CyberCity"
            Tags { "LightMode"="UniversalForward" }

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
            float4 _WindowColor;
            float _WindowDensity;
            float _WindowStrength;
            float4 _RimColor;
            float _RimStrength;
            float _PulseSpeed;
            CBUFFER_END

            float Hash21(float2 p)
            {
                p=frac(p*float2(123.34,345.45));
                p+=dot(p,p+34.345);
                return frac(p.x*p.y);
            }

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
                float3 n=normalize(IN.normalWS);
                float3 viewDir=normalize(_WorldSpaceCameraPos.xyz-IN.positionWS);
                float fresnel=pow(
                    1.0-saturate(dot(n,viewDir)),3.0);

                float3 p=IN.positionWS*_WindowDensity;
                float2 floorXZ=floor(p.xz);
                float rnd=Hash21(floorXZ);

                float gridX=step(.72,frac(p.x));
                float gridY=step(.78,frac(p.y));
                float gridZ=step(.72,frac(p.z));

                float sideMask=max(abs(n.x),abs(n.z));
                float frontBack=step(.45,sideMask);

                float window=(gridX*gridY+gridZ*gridY)*frontBack;
                window*=step(.28,rnd);

                float pulse=.72+.28*sin(
                    _Time.y*_PulseSpeed+floor(IN.positionWS.y*2.0));

                float3 rgb=_BaseColor.rgb;
                rgb+=_WindowColor.rgb*window*_WindowStrength*pulse;
                rgb+=_RimColor.rgb*fresnel*_RimStrength;

                rgb=MixFog(rgb,IN.fogFactor);
                return half4(rgb,1);
            }
            ENDHLSL
        }
    }
}
