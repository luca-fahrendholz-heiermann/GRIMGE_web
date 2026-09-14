using UnityEngine;
using GRIMGE.Prototype.Combat;
using GRIMGE.Prototype.Core;

namespace GRIMGE.Prototype.Lane
{
    public class CentralMage : MonoBehaviour, IDamageable
    {
        [SerializeField] private TeamId _team = TeamId.Enemy;
        [SerializeField] private float _maxHealth = 800f;
        [SerializeField] private float _shockwaveRadius = 5f;
        [SerializeField] private float _shockwaveCooldown = 3.5f;

        private float _currentHealth;
        private float _nextShockwaveTime = 0f;
        private bool _isDefeated = false;

        public TeamId Team => _team;
        public float CurrentHealth => _currentHealth;
        public float MaxHealth => _maxHealth;
        public bool IsDefeated => _isDefeated;

        public event System.Action<CentralMage> OnMageDefeated;

        private void Awake()
        {
            _currentHealth = _maxHealth;
        }

        private void Update()
        {
            if (_isDefeated) return;

            if (Time.time >= _nextShockwaveTime)
            {
                // Check if enemies are near
                Collider2D[] cols = Physics2D.OverlapCircleAll(transform.position, _shockwaveRadius);
                bool hasEnemy = false;
                foreach (var col in cols)
                {
                    Hurtbox2D hb = col.GetComponent<Hurtbox2D>();
                    if (hb != null && hb.Damageable != null && hb.Damageable.Team != _team)
                    {
                        hasEnemy = true;
                        break;
                    }
                }

                if (hasEnemy)
                {
                    CastArcaneShockwave();
                    _nextShockwaveTime = Time.time + _shockwaveCooldown;
                }
            }
        }

        private void CastArcaneShockwave()
        {
            if (SimpleAudio.Instance != null)
            {
                SimpleAudio.Instance.PlaySpellExplosion();
            }

            Collider2D[] cols = Physics2D.OverlapCircleAll(transform.position, _shockwaveRadius);
            foreach (var col in cols)
            {
                Hurtbox2D hb = col.GetComponent<Hurtbox2D>();
                if (hb != null && hb.Damageable != null && hb.Damageable.Team != _team)
                {
                    Vector2 knockback = ((Vector2)col.transform.position - (Vector2)transform.position).normalized * 12f + Vector2.up * 4f;
                    DamageData dmg = new DamageData(35f, knockback, _team, ElementType.Fusion, 0.1f, gameObject);
                    hb.Damageable.TakeDamage(dmg);
                }
            }
        }

        public bool TakeDamage(DamageData damage)
        {
            if (_isDefeated) return false;

            _currentHealth -= damage.Amount;
            _currentHealth = Mathf.Max(0f, _currentHealth);

            UI.FloatingDamageNumber.Spawn(transform.position + Vector3.up * 2f, damage.Amount, damage.Element);

            if (_currentHealth <= 0f)
            {
                _isDefeated = true;
                OnMageDefeated?.Invoke(this);
            }

            return true;
        }
    }
}
