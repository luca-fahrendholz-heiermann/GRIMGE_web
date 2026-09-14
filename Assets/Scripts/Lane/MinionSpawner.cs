using UnityEngine;
using GRIMGE.Prototype.Core;

namespace GRIMGE.Prototype.Lane
{
    public class MinionSpawner : MonoBehaviour
    {
        [Header("Spawn Settings")]
        [SerializeField] private TeamId _team = TeamId.Player;
        [SerializeField] private float _waveInterval = 12f;
        [SerializeField] private int _minionsPerWave = 3;
        [SerializeField] private float _spawnDelayBetweenUnits = 0.6f;
        [SerializeField] private float _facingDirection = 1f;

        private float _waveTimer = 0f;

        private void Start()
        {
            _waveTimer = 2.0f; // Initial first wave soon after match start
        }

        private void Update()
        {
            _waveTimer -= Time.deltaTime;
            if (_waveTimer <= 0f)
            {
                SpawnWave();
                _waveTimer = _waveInterval;
            }
        }

        public void SpawnWave()
        {
            StartCoroutine(SpawnWaveRoutine());
        }

        private System.Collections.IEnumerator SpawnWaveRoutine()
        {
            for (int i = 0; i < _minionsPerWave; i++)
            {
                SpawnMinion();
                yield return new WaitForSeconds(_spawnDelayBetweenUnits);
            }
        }

        private void SpawnMinion()
        {
            GameObject mGo = new GameObject("Minion_" + _team);
            mGo.transform.position = transform.position;
            mGo.transform.localScale = Vector3.one * 0.7f;

            // Visual
            SpriteRenderer sr = mGo.AddComponent<SpriteRenderer>();
            sr.sprite = CreateMinionSprite();
            sr.sortingOrder = 15;

            // Physics
            BoxCollider2D box = mGo.AddComponent<BoxCollider2D>();
            box.size = new Vector2(0.8f, 1.2f);
            box.offset = new Vector2(0f, 0.6f);

            // Hurtbox
            GameObject hbGo = new GameObject("Hurtbox");
            hbGo.transform.SetParent(mGo.transform, false);
            BoxCollider2D hbCol = hbGo.AddComponent<BoxCollider2D>();
            hbCol.size = box.size;
            hbCol.offset = box.offset;
            hbCol.isTrigger = true;
            Combat.Hurtbox2D hb = hbGo.AddComponent<Combat.Hurtbox2D>();

            // Minion logic
            Minion minion = mGo.AddComponent<Minion>();
            minion.Initialize(_team, _facingDirection);
        }

        private Sprite CreateMinionSprite()
        {
            Texture2D tex = new Texture2D(32, 48);
            Color baseCol = _team == TeamId.Player ? new Color(0.3f, 0.65f, 0.95f) : new Color(0.95f, 0.35f, 0.35f);

            for (int y = 0; y < 48; y++)
            {
                for (int x = 0; x < 32; x++)
                {
                    if (x >= 4 && x <= 27 && y >= 2 && y <= 45)
                    {
                        // Body shape
                        tex.SetPixel(x, y, baseCol);
                    }
                    else
                    {
                        tex.SetPixel(x, y, Color.clear);
                    }
                }
            }
            tex.Apply();
            return Sprite.Create(tex, new Rect(0, 0, 32, 48), new Vector2(0.5f, 0f), 32);
        }
    }
}
