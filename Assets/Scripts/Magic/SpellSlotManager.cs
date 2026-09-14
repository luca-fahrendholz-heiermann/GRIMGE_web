using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.InputSystem;
using GRIMGE.Prototype.Combat;
using GRIMGE.Prototype.Core;
using GRIMGE.Prototype.Movement;
using GRIMGE.Prototype.Magic.Spells;

namespace GRIMGE.Prototype.Magic
{
    public class SpellSlotManager : MonoBehaviour
    {
        public const int MaxSlots = 3;

        private readonly List<RuneType> _storedRunes = new List<RuneType>();
        private CharacterMotor2D _motor;

        [Header("Sigil Visuals")]
        [SerializeField] private GameObject[] _sigilNodes = new GameObject[MaxSlots];

        public IReadOnlyList<RuneType> StoredRunes => _storedRunes;
        public SpellDefinition CurrentReadySpell => SpellCombinationCatalog.ResolveSpell(_storedRunes);

        public event Action OnSlotsChanged;
        public event Action<SpellDefinition> OnSpellCast;

        private void Awake()
        {
            _motor = GetComponentInParent<CharacterMotor2D>();
            CreateSigilNodes();
        }

        private void Start()
        {
            if (RuneDrawingManager.Instance != null)
            {
                RuneDrawingManager.Instance.OnRuneRecognized += AddRune;
            }
        }

        private void OnDestroy()
        {
            if (RuneDrawingManager.Instance != null)
            {
                RuneDrawingManager.Instance.OnRuneRecognized -= AddRune;
            }
        }

        private void Update()
        {
            // Cast input (Q or F or Gamepad Button North / West)
            if (Keyboard.current != null)
            {
                if (Keyboard.current.qKey.wasPressedThisFrame || Keyboard.current.fKey.wasPressedThisFrame)
                {
                    TryCastActiveSpell();
                }
                if (Keyboard.current.eKey.wasPressedThisFrame)
                {
                    ClearSlots();
                }
            }

            if (Gamepad.current != null)
            {
                if (Gamepad.current.buttonWest.wasPressedThisFrame || Gamepad.current.buttonNorth.wasPressedThisFrame)
                {
                    TryCastActiveSpell();
                }
                if (Gamepad.current.dpad.down.wasPressedThisFrame)
                {
                    ClearSlots();
                }
            }

            UpdateSigilVisuals();
        }

        public void AddRune(RuneType rune, float confidence)
        {
            if (rune == RuneType.None) return;

            if (_storedRunes.Count >= MaxSlots)
            {
                // Replace oldest rune
                _storedRunes.RemoveAt(0);
            }

            _storedRunes.Add(rune);
            OnSlotsChanged?.Invoke();
        }

        public void ClearSlots()
        {
            _storedRunes.Clear();
            OnSlotsChanged?.Invoke();
        }

        public bool TryCastActiveSpell()
        {
            if (_storedRunes.Count == 0) return false;

            SpellDefinition spell = CurrentReadySpell;
            if (spell == null) return false;

            Vector2 origin = transform.position + Vector3.up * 0.5f;
            float facing = _motor != null ? _motor.FacingDirection : 1f;
            Vector2 direction = new Vector2(facing, 0f);

            // Execute spell behavior
            if (spell.SpellId == "firestorm")
            {
                // Spawn Firestorm vortex
                GameObject vortex = new GameObject("FirestormVortex");
                vortex.transform.position = (Vector2)transform.position + new Vector2(facing * 3.5f, 0f);
                FirestormSpell fs = vortex.AddComponent<FirestormSpell>();
                fs.Initialize(_motor != null ? _motor.Team : TeamId.Player);
            }
            else
            {
                // Default projectile spell
                GameObject proj = new GameObject("Spell_" + spell.SpellId);
                proj.transform.position = origin + direction * 0.8f;
                proj.transform.localScale = Vector3.one * 0.6f;

                CircleCollider2D col = proj.AddComponent<CircleCollider2D>();
                col.isTrigger = true;
                col.radius = 0.4f;

                SpriteRenderer sr = proj.AddComponent<SpriteRenderer>();
                sr.sprite = CreateCircleSprite();
                sr.sortingOrder = 30;

                SpellProjectile p = proj.AddComponent<SpellProjectile>();
                p.Initialize(_motor != null ? _motor.Team : TeamId.Player, spell.Element, spell.BaseDamage, direction);

                if (SimpleAudio.Instance != null)
                {
                    SimpleAudio.Instance.PlaySpellFire();
                }
            }

            OnSpellCast?.Invoke(spell);

            // Consume all runes used in this recipe
            _storedRunes.Clear();
            OnSlotsChanged?.Invoke();

            return true;
        }

        private void CreateSigilNodes()
        {
            for (int i = 0; i < MaxSlots; i++)
            {
                if (_sigilNodes[i] == null)
                {
                    GameObject node = new GameObject("SigilNode_" + i);
                    node.transform.SetParent(transform, false);
                    SpriteRenderer sr = node.AddComponent<SpriteRenderer>();
                    sr.sprite = CreateCircleSprite();
                    sr.sortingOrder = 35;
                    node.transform.localScale = Vector3.one * 0.35f;
                    node.SetActive(false);
                    _sigilNodes[i] = node;
                }
            }
        }

        private void UpdateSigilVisuals()
        {
            float facing = _motor != null ? _motor.FacingDirection : 1f;

            for (int i = 0; i < MaxSlots; i++)
            {
                if (i < _storedRunes.Count)
                {
                    _sigilNodes[i].SetActive(true);
                    // Floating orbit positions behind player
                    float offsetX = -facing * (0.6f + i * 0.45f);
                    float offsetY = 0.8f + Mathf.Sin(Time.time * 3f + i) * 0.15f;
                    _sigilNodes[i].transform.localPosition = new Vector3(offsetX, offsetY, 0f);

                    SpriteRenderer sr = _sigilNodes[i].GetComponent<SpriteRenderer>();
                    if (sr != null)
                    {
                        sr.color = GetRuneColor(_storedRunes[i]);
                    }
                }
                else
                {
                    _sigilNodes[i].SetActive(false);
                }
            }
        }

        private Color GetRuneColor(RuneType r)
        {
            switch (r)
            {
                case RuneType.Fire: return new Color(1f, 0.4f, 0.1f, 0.9f);
                case RuneType.Wind: return new Color(0.25f, 0.95f, 0.85f, 0.9f);
                case RuneType.Earth: return new Color(0.85f, 0.65f, 0.2f, 0.9f);
                case RuneType.Lightning: return new Color(1f, 0.95f, 0.25f, 0.9f);
                default: return Color.white;
            }
        }

        private Sprite CreateCircleSprite()
        {
            Texture2D tex = new Texture2D(32, 32);
            for (int y = 0; y < 32; y++)
            {
                for (int x = 0; x < 32; x++)
                {
                    float d = Vector2.Distance(new Vector2(x, y), new Vector2(16, 16));
                    if (d < 14)
                    {
                        float a = Mathf.Clamp01(1f - (d / 14f));
                        tex.SetPixel(x, y, new Color(1f, 1f, 1f, a));
                    }
                    else
                    {
                        tex.SetPixel(x, y, Color.clear);
                    }
                }
            }
            tex.Apply();
            return Sprite.Create(tex, new Rect(0, 0, 32, 32), new Vector2(0.5f, 0.5f), 32);
        }
    }
}
