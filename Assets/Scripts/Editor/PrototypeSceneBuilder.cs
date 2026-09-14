#if UNITY_EDITOR
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.UI;
using GRIMGE.Prototype.Core;
using GRIMGE.Prototype.Movement;
using GRIMGE.Prototype.Combat;
using GRIMGE.Prototype.Magic;
using GRIMGE.Prototype.Lane;
using GRIMGE.Prototype.UI;
using GRIMGE.Prototype.Presentation;

namespace GRIMGE.Prototype.Editor
{
    public static class PrototypeSceneBuilder
    {
        [MenuItem("GRIMGE/Build Prototype Scene")]
        public static void BuildPrototypeScene()
        {
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

            // 1. Audio & Core Managers
            GameObject managers = new GameObject("--- MANAGERS ---");
            managers.AddComponent<SimpleAudio>();
            managers.AddComponent<HitstopManager>();
            managers.AddComponent<RuneDrawingManager>();

            // 2. Camera
            GameObject camGo = new GameObject("Main Camera");
            camGo.tag = "MainCamera";
            Camera cam = camGo.AddComponent<Camera>();
            cam.orthographic = true;
            cam.orthographicSize = 6.5f;
            cam.backgroundColor = new Color(0.08f, 0.09f, 0.14f);
            cam.clearFlags = CameraClearFlags.SolidColor;
            camGo.transform.position = new Vector3(0f, 2.5f, -10f);
            camGo.AddComponent<AudioListener>();
            CameraFollow2D follow = camGo.AddComponent<CameraFollow2D>();

            // 3. Environment & Platforms
            GameObject env = new GameObject("--- ENVIRONMENT ---");

            // Main Lane Ground
            CreateGroundPlatform(env.transform, "LaneGround", new Vector2(0f, -0.5f), new Vector2(46f, 1f), new Color(0.2f, 0.22f, 0.28f));

            // Left Wall and Right Wall
            CreateWall(env.transform, "LeftWall", new Vector2(-23f, 6f), new Vector2(1f, 14f));
            CreateWall(env.transform, "RightWall", new Vector2(23f, 6f), new Vector2(1f, 14f));

            // Elevated Combat Platforms
            CreateGroundPlatform(env.transform, "Platform_Player", new Vector2(-7.5f, 2.8f), new Vector2(5.5f, 0.4f), new Color(0.35f, 0.38f, 0.45f));
            CreateGroundPlatform(env.transform, "Platform_Mid", new Vector2(0f, 4.2f), new Vector2(6f, 0.4f), new Color(0.4f, 0.45f, 0.55f));
            CreateGroundPlatform(env.transform, "Platform_Enemy", new Vector2(7.5f, 2.8f), new Vector2(5.5f, 0.4f), new Color(0.35f, 0.38f, 0.45f));

            // Background Parallax Decor
            CreateBackgroundDiorama(env.transform);

            // 4. Player Character
            GameObject player = CreatePlayerCharacter(new Vector3(-10f, 1.5f, 0f));
            follow.transform.position = new Vector3(player.transform.position.x, player.transform.position.y + 1.5f, -10f);

            // 5. Towers & Lane Objectives
            GameObject laneObj = new GameObject("--- LANE OBJECTIVES ---");

            // Player Tower
            CreateTower(laneObj.transform, "PlayerTower", TeamId.Player, new Vector2(-15f, 0f));
            // Player Minion Spawner
            CreateMinionSpawner(laneObj.transform, "PlayerMinionPortal", TeamId.Player, new Vector2(-18.5f, 0.5f), 1f);
            // Player Central Mage
            CreateCentralMage(laneObj.transform, "PlayerCentralMage", TeamId.Player, new Vector2(-19.5f, 0f));

            // Enemy Tower
            CreateTower(laneObj.transform, "EnemyTower", TeamId.Enemy, new Vector2(15f, 0f));
            // Enemy Minion Spawner
            CreateMinionSpawner(laneObj.transform, "EnemyMinionPortal", TeamId.Enemy, new Vector2(18.5f, 0.5f), -1f);
            // Enemy Central Mage
            CreateCentralMage(laneObj.transform, "EnemyCentralMage", TeamId.Enemy, new Vector2(19.5f, 0f));

            // 6. UI Canvas
            CreatePrototypeUI();

            // Save scene
            string scenePath = "Assets/Scenes/GrimgeBattleScene.unity";
            EditorSceneManager.SaveScene(scene, scenePath);
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            Debug.Log("Grimge Battle Scene successfully created at " + scenePath);
        }

