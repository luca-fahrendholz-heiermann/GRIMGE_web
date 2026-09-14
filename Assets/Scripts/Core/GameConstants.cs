using UnityEngine;

namespace GRIMGE.Prototype.Core
{
    public enum TeamId
    {
        Player = 0,
        Enemy = 1,
        Neutral = 2
    }

    public static class GameLayers
    {
        public const string Default = "Default";
        public const string Ground = "Ground";
        public const string Player = "Player";
        public const string Enemy = "Enemy";
        public const string Hitbox = "Hitbox";
        public const string Hurtbox = "Hurtbox";
    }
}
