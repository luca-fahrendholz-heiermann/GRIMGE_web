using System.Collections;
using UnityEngine;
using GRIMGE.Prototype.Combat;
using GRIMGE.Prototype.Core;
using GRIMGE.Prototype.Magic.Spells;

namespace GRIMGE.Prototype.Lane
{
    public class Tower : MonoBehaviour, IDamageable
    {
        [Header("Tower Configuration")]
        [SerializeField] private TeamId _team = TeamId.Player;
        [SerializeField] private float _maxHealth = 450f;
        [SerializeField] private float _range = 8f;
        [SerializeField] private float _fireInterval = 2.0f;
        [SerializeField] private float _shotDamage = 25f;

        private float _currentHealth;
        private float _nextFireTime = 0f;
        private bool _isDestroyed = false;
        private SpriteRenderer _sr;

        public TeamId Team => _team;
        public float CurrentHealth => _currentHealth;
        public float MaxHealth => _maxHealth;
        public bool IsDestroyed => _isDestroyed;

        public event System.Action<Tower> OnTowerDestroyed;

        private void Awake()
        {
            _currentHealth = _maxHealth;
            _sr = GetComponentInChildren<SpriteRenderer>();
        }

        private void Update()
        {
            if (_isDestroyed) return;

            if (Time.time >= _nextFireTime)
            {
                IDamageable target = FindTarget();
                if (target != null)
                {
                    FireAtTarget(target);
                    _nextFireTime = Time.time + _fireInterval;
                }
            }
        }

        private IDamageable FindTarget()
        {
            Collider2D[] cols = Physics2D.OverlapCircleAll(transform.position, _range);
            IDamageable closest = null;
            float closestDist = float.MaxValue;

            foreach (var col in cols)
            {
                Hurtbox2D hb = col.GetComponent<Hurtbox2D>();
                if (hb != null && hb.Damageable != null && hb.Damageable.Team != _team)
                {
                    float d = Vector2.Distance(transform.position, col.transform.position);
                    if (d < closestDist)
                    {
                        closestDist = d;
                        closest = hb.Damageable;
                    }
                }
            }
            return closest;
        }

        private void FireAtTarget(IDamageable target)
        {
            Component comp = target as Component;
            if (comp == null) return;

            Vector2 dir = (comp.transform.position - (transform.position + Vector3.up * 2.5f)).normalized;

            GameObject bolt = new GameObject("TowerBolt");
            bolt.transform.position = transform.position + Vector3.up * 2.5f;

            CircleCollider2D col = bolt.AddComponent<CircleCollider2D>();
            col.isTrigger = true;
            col.radius = 0.35f;

            SpriteRenderer bsr = bolt.AddComponent<SpriteRenderer>();
            bsr.sprite = CreateBoltSprite();
            bsr.color = _team == TeamId.Player ? new Color(0.3f, 0.8f, 1f) : new Color(1f, 0.3f, 0.3f);
            bsr.sortingOrder = 30;

            SpellProjectile p = bolt.AddComponent<SpellProjectile>();
            p.Initialize(_team, ElementType.Lightning, _shotDamage, dir);

            if (SimpleAudio.Instance != null)
            {
                SimpleAudio.Instance.PlaySpellFire();
            }
        }

        public bool TakeDamage(DamageData damage)
        {
            if (_isDestroyed) return false;

            _currentHealth -= damage.Amount;
            _currentHealth = Mathf.Max(0f, _currentHealth);

            UI.FloatingDamageNumber.Spawn(transform.position + Vector3.up * 1.5f, damage.Amount, damage.Element);

            if (_currentHealth <= 0f)
            {
                DestroyTower();
            }

            return true;
        }

        private void DestroyTower()
        {
            _isDestroyed = true;
            if (_sr != null)
            {
                _sr.color = new Color(0.3f, 0.3f, 0.3f, 0.7f);
            }
            if (SimpleAudio.Instance != null)
            {
                SimpleAudio.Instance.PlaySpellExplosion();
            }
            OnTowerDestroyed?.Invoke(this);
        }

        private Sprite CreateBoltSprite()
        {
            Texture2D tex = new Texture2D(16, 16);
            for (int y = 0; y < 16; y++)
            {
                for (int x = 0; x < 16; x++)
                {
                    float d = Vector2.Distance(new Vector2(x, y), new Vector2(8, 8));
                    tex.SetPixel(x, y, d < 7 ? Color.white : Color.clear);
                }
            }
            tex.Apply();
            return Sprite.Create(tex, new Rect(0, 0, 16, 16), new Vector2(0.5f, 0.5f), 16);
        }

        private void OnDrawGizmosSelected()
        {
            Gizmos.color = _team == TeamId.Player ? Color.cyan : Color.red;
            Gizmos.DrawWireSphere(transform.position, _range);
        }
    }
}