        private static GameObject CreatePlayerCharacter(Vector3 position)
        {
            GameObject p = new GameObject("PlayerCharacter");
            p.tag = "Player";
            p.transform.position = position;

            // Visual
            GameObject visual = new GameObject("Visual");
            visual.transform.SetParent(p.transform, false);
            SpriteRenderer sr = visual.AddComponent<SpriteRenderer>();
            sr.sortingOrder = 20;

            // Load character sprites
            Sprite[] skins = new Sprite[5];
            skins[0] = AssetDatabase.LoadAssetAtPath<Sprite>("Assets/Art/Characters/char_mannequin.png");
            skins[1] = AssetDatabase.LoadAssetAtPath<Sprite>("Assets/Art/Characters/char_berserker.png");
            skins[2] = AssetDatabase.LoadAssetAtPath<Sprite>("Assets/Art/Characters/char_champion.png");
            skins[3] = AssetDatabase.LoadAssetAtPath<Sprite>("Assets/Art/Characters/char_knight.png");
            skins[4] = AssetDatabase.LoadAssetAtPath<Sprite>("Assets/Art/Characters/char_mage.png");

            if (skins[2] != null) sr.sprite = skins[2]; // Default Champion skin
            else if (skins[0] != null) sr.sprite = skins[0];

            CharacterSkinManager skinMgr = p.AddComponent<CharacterSkinManager>();
            SerializedObject skinSo = new SerializedObject(skinMgr);
            SerializedProperty arrProp = skinSo.FindProperty("_skinSprites");
            arrProp.arraySize = 5;
            for (int i = 0; i < 5; i++)
            {
                arrProp.GetArrayElementAtIndex(i).objectReferenceValue = skins[i];
            }
            skinSo.ApplyModifiedProperties();

            // Physics & Collider
            Rigidbody2D rb = p.AddComponent<Rigidbody2D>();
            CapsuleCollider2D cap = p.AddComponent<CapsuleCollider2D>();
            cap.size = new Vector2(0.85f, 2.2f);
            cap.offset = new Vector2(0f, 1.1f);

            // Hurtbox
            GameObject hbGo = new GameObject("Hurtbox");
            hbGo.transform.SetParent(p.transform, false);
            CapsuleCollider2D hbCol = hbGo.AddComponent<CapsuleCollider2D>();
            hbCol.size = cap.size;
            hbCol.offset = cap.offset;
            hbCol.isTrigger = true;
            Hurtbox2D hurtbox = hbGo.AddComponent<Hurtbox2D>();

            // Melee Hitbox
            GameObject attackGo = new GameObject("MeleeHitbox");
            attackGo.transform.SetParent(p.transform, false);
            attackGo.transform.localPosition = new Vector2(0.9f, 1.1f);
            BoxCollider2D atkCol = attackGo.AddComponent<BoxCollider2D>();
            atkCol.size = new Vector2(1.5f, 1.4f);
            atkCol.isTrigger = true;
            Hitbox2D hitbox = attackGo.AddComponent<Hitbox2D>();
            hitbox.Initialize(p, TeamId.Player, 20f, new Vector2(4f, 2f));

            // Components
            p.AddComponent<CharacterMotor2D>();
            p.AddComponent<MeleeComboSystem>();
            p.AddComponent<SpellSlotManager>();
            p.AddComponent<PlayerController>();

            return p;
        }

        private static void CreateGroundPlatform(Transform parent, string name, Vector2 pos, Vector2 size, Color color)
        {
            GameObject go = new GameObject(name);
            go.transform.SetParent(parent);
            go.transform.position = pos;

            BoxCollider2D col = go.AddComponent<BoxCollider2D>();
            col.size = size;

            SpriteRenderer sr = go.AddComponent<SpriteRenderer>();
            sr.sprite = CreateBoxSprite();
            sr.color = color;
            sr.drawMode = SpriteDrawMode.Sliced;
            sr.size = size;
            sr.sortingOrder = 5;
        }

        private static void CreateWall(Transform parent, string name, Vector2 pos, Vector2 size)
        {
            GameObject go = new GameObject(name);
            go.transform.SetParent(parent);
            go.transform.position = pos;

            BoxCollider2D col = go.AddComponent<BoxCollider2D>();
            col.size = size;
        }

        private static void CreateBackgroundDiorama(Transform parent)
        {
            GameObject bg = new GameObject("BackgroundMountains");
            bg.transform.SetParent(parent);
            bg.transform.position = new Vector3(0f, 6f, 5f);

            SpriteRenderer sr = bg.AddComponent<SpriteRenderer>();
            sr.sprite = CreateBoxSprite();
            sr.color = new Color(0.12f, 0.14f, 0.22f);
            sr.drawMode = SpriteDrawMode.Sliced;
            sr.size = new Vector2(50f, 15f);
            sr.sortingOrder = -10;
        }

