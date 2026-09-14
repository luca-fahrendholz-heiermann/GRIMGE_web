using UnityEngine;
using GRIMGE.Prototype.Combat;
using GRIMGE.Prototype.Core;

namespace GRIMGE.Prototype.Lane
{
    [RequireComponent(typeof(Rigidbody2D), typeof(Collider2D))]
    public class Minion : MonoBehaviour, IDamageable
    {
        [SerializeField] private TeamId _team = TeamId.Enemy;
        [SerializeField] private float _moveSpeed = 3.2f;
        [SerializeField] private float _maxHealth = 45f;
        [SerializeField] private float _attackDamage = 8f;
        [SerializeField] private float _attackRange = 1.3f;
        [SerializeField] private float _attackInterval = 1.4f;

        private float _currentHealth;
        private Rigidbody2D _rb;
        private SpriteRenderer _sr;
        private float _nextAttackTime = 0f;
        private float _facingDir = 1f;
        private IDamageable _currentTarget;

        public TeamId Team => _team;
        public float CurrentHealth => _currentHealth;
        public float MaxHealth => _maxHealth;

        private void Awake()
        {
            _rb = GetComponent<Rigidbody2D>();
            _sr = GetComponentInChildren<SpriteRenderer>();
            _currentHealth = _maxHealth;
            _rb.gravityScale = 3f;
            _rb.freezeRotation = true;
        }

        public void Initialize(TeamId team, float facingDirection)
        {
            _team = team;
            _facingDir = facingDirection;
            transform.localScale = new Vector3(_facingDir * Mathf.Abs(transform.localScale.x), transform.localScale.y, transform.localScale.z);

            if (_sr != null)
            {
                _sr.color = _team == TeamId.Player ? new Color(0.4f, 0.7f, 1f) : new Color(1f, 0.45f, 0.45f);
            }
        }

        private void Update()
        {
            _currentTarget = ScanForTarget();

            if (_currentTarget != null)
            {
                // In combat: stop moving
                _rb.linearVelocity = new Vector2(0f, _rb.linearVelocity.y);

                if (Time.time >= _nextAttackTime)
                {
                    ExecuteAttack();
                    _nextAttackTime = Time.time + _attackInterval;
                }
            }
            else
            {
                // March down the lane
                _rb.linearVelocity = new Vector2(_facingDir * _moveSpeed, _rb.linearVelocity.y);
            }
        }

        private IDamageable ScanForTarget()
        {
            Vector2 checkOrigin = (Vector2)transform.position + Vector2.up * 0.5f;
            RaycastHit2D[] hits = Physics2D.RaycastAll(checkOrigin, Vector2.right * _facingDir, _attackRange);

            foreach (var hit in hits)
            {
                if (hit.collider == null || hit.collider.gameObject == gameObject) continue;

                Hurtbox2D hb = hit.collider.GetComponent<Hurtbox2D>();
                if (hb != null && hb.Damageable != null && hb.Damageable.Team != _team)
                {
                    return hb.Damageable;
                }
            }
            return null;
        }

        private void ExecuteAttack()
        {
            if (_currentTarget != null)
            {
                DamageData dmg = new DamageData(_attackDamage, new Vector2(_facingDir * 2f, 1f), _team, ElementType.Physical, 0.04f, gameObject);
                _currentTarget.TakeDamage(dmg);

                if (SimpleAudio.Instance != null)
                {
                    SimpleAudio.Instance.PlaySlash();
                }
            }
        }

        public bool TakeDamage(DamageData damage)
        {
            _currentHealth -= damage.Amount;
            _currentHealth = Mathf.Max(0f, _currentHealth);

            UI.FloatingDamageNumber.Spawn(transform.position + Vector3.up * 0.8f, damage.Amount, damage.Element);
            _rb.linearVelocity = damage.Knockback;

            if (_currentHealth <= 0f)
            {
                Die();
            }

            return true;
        }

        private void Die()
        {
            Destroy(gameObject);
        }
    }
}
