Shader "CyberRun/Road"
{
    Properties
    {
        _BaseColor ("Road Base", Color) = (0.008,0.012,0.03,1)
        _GridColor ("Grid Glow", Color) = (0.02,0.5,1.4,1)
        _GridDensity ("Grid Density", Float) = 2.0
        _GridStrength ("Grid Strength", Range(0,3)) = .6
        _FlowSpeed ("Flow Speed", Range(0,8)) = 1.5
        _FlowStrength ("Flow Strength", Range(0,4)) = .7
        _ReflectStrength ("Reflect Strength", Range(0,3)) = .7
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
            Name "CyberRoad"
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
            float4 _GridColor;
            float _GridDensity;
            float _GridStrength;
            float _FlowSpeed;
            float _FlowStrength;
            float _ReflectStrength;
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
                float3 n=normalize(IN.normalWS);
                float3 viewDir=normalize(
                    _WorldSpaceCameraPos.xyz-IN.positionWS);

                float topMask=smoothstep(.75,1.0,n.y);

                float2 grid=IN.positionWS.xz*_GridDensity;
                float2 cell=abs(frac(grid)-.5);
                float lineX=smoothstep(.44,.5,cell.x);
                float lineZ=smoothstep(.44,.5,cell.y);
                float gridLines=max(lineX,lineZ)*topMask;

                float scan=.5+.5*sin(
                    IN.positionWS.z*_FlowSpeed+_Time.y*5.5);
                float flow=pow(scan,8.0)*topMask;

                float fresnel=pow(
                    1.0-saturate(dot(n,viewDir)),4.0);

                float3 rgb=_BaseColor.rgb;
                rgb+=_GridColor.rgb*
                    gridLines*_GridStrength;
                rgb+=_GridColor.rgb*
                    flow*_FlowStrength;
                rgb+=float3(.06,.12,.28)*
                    fresnel*_ReflectStrength;

                rgb=MixFog(rgb,IN.fogFactor);
                return half4(rgb,1);
            }
            ENDHLSL
        }
    }
}