        private static void CreateTower(Transform parent, string name, TeamId team, Vector2 pos)
        {
            GameObject go = new GameObject(name);
            go.transform.SetParent(parent);
            go.transform.position = pos;

            SpriteRenderer sr = go.AddComponent<SpriteRenderer>();
            sr.sprite = CreateBoxSprite();
            sr.color = team == TeamId.Player ? new Color(0.2f, 0.5f, 0.85f) : new Color(0.85f, 0.25f, 0.25f);
            sr.drawMode = SpriteDrawMode.Sliced;
            sr.size = new Vector2(2.2f, 5f);
            sr.sortingOrder = 10;
            go.transform.position = new Vector3(pos.x, pos.y + 2.5f, 0f);

            BoxCollider2D col = go.AddComponent<BoxCollider2D>();
            col.size = new Vector2(2.2f, 5f);

            // Hurtbox
            GameObject hbGo = new GameObject("Hurtbox");
            hbGo.transform.SetParent(go.transform, false);
            BoxCollider2D hbCol = hbGo.AddComponent<BoxCollider2D>();
            hbCol.size = col.size;
            hbCol.isTrigger = true;
            Hurtbox2D hb = hbGo.AddComponent<Hurtbox2D>();

            go.AddComponent<Tower>();
        }

        private static void CreateCentralMage(Transform parent, string name, TeamId team, Vector2 pos)
        {
            GameObject go = new GameObject(name);
            go.transform.SetParent(parent);
            go.transform.position = new Vector3(pos.x, pos.y + 1.8f, 0f);

            SpriteRenderer sr = go.AddComponent<SpriteRenderer>();
            sr.sprite = CreateBoxSprite();
            sr.color = team == TeamId.Player ? new Color(0.6f, 0.4f, 0.95f) : new Color(0.95f, 0.3f, 0.7f);
            sr.drawMode = SpriteDrawMode.Sliced;
            sr.size = new Vector2(1.8f, 3.6f);
            sr.sortingOrder = 12;

            BoxCollider2D col = go.AddComponent<BoxCollider2D>();
            col.size = new Vector2(1.8f, 3.6f);

            GameObject hbGo = new GameObject("Hurtbox");
            hbGo.transform.SetParent(go.transform, false);
            BoxCollider2D hbCol = hbGo.AddComponent<BoxCollider2D>();
            hbCol.size = col.size;
            hbCol.isTrigger = true;
            Hurtbox2D hb = hbGo.AddComponent<Hurtbox2D>();

            go.AddComponent<CentralMage>();
        }

        private static void CreateMinionSpawner(Transform parent, string name, TeamId team, Vector2 pos, float dir)
        {
            GameObject go = new GameObject(name);
            go.transform.SetParent(parent);
            go.transform.position = pos;

            MinionSpawner spawner = go.AddComponent<MinionSpawner>();
            SerializedObject so = new SerializedObject(spawner);
            so.FindProperty("_team").enumValueIndex = (int)team;
            so.FindProperty("_facingDirection").floatValue = dir;
            so.ApplyModifiedProperties();
        }

