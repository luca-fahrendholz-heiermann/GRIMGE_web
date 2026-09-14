using UnityEngine;
using GRIMGE.Prototype.Core;

namespace GRIMGE.Prototype.Combat
{
    [RequireComponent(typeof(Collider2D))]
    public class Hurtbox2D : MonoBehaviour
    {
        [SerializeField] private TeamId _team = TeamId.Player;
        private IDamageable _damageable;
        private bool _isInvincible = false;

        public IDamageable Damageable => _damageable;
        public bool IsInvincible { get => _isInvincible; set => _isInvincible = value; }
        public TeamId Team { get => _team; set => _team = value; }

        private void Awake()
        {
            _damageable = GetComponentInParent<IDamageable>();
            Collider2D col = GetComponent<Collider2D>();
            col.isTrigger = true;
        }

        public void SetInvincible(bool invincible)
        {
            _isInvincible = invincible;
        }
    }
}
