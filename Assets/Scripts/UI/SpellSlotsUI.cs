using UnityEngine;
using UnityEngine.UI;
using GRIMGE.Prototype.Magic;

namespace GRIMGE.Prototype.UI
{
    public class SpellSlotsUI : MonoBehaviour
    {
        [Header("Slot Containers")]
        [SerializeField] private Text[] _slotLabels = new Text[SpellSlotManager.MaxSlots];
        [SerializeField] private Image[] _slotBackgrounds = new Image[SpellSlotManager.MaxSlots];
        [SerializeField] private Text _combinationResultText;

        [SerializeField] private SpellSlotManager _spellSlots;

        private void Start()
        {
            if (_spellSlots == null)
            {
                _spellSlots = FindFirstObjectByType<SpellSlotManager>();
            }

            if (_spellSlots != null)
            {
                _spellSlots.OnSlotsChanged += RefreshUI;
            }

            RefreshUI();
        }

        private void OnDestroy()
        {
            if (_spellSlots != null)
            {
                _spellSlots.OnSlotsChanged -= RefreshUI;
            }
        }

        public void RefreshUI()
        {
            if (_spellSlots == null) return;

            var runes = _spellSlots.StoredRunes;

            for (int i = 0; i < SpellSlotManager.MaxSlots; i++)
            {
                if (_slotLabels != null && i < _slotLabels.Length && _slotLabels[i] != null)
                {
                    if (i < runes.Count)
                    {
                        _slotLabels[i].text = runes[i].ToString();
                        _slotLabels[i].color = Color.white;
                    }
                    else
                    {
                        _slotLabels[i].text = $"Slot {i + 1}";
                        _slotLabels[i].color = new Color(0.6f, 0.6f, 0.6f, 0.5f);
                    }
                }

                if (_slotBackgrounds != null && i < _slotBackgrounds.Length && _slotBackgrounds[i] != null)
                {
                    if (i < runes.Count)
                    {
                        _slotBackgrounds[i].color = GetRuneColor(runes[i]);
                    }
                    else
                    {
                        _slotBackgrounds[i].color = new Color(0.2f, 0.2f, 0.2f, 0.6f);
                    }
                }
            }

            // Emergent Combination Result
            if (_combinationResultText != null)
            {
                SpellDefinition spell = _spellSlots.CurrentReadySpell;
                if (spell != null)
                {
                    if (runes.Count > 1)
                    {
                        _combinationResultText.text = $"★ <b>FUSION BEREIT: {spell.DisplayName}</b>\n<i>{spell.Description}</i>\n[Q / F zum Zaubern]";
                        _combinationResultText.color = new Color(1f, 0.85f, 0.2f);
                    }
                    else
                    {
                        _combinationResultText.text = $"Zauber bereit: {spell.DisplayName} [Q / F zum Zaubern]";
                        _combinationResultText.color = Color.white;
                    }
                }
                else
                {
                    _combinationResultText.text = "Kein Zauber vorbereitet. Zeichne Runen!";
                    _combinationResultText.color = Color.gray;
                }
            }
        }

        private Color GetRuneColor(RuneType r)
        {
            switch (r)
            {
                case RuneType.Fire: return new Color(0.9f, 0.35f, 0.1f, 0.85f);
                case RuneType.Wind: return new Color(0.2f, 0.85f, 0.75f, 0.85f);
                case RuneType.Earth: return new Color(0.75f, 0.55f, 0.2f, 0.85f);
                case RuneType.Lightning: return new Color(0.95f, 0.9f, 0.2f, 0.85f);
                default: return new Color(0.3f, 0.3f, 0.3f, 0.85f);
            }
        }
    }
}
