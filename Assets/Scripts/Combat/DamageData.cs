using UnityEngine;
using GRIMGE.Prototype.Core;

namespace GRIMGE.Prototype.Combat
{
    public enum ElementType
    {
        Physical,
        Fire,
        Wind,
        Earth,
        Lightning,
        Water,
        Fusion
    }

    public struct DamageData
    {
        public float Amount;
        public Vector2 Knockback;
        public float HitstopDuration;
        public ElementType Element;
        public TeamId SourceTeam;
        public GameObject SourceObject;

        public DamageData(float amount, Vector2 knockback, TeamId sourceTeam, ElementType element = ElementType.Physical, float hitstop = 0.06f, GameObject source = null)
        {
            Amount = amount;
            Knockback = knockback;
            SourceTeam = sourceTeam;
            Element = element;
            HitstopDuration = hitstop;
            SourceObject = source;
        }
    }

    public interface IDamageable
    {
        TeamId Team { get; }
        bool TakeDamage(DamageData damage);
    }
}
