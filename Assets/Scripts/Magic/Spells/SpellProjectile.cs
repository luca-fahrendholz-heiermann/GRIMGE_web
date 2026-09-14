using UnityEngine;
using GRIMGE.Prototype.Combat;
using GRIMGE.Prototype.Core;

namespace GRIMGE.Prototype.Magic.Spells
{
    [RequireComponent(typeof(Rigidbody2D), typeof(Collider2D))]
    public class SpellProjectile : MonoBehaviour
    {
        [SerializeField] private float _speed = 16f;
        [SerializeField] private float _lifetime = 3.5f;
        [SerializeField] private float _damage = 30f;
        [SerializeField] private float _explosionRadius = 1.2f;
        [SerializeField] private ElementType _element = ElementType.Fire;
        [SerializeField] private TeamId _team = TeamId.Player;

        private Rigidbody2D _rb;
        private bool _exploded = false;

        public void Initialize(TeamId team, ElementType element, float damage, Vector2 direction)
        {
            _team = team;
            _element = element;
            _damage = damage;

            _rb = GetComponent<Rigidbody2D>();
            _rb.gravityScale = 0f;
            _rb.linearVelocity = direction.normalized * _speed;

            // Visual color by element
            SpriteRenderer sr = GetComponentInChildren<SpriteRenderer>();
            if (sr != null)
            {
                if (element == ElementType.Fire) sr.color = new Color(1f, 0.45f, 0.1f);
                else if (element == ElementType.Wind) sr.color = new Color(0.3f, 0.95f, 0.8f);
                else if (element == ElementType.Lightning) sr.color = new Color(1f, 0.95f, 0.2f);
                else if (element == ElementType.Earth) sr.color = new Color(0.7f, 0.5f, 0.2f);
            }

            Destroy(gameObject, _lifetime);
        }

        private void OnTriggerEnter2D(Collider2D other)
        {
            if (_exploded) return;

            Hurtbox2D hurtbox = other.GetComponent<Hurtbox2D>();
            if (hurtbox != null && hurtbox.Damageable != null)
            {
                if (hurtbox.Damageable.Team != _team)
                {
                    Explode();
                }
            }
            else if (!other.isTrigger && other.gameObject.layer == LayerMask.NameToLayer("Default"))
            {
                Explode();
            }
        }

        private void Explode()
        {
            _exploded = true;
            if (SimpleAudio.Instance != null) SimpleAudio.Instance.PlaySpellExplosion();

            // AoE Damage
            Collider2D[] colliders = Physics2D.OverlapCircleAll(transform.position, _explosionRadius);
            foreach (var col in colliders)
            {
                Hurtbox2D hb = col.GetComponent<Hurtbox2D>();
                if (hb != null && hb.Damageable != null && hb.Damageable.Team != _team)
                {
                    Vector2 dir = (col.transform.position - transform.position).normalized;
                    DamageData dmg = new DamageData(_damage, dir * 6f, _team, _element, 0.08f, gameObject);
                    hb.Damageable.TakeDamage(dmg);
                }
            }

            Destroy(gameObject);
        }
    }
}
