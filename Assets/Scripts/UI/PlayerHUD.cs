using UnityEngine;
using UnityEngine.UI;
using GRIMGE.Prototype.Movement;
using GRIMGE.Prototype.Lane;

namespace GRIMGE.Prototype.UI
{
    public class PlayerHUD : MonoBehaviour
    {
        [Header("Player HP")]
        [SerializeField] private Slider _playerHpSlider;
        [SerializeField] private Text _playerHpText;

        [Header("Towers HP")]
        [SerializeField] private Slider _playerTowerSlider;
        [SerializeField] private Slider _enemyTowerSlider;
        [SerializeField] private Text _matchStatusText;

        [Header("Controls Legend")]
        [SerializeField] private Text _controlsText;

        private CharacterMotor2D _playerMotor;
        private Tower _playerTower;
        private Tower _enemyTower;

        private void Start()
        {
            _playerMotor = FindFirstObjectByType<CharacterMotor2D>();
            if (_playerMotor != null)
            {
                _playerMotor.OnHealthChanged += HandlePlayerHealthChanged;
                HandlePlayerHealthChanged(_playerMotor.CurrentHealth, _playerMotor.MaxHealth);
            }

            Tower[] towers = FindObjectsByType<Tower>(FindObjectsSortMode.None);
            foreach (var t in towers)
            {
                if (t.Team == Core.TeamId.Player) _playerTower = t;
                else if (t.Team == Core.TeamId.Enemy) _enemyTower = t;
            }

            if (_controlsText != null)
            {
                _controlsText.text = "<b>STEUERUNG:</b>\n" +
                                     "[A / D] Bewegen  |  [W / Space] Springen  |  [S im Sprung] Fast-Fall\n" +
                                     "[Linksklick] Nahkampf-Combo  |  [Shift] Dodge Dash (i-Frames)\n" +
                                     "[Rechtsklick halten & Maus ziehen] Rune zeichnen (2.5s Zeitfenster)\n" +
                                     "[Q / F] Vorbereitete Zauber / Fusion auslösen  |  [E] Slots leeren\n" +
                                     "[1-5] Charakter-Skin wechseln (Mannequin, Berserker, Champion, Ritter, Magier)";
            }
        }

        private void Update()
        {
            if (_playerTower != null && _playerTowerSlider != null)
            {
                _playerTowerSlider.value = _playerTower.CurrentHealth / _playerTower.MaxHealth;
                if (_playerTower.IsDestroyed && _matchStatusText != null)
                {
                    _matchStatusText.text = "<color=red><b>DEIN TURM WURDE ZERSTÖRT! NIEDERLAGE!</b></color>";
                }
            }

            if (_enemyTower != null && _enemyTowerSlider != null)
            {
                _enemyTowerSlider.value = _enemyTower.CurrentHealth / _enemyTower.MaxHealth;
                if (_enemyTower.IsDestroyed && _matchStatusText != null)
                {
                    _matchStatusText.text = "<color=green><b>GEGNERISCHER TURM ZERSTÖRT! SIEG!</b></color>";
                }
            }
        }

        private void HandlePlayerHealthChanged(float current, float max)
        {
            if (_playerHpSlider != null) _playerHpSlider.value = current / max;
            if (_playerHpText != null) _playerHpText.text = $"HP: {Mathf.CeilToInt(current)} / {Mathf.CeilToInt(max)}";
        }
    }
}
