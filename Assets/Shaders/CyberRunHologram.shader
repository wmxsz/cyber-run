Shader "CyberRun/Hologram"
{
    Properties
    {
        _BaseColor ("Base Color", Color) = (0.05,0.8,1,0.65)
        _ScanSpeed ("Scan Speed", Range(0.1,8)) = 2.5
        _ScanDensity ("Scan Density", Range(10,160)) = 70
        _GlowStrength ("Glow Strength", Range(0,5)) = 2
    }

    SubShader
    {
        Tags
        {
            "RenderType"="Transparent"
            "Queue"="Transparent"
            "RenderPipeline"="UniversalPipeline"
        }

        Blend SrcAlpha One
        ZWrite Off
        Cull Off

        Pass
        {
            Name "CyberHologram"
            Tags { "LightMode"="UniversalForward" }

            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag

            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"

            struct Attributes
            {
                float4 positionOS : POSITION;
                float2 uv : TEXCOORD0;
            };

            struct Varyings
            {
                float4 positionHCS : SV_POSITION;
                float2 uv : TEXCOORD0;
                float3 positionWS : TEXCOORD1;
                float3 normalWS : TEXCOORD2;
                float fogFactor : TEXCOORD3;
            };

            CBUFFER_START(UnityPerMaterial)
            float4 _BaseColor;
            float _ScanSpeed;
            float _ScanDensity;
            float _GlowStrength;
            CBUFFER_END

            Varyings vert(Attributes IN)
            {
                Varyings OUT;
                OUT.positionWS=TransformObjectToWorld(IN.positionOS.xyz);
                OUT.positionHCS=TransformWorldToHClip(OUT.positionWS);
                OUT.normalWS=TransformObjectToWorldNormal(float3(0,0,-1));
                OUT.uv=IN.uv;
                OUT.fogFactor=ComputeFogFactor(OUT.positionHCS.z);
                return OUT;
            }

            half4 frag(Varyings IN) : SV_Target
            {
                float3 viewDir=normalize(
                    _WorldSpaceCameraPos.xyz-IN.positionWS);
                float rim=pow(
                    1.0-saturate(dot(
                        normalize(IN.normalWS),viewDir)),1.8);

                float scan=.5+.5*sin(
                    (IN.uv.y+_Time.y*_ScanSpeed)*_ScanDensity);

                float gridX=smoothstep(
                    .46,.5,abs(frac(IN.uv.x*8)-.5));
                float gridY=smoothstep(
                    .46,.5,abs(frac(IN.uv.y*6)-.5));

                float edge=1.0-
                    saturate(abs(IN.uv.x-.5)*1.9);
                float alpha=_BaseColor.a*
                    (.18+.72*scan)*
                    (.45+.55*(1.0-gridX)*(1.0-gridY))*
                    (.55+.45*rim)*
                    edge;

                float3 rgb=_BaseColor.rgb*
                    (.55+scan*.7+rim*_GlowStrength);

                rgb=MixFog(rgb,IN.fogFactor);
                return half4(rgb,alpha);
            }
            ENDHLSL
        }
    }
}