        private static void CreatePrototypeUI()
        {
            GameObject canvasGo = new GameObject("Canvas_PrototypeHUD");
            Canvas canvas = canvasGo.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvasGo.AddComponent<CanvasScaler>();
            canvasGo.AddComponent<GraphicRaycaster>();

            Font defaultFont = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            if (defaultFont == null) defaultFont = Resources.GetBuiltinResource<Font>("Arial.ttf");

            // 1. Controls / Info Legend (Top Left)
            GameObject controlsObj = CreateTextObject(canvasGo.transform, "ControlsLegend", new Vector2(30f, -25f), new Vector2(500f, 150f), TextAnchor.UpperLeft);
            Text controlsText = controlsObj.GetComponent<Text>();
            controlsText.font = defaultFont;
            controlsText.fontSize = 14;

            // 2. Health Bars (Top Center)
            GameObject playerHpObj = CreateSliderObject(canvasGo.transform, "PlayerHpBar", new Vector2(-150f, -30f), new Vector2(250f, 26f), new Color(0.2f, 0.8f, 0.3f));
            GameObject playerTowerHpObj = CreateSliderObject(canvasGo.transform, "PlayerTowerBar", new Vector2(-150f, -65f), new Vector2(250f, 18f), new Color(0.25f, 0.6f, 0.95f));
            GameObject enemyTowerHpObj = CreateSliderObject(canvasGo.transform, "EnemyTowerBar", new Vector2(150f, -65f), new Vector2(250f, 18f), new Color(0.95f, 0.25f, 0.25f));

            GameObject statusObj = CreateTextObject(canvasGo.transform, "MatchStatusText", new Vector2(0f, -110f), new Vector2(600f, 40f), TextAnchor.MiddleCenter);
            Text statusText = statusObj.GetComponent<Text>();
            statusText.font = defaultFont;
            statusText.fontSize = 20;

            PlayerHUD hud = canvasGo.AddComponent<PlayerHUD>();
            SerializedObject hudSo = new SerializedObject(hud);
            hudSo.FindProperty("_playerHpSlider").objectReferenceValue = playerHpObj.GetComponent<Slider>();
            hudSo.FindProperty("_playerTowerSlider").objectReferenceValue = playerTowerHpObj.GetComponent<Slider>();
            hudSo.FindProperty("_enemyTowerSlider").objectReferenceValue = enemyTowerHpObj.GetComponent<Slider>();
            hudSo.FindProperty("_matchStatusText").objectReferenceValue = statusText;
            hudSo.FindProperty("_controlsText").objectReferenceValue = controlsText;
            hudSo.ApplyModifiedProperties();

            // 3. Rune Drawing Canvas & Feedback (Center Screen)
            GameObject runeDrawingPanel = new GameObject("RuneDrawingPanel");
            runeDrawingPanel.transform.SetParent(canvasGo.transform, false);
            RectTransform rdpRt = runeDrawingPanel.AddComponent<RectTransform>();
            rdpRt.anchorMin = new Vector2(0.5f, 0.5f);
            rdpRt.anchorMax = new Vector2(0.5f, 0.5f);
            rdpRt.sizeDelta = new Vector2(400f, 120f);
            rdpRt.anchoredPosition = new Vector2(0f, 100f);

            GameObject timerObj = CreateSliderObject(runeDrawingPanel.transform, "DrawingTimerBar", new Vector2(0f, 30f), new Vector2(300f, 12f), Color.yellow);
            GameObject runeStatusObj = CreateTextObject(runeDrawingPanel.transform, "RuneStatusText", new Vector2(0f, 0f), new Vector2(400f, 40f), TextAnchor.MiddleCenter);
            Text runeStatusText = runeStatusObj.GetComponent<Text>();
            runeStatusText.font = defaultFont;
            runeStatusText.fontSize = 18;

            GameObject guideObj = CreateTextObject(runeDrawingPanel.transform, "RuneGuideText", new Vector2(0f, -40f), new Vector2(600f, 50f), TextAnchor.MiddleCenter);
            Text guideText = guideObj.GetComponent<Text>();
            guideText.font = defaultFont;
            guideText.fontSize = 15;

            RuneDrawingUI runeUI = canvasGo.AddComponent<RuneDrawingUI>();
            SerializedObject runeSo = new SerializedObject(runeUI);
            runeSo.FindProperty("_timerSlider").objectReferenceValue = timerObj.GetComponent<Slider>();
            runeSo.FindProperty("_statusText").objectReferenceValue = runeStatusText;
            runeSo.FindProperty("_guideText").objectReferenceValue = guideText;
            runeSo.ApplyModifiedProperties();

            // 4. Spell Slots UI (Bottom Center)
            GameObject spellSlotsContainer = new GameObject("SpellSlotsContainer");
            spellSlotsContainer.transform.SetParent(canvasGo.transform, false);
            RectTransform sscRt = spellSlotsContainer.AddComponent<RectTransform>();
            sscRt.anchorMin = new Vector2(0.5f, 0f);
            sscRt.anchorMax = new Vector2(0.5f, 0f);
            sscRt.sizeDelta = new Vector2(500f, 120f);
            sscRt.anchoredPosition = new Vector2(0f, 75f);

            Image[] slotBgs = new Image[3];
            Text[] slotTexts = new Text[3];
            for (int i = 0; i < 3; i++)
            {
                GameObject slot = new GameObject("Slot_" + i);
                slot.transform.SetParent(spellSlotsContainer.transform, false);
                RectTransform srt = slot.AddComponent<RectTransform>();
                srt.sizeDelta = new Vector2(75f, 75f);
                srt.anchoredPosition = new Vector2(-100f + i * 100f, 15f);

                Image img = slot.AddComponent<Image>();
                img.color = new Color(0.2f, 0.2f, 0.2f, 0.7f);
                slotBgs[i] = img;

                GameObject slotTxtGo = CreateTextObject(slot.transform, "SlotText", Vector2.zero, new Vector2(70f, 70f), TextAnchor.MiddleCenter);
                Text st = slotTxtGo.GetComponent<Text>();
                st.font = defaultFont;
                st.fontSize = 14;
                st.text = $"Slot {i + 1}";
                slotTexts[i] = st;
            }

            GameObject comboResultObj = CreateTextObject(spellSlotsContainer.transform, "ComboResultText", new Vector2(0f, -40f), new Vector2(600f, 45f), TextAnchor.MiddleCenter);
            Text comboResultText = comboResultObj.GetComponent<Text>();
            comboResultText.font = defaultFont;
            comboResultText.fontSize = 16;

            SpellSlotsUI slotsUI = canvasGo.AddComponent<SpellSlotsUI>();
            SerializedObject slotsSo = new SerializedObject(slotsUI);
            SerializedProperty bgArr = slotsSo.FindProperty("_slotBackgrounds");
            SerializedProperty txtArr = slotsSo.FindProperty("_slotLabels");
            bgArr.arraySize = 3;
            txtArr.arraySize = 3;
            for (int i = 0; i < 3; i++)
            {
                bgArr.GetArrayElementAtIndex(i).objectReferenceValue = slotBgs[i];
                txtArr.GetArrayElementAtIndex(i).objectReferenceValue = slotTexts[i];
            }
            slotsSo.FindProperty("_combinationResultText").objectReferenceValue = comboResultText;
            slotsSo.ApplyModifiedProperties();
        }

