using System;
using System.Collections.Generic;
using UnityEngine;
using GRIMGE.Prototype.Combat;

namespace GRIMGE.Prototype.Magic
{
    [Serializable]
    public class SpellDefinition
    {
        public string SpellId;
        public string DisplayName;
        public string Description;
        public ElementType Element;
        public List<RuneType> RequiredRunes = new List<RuneType>();
        public float BaseDamage = 30f;
        public float Cooldown = 1.0f;
        public GameObject SpellPrefab;

        public SpellDefinition(string id, string name, string desc, ElementType elem, float damage, params RuneType[] runes)
        {
            SpellId = id;
            DisplayName = name;
            Description = desc;
            Element = elem;
            BaseDamage = damage;
            RequiredRunes.AddRange(runes);
        }
    }

    public static class SpellCombinationCatalog
    {
        private static readonly List<SpellDefinition> _recipes = new List<SpellDefinition>();

        static SpellCombinationCatalog()
        {
            InitializeDefaultCatalog();
        }

        public static void InitializeDefaultCatalog()
        {
            _recipes.Clear();

            // Single Rune Spells
            _recipes.Add(new SpellDefinition("fireball", "Flammenball", "Schießt ein explosives Feuergeschoss.", ElementType.Fire, 32f, RuneType.Fire));
            _recipes.Add(new SpellDefinition("gale_blast", "Sturmwoge", "Durchdringt Gegner und stößt sie zurück.", ElementType.Wind, 22f, RuneType.Wind));
            _recipes.Add(new SpellDefinition("stone_spike", "Erdstachel", "Lässt schwere Steinspitzen aus dem Boden schießen.", ElementType.Earth, 38f, RuneType.Earth));
            _recipes.Add(new SpellDefinition("spark_bolt", "Blitzschlag", "Trifft das Ziel sofort mit hoher Geschwindigkeit.", ElementType.Lightning, 28f, RuneType.Lightning));

            // Emergent 2-Rune Combinations
            _recipes.Add(new SpellDefinition("firestorm", "Feuersturm", "Entfesselt einen feurigen Mahlstrom mit starker Sogwirkung und Burn-DoT.", ElementType.Fusion, 65f, RuneType.Fire, RuneType.Wind));
            _recipes.Add(new SpellDefinition("magma_eruption", "Magma-Eruption", "Verflüssigt den Boden zu kochender Lava mit Flächenschaden.", ElementType.Fusion, 75f, RuneType.Fire, RuneType.Earth));
            _recipes.Add(new SpellDefinition("chain_tempest", "Gewitter-Wirbel", "Kombiniert Wirbelwind mit überspringenden Blitzen.", ElementType.Fusion, 60f, RuneType.Wind, RuneType.Lightning));
            _recipes.Add(new SpellDefinition("charged_monolith", "Geladener Monolith", "Errichtet eine irdene Schutzsäule, die Stromstöße abgibt.", ElementType.Fusion, 55f, RuneType.Earth, RuneType.Lightning));
            _recipes.Add(new SpellDefinition("inferno_blast", "Solar-Inferno", "Doppelte Feuerkraft für eine gewaltige Nova.", ElementType.Fire, 80f, RuneType.Fire, RuneType.Fire));
        }

        public static void RegisterSpell(SpellDefinition spell)
        {
            _recipes.Add(spell);
        }

        /// <summary>
        /// Finds the best matching spell for a given list of runes (order-agnostic).
        /// Prioritizes larger combinations over single-rune spells.
        /// </summary>
        public static SpellDefinition ResolveSpell(List<RuneType> inputRunes)
        {
            if (inputRunes == null || inputRunes.Count == 0) return null;

            SpellDefinition bestMatch = null;
            int maxMatchedRunes = 0;

            foreach (var recipe in _recipes)
            {
                if (MatchesRecipe(inputRunes, recipe.RequiredRunes))
                {
                    if (recipe.RequiredRunes.Count > maxMatchedRunes)
                    {
                        maxMatchedRunes = recipe.RequiredRunes.Count;
                        bestMatch = recipe;
                    }
                }
            }

            return bestMatch;
        }

        private static bool MatchesRecipe(List<RuneType> inputs, List<RuneType> recipe)
        {
            if (recipe.Count > inputs.Count) return false;

            List<RuneType> pool = new List<RuneType>(inputs);
            foreach (var r in recipe)
            {
                if (!pool.Remove(r)) return false;
            }
            return true;
        }
    }
}
