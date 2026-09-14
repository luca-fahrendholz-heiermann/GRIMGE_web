#if UNITY_EDITOR
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace GRIMGE.Prototype.Editor
{
    public static class BuildAutomation
    {
        [MenuItem("GRIMGE/Set Build Scenes")]
        public static void ConfigureBuildScenes()
        {
            EditorBuildSettingsScene[] scenes = new EditorBuildSettingsScene[]
            {
                new EditorBuildSettingsScene("Assets/Scenes/GrimgeBattleScene.unity", true)
            };
            EditorBuildSettings.scenes = scenes;
            Debug.Log("Configured EditorBuildSettings with GrimgeBattleScene.unity");
        }

        [MenuItem("GRIMGE/Build Standalone")]
        public static void BuildStandalonePlayer()
        {
            ConfigureBuildScenes();

            string buildDir = "Builds";
            if (!System.IO.Directory.Exists(buildDir))
            {
                System.IO.Directory.CreateDirectory(buildDir);
            }

            BuildPlayerOptions buildOptions = new BuildPlayerOptions();
            buildOptions.scenes = new string[] { "Assets/Scenes/GrimgeBattleScene.unity" };
            buildOptions.locationPathName = "Builds/GRIMGE_Prototype.exe";
            buildOptions.target = BuildTarget.StandaloneWindows64;
            buildOptions.options = BuildOptions.Development;

            var report = BuildPipeline.BuildPlayer(buildOptions);
            Debug.Log($"Build Result: {report.summary.result} - {report.summary.totalErrors} errors");
        }
    }
}
#endif