        private static GameObject CreateTextObject(Transform parent, string name, Vector2 pos, Vector2 size, TextAnchor alignment)
        {
            GameObject go = new GameObject(name);
            go.transform.SetParent(parent, false);
            RectTransform rt = go.AddComponent<RectTransform>();
            rt.anchorMin = alignment == TextAnchor.UpperLeft ? new Vector2(0f, 1f) : new Vector2(0.5f, 0.5f);
            rt.anchorMax = rt.anchorMin;
            rt.pivot = alignment == TextAnchor.UpperLeft ? new Vector2(0f, 1f) : new Vector2(0.5f, 0.5f);
            rt.sizeDelta = size;
            rt.anchoredPosition = pos;

            Text t = go.AddComponent<Text>();
            t.color = Color.white;
            t.alignment = alignment;
            return go;
        }

        private static GameObject CreateSliderObject(Transform parent, string name, Vector2 pos, Vector2 size, Color fillColor)
        {
            GameObject go = new GameObject(name);
            go.transform.SetParent(parent, false);
            RectTransform rt = go.AddComponent<RectTransform>();
            rt.anchorMin = new Vector2(0.5f, 0.5f);
            rt.anchorMax = new Vector2(0.5f, 0.5f);
            rt.sizeDelta = size;
            rt.anchoredPosition = pos;

            Slider slider = go.AddComponent<Slider>();

            // Background
            GameObject bg = new GameObject("Background");
            bg.transform.SetParent(go.transform, false);
            RectTransform bgRt = bg.AddComponent<RectTransform>();
            bgRt.anchorMin = Vector2.zero;
            bgRt.anchorMax = Vector2.one;
            bgRt.sizeDelta = Vector2.zero;
            Image bgImg = bg.AddComponent<Image>();
            bgImg.color = new Color(0.1f, 0.1f, 0.1f, 0.8f);

            // Fill Area
            GameObject fillArea = new GameObject("Fill Area");
            fillArea.transform.SetParent(go.transform, false);
            RectTransform fillAreaRt = fillArea.AddComponent<RectTransform>();
            fillAreaRt.anchorMin = Vector2.zero;
            fillAreaRt.anchorMax = Vector2.one;
            fillAreaRt.sizeDelta = Vector2.zero;

            GameObject fill = new GameObject("Fill");
            fill.transform.SetParent(fillArea.transform, false);
            RectTransform fillRt = fill.AddComponent<RectTransform>();
            fillRt.anchorMin = Vector2.zero;
            fillRt.anchorMax = Vector2.one;
            fillRt.sizeDelta = Vector2.zero;
            Image fillImg = fill.AddComponent<Image>();
            fillImg.color = fillColor;

            slider.fillRect = fillRt;
            slider.minValue = 0f;
            slider.maxValue = 1f;
            slider.value = 1f;

            return go;
        }

        private static Sprite CreateBoxSprite()
        {
            Texture2D tex = new Texture2D(16, 16);
            for (int y = 0; y < 16; y++)
            {
                for (int x = 0; x < 16; x++)
                {
                    tex.SetPixel(x, y, Color.white);
                }
            }
            tex.Apply();
            return Sprite.Create(tex, new Rect(0, 0, 16, 16), new Vector2(0.5f, 0.5f), 16);
        }
    }
}
#endif
