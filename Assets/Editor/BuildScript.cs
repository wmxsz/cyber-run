#if UNITY_EDITOR
using UnityEditor;
using UnityEditor.Build.Reporting;
using System.IO;

public static class BuildScript
{
    public static void BuildAndroid()
    {
        CyberRunBuildSetup.ConfigureProject();
        EditorUserBuildSettings.buildAppBundle=false;
        Directory.CreateDirectory("build");
        var report=BuildPipeline.BuildPlayer(new BuildPlayerOptions
        {
            scenes=new[]{"Assets/Scenes/Main.unity"},
            locationPathName="build/CyberRun.apk",
            target=BuildTarget.Android,
            options=BuildOptions.StrictMode
        });
        if(report.summary.result!=BuildResult.Succeeded)
            throw new System.Exception("Android build failed: "+report.summary.result);
        UnityEngine.Debug.Log("CyberRun Android APK build succeeded: build/CyberRun.apk");
    }
}
#endif
