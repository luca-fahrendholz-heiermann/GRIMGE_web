using UnityEngine;

namespace GRIMGE.Prototype.Presentation
{
    public class CharacterSkinManager : MonoBehaviour
    {
        [Header("Character Sprites")]
        [SerializeField] private Sprite[] _skinSprites;
        private SpriteRenderer _renderer;
        private int _currentSkinIndex = 0;

        public int CurrentSkinIndex => _currentSkinIndex;

        private void Awake()
        {
            _renderer = GetComponentInChildren<SpriteRenderer>();
            LoadDefaultSpritesIfEmpty();
        }

        private void Start()
        {
            ApplyCurrentSkin();
        }

        public void SetSkin(int index)
        {
            if (_skinSprites == null || _skinSprites.Length == 0) return;
            _currentSkinIndex = Mathf.Clamp(index, 0, _skinSprites.Length - 1);
            ApplyCurrentSkin();
        }

        public void CycleNextSkin()
        {
            if (_skinSprites == null || _skinSprites.Length == 0) return;
            _currentSkinIndex = (_currentSkinIndex + 1) % _skinSprites.Length;
            ApplyCurrentSkin();
        }

        private void ApplyCurrentSkin()
        {
            if (_renderer != null && _skinSprites != null && _skinSprites.Length > _currentSkinIndex)
            {
                if (_skinSprites[_currentSkinIndex] != null)
                {
                    _renderer.sprite = _skinSprites[_currentSkinIndex];
                }
            }
        }

        private void LoadDefaultSpritesIfEmpty()
        {
            if (_skinSprites == null || _skinSprites.Length == 0)
            {
                _skinSprites = new Sprite[5];
                _skinSprites[0] = Resources.Load<Sprite>("char_mannequin");
                _skinSprites[1] = Resources.Load<Sprite>("char_berserker");
                _skinSprites[2] = Resources.Load<Sprite>("char_champion");
                _skinSprites[3] = Resources.Load<Sprite>("char_knight");
                _skinSprites[4] = Resources.Load<Sprite>("char_mage");
            }
        }
    }
}
