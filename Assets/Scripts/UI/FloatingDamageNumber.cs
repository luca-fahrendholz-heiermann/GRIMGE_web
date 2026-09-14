using UnityEngine;
using UnityEngine.UI;
using GRIMGE.Prototype.Combat;

namespace GRIMGE.Prototype.UI
{
    public class FloatingDamageNumber : MonoBehaviour
    {
        [SerializeField] private Text _text;
        private float _lifetime = 0.8f;
        private float _elapsed = 0f;
        private Vector3 _velocity;

        public static void Spawn(Vector3 worldPos, float damage, ElementType element)
        {
            GameObject go = new GameObject("DmgNumber");
            go.transform.position = worldPos + new Vector3(Random.Range(-0.3f, 0.3f), Random.Range(0.2f, 0.5f), 0f);

            Canvas canvas = go.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.WorldSpace;
            canvas.sortingOrder = 100;

            RectTransform rt = go.GetComponent<RectTransform>();
            rt.sizeDelta = new Vector2(2f, 1f);
            go.transform.localScale = Vector3.one * 0.02f;

            GameObject textGo = new GameObject("Text");
            textGo.transform.SetParent(go.transform, false);
            Text t = textGo.AddComponent<Text>();
            t.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            if (t.font == null) t.font = Resources.GetBuiltinResource<Font>("Arial.ttf");
            t.fontSize = 40;
            t.fontStyle = FontStyle.Bold;
            t.alignment = TextAnchor.MiddleCenter;
            t.text = Mathf.RoundToInt(damage).ToString();

            // Element color
            switch (element)
            {
                case ElementType.Fire:
                    t.color = new Color(1f, 0.45f, 0.1f);
                    break;
                case ElementType.Wind:
                    t.color = new Color(0.3f, 0.95f, 0.85f);
                    break;
                case ElementType.Earth:
                    t.color = new Color(0.85f, 0.65f, 0.2f);
                    break;
                case ElementType.Lightning:
                    t.color = new Color(1f, 0.95f, 0.2f);
                    break;
                case ElementType.Fusion:
                    t.color = new Color(1f, 0.2f, 0.9f);
                    break;
                default:
                    t.color = Color.white;
                    break;
            }

            FloatingDamageNumber comp = go.AddComponent<FloatingDamageNumber>();
            comp._text = t;
        }

        private void Start()
        {
            _velocity = new Vector3(Random.Range(-0.8f, 0.8f), 2.5f, 0f);
        }

        private void Update()
        {
            _elapsed += Time.deltaTime;
            transform.position += _velocity * Time.deltaTime;
            _velocity.y -= 4f * Time.deltaTime; // gravity on number

            if (_text != null)
            {
                Color c = _text.color;
                c.a = Mathf.Clamp01(1f - (_elapsed / _lifetime));
                _text.color = c;
            }

            if (_elapsed >= _lifetime)
            {
                Destroy(gameObject);
            }
        }
    }
}
