using System.Collections.Generic;
using UnityEngine;
using GRIMGE.Prototype.Core;

namespace GRIMGE.Prototype.Combat
{
    [RequireComponent(typeof(Collider2D))]
    public class Hitbox2D : MonoBehaviour
    {
        [SerializeField] private TeamId _team = TeamId.Player;
        [SerializeField] private float _damage = 15f;
        [SerializeField] private Vector2 _knockback = new Vector2(4f, 3f);
        [SerializeField] private float _hitstop = 0.07f;
        [SerializeField] private ElementType _element = ElementType.Physical;

        private Collider2D _col;
        private readonly HashSet<IDamageable> _hitObjects = new HashSet<IDamageable>();
        private GameObject _owner;

        public TeamId Team { get => _team; set => _team = value; }
        public float Damage { get => _damage; set => _damage = value; }
        public Vector2 Knockback { get => _knockback; set => _knockback = value; }
        public ElementType Element { get => _element; set => _element = value; }

        private void Awake()
        {
            _col = GetComponent<Collider2D>();
            _col.isTrigger = true;
            _col.enabled = false;
        }

        public void Initialize(GameObject owner, TeamId team, float damage, Vector2 knockback, ElementType element = ElementType.Physical)
        {
            _owner = owner;
            _team = team;
            _damage = damage;
            _knockback = knockback;
            _element = element;
        }

        public void Activate(float duration = 0.2f)
        {
            _hitObjects.Clear();
            _col.enabled = true;
            CancelInvoke(nameof(Deactivate));
            Invoke(nameof(Deactivate), duration);
        }

        public void Deactivate()
        {
            _col.enabled = false;
            _hitObjects.Clear();
        }

        private void OnTriggerEnter2D(Collider2D other)
        {
            if (!_col.enabled) return;

            Hurtbox2D hurtbox = other.GetComponent<Hurtbox2D>();
            if (hurtbox != null && hurtbox.Damageable != null)
            {
                IDamageable target = hurtbox.Damageable;
                if (target.Team != _team && !_hitObjects.Contains(target))
                {
                    _hitObjects.Add(target);

                    // Directional knockback based on owner orientation
                    Vector2 finalKb = _knockback;
                    if (_owner != null)
                    {
                        float facing = Mathf.Sign(_owner.transform.localScale.x);
                        finalKb.x *= facing;
                    }

                    DamageData dmg = new DamageData(_damage, finalKb, _team, _element, _hitstop, _owner);
                    bool damaged = target.TakeDamage(dmg);

                    if (damaged)
                    {
                        if (HitstopManager.Instance != null)
                        {
                            HitstopManager.Instance.TriggerHitstop(_hitstop);
                        }
                        if (SimpleAudio.Instance != null)
                        {
                            SimpleAudio.Instance.PlayHitImpact();
                        }
                    }
                }
            }
        }
    }
}
