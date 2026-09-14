using System.Collections;
using UnityEngine;
using GRIMGE.Prototype.Core;

namespace GRIMGE.Prototype.Combat
{
    public class MeleeComboSystem : MonoBehaviour
    {
        [Header("Combo Configuration")]
        [SerializeField] private float _attack1Damage = 14f;
        [SerializeField] private float _attack2Damage = 18f;
        [SerializeField] private float _attack3Damage = 28f;
        [SerializeField] private float _comboWindow = 0.75f;
        [SerializeField] private float _attackCooldown = 0.22f;

        [Header("References")]
        [SerializeField] private Hitbox2D _hitbox;
        [SerializeField] private LineRenderer _slashEffect;

        private int _comboStep = 0;
        private float _comboTimer = 0f;
        private float _attackCooldownTimer = 0f;
        private bool _isAttacking = false;

        public bool IsAttacking => _isAttacking;
        public int CurrentComboStep => _comboStep;

        private void Awake()
        {
            if (_hitbox == null)
            {
                _hitbox = GetComponentInChildren<Hitbox2D>();
            }

            // Create procedural slash trail if not assigned
            if (_slashEffect == null)
            {
                GameObject slashObj = new GameObject("SlashEffect");
                slashObj.transform.SetParent(transform, false);
                _slashEffect = slashObj.AddComponent<LineRenderer>();
                _slashEffect.startWidth = 0.15f;
                _slashEffect.endWidth = 0.02f;
                _slashEffect.positionCount = 8;
                _slashEffect.useWorldSpace = false;
                _slashEffect.material = new Material(Shader.Find("Sprites/Default"));
                _slashEffect.startColor = new Color(1f, 1f, 1f, 0.9f);
                _slashEffect.endColor = new Color(1f, 0.8f, 0.2f, 0f);
                _slashEffect.enabled = false;
            }
        }

        private void Update()
        {
            if (_attackCooldownTimer > 0f) _attackCooldownTimer -= Time.deltaTime;

            if (_comboStep > 0)
            {
                _comboTimer -= Time.deltaTime;
                if (_comboTimer <= 0f && !_isAttacking)
                {
                    _comboStep = 0;
                }
            }
        }

        public bool TryAttack()
        {
            if (_attackCooldownTimer > 0f || _isAttacking) return false;

            _comboStep++;
            if (_comboStep > 3) _comboStep = 1;

            _comboTimer = _comboWindow;
            _attackCooldownTimer = _attackCooldown;

            StartCoroutine(ExecuteAttackRoutine(_comboStep));
            return true;
        }

        private IEnumerator ExecuteAttackRoutine(int step)
        {
            _isAttacking = true;

            float damage = step == 1 ? _attack1Damage : (step == 2 ? _attack2Damage : _attack3Damage);
            Vector2 kb = step == 3 ? new Vector2(7.5f, 4.5f) : new Vector2(3.5f, 1.5f);
            float hitstop = step == 3 ? 0.1f : 0.06f;

            if (_hitbox != null)
            {
                _hitbox.Damage = damage;
                _hitbox.Knockback = kb;
                _hitbox.Activate(0.18f);
            }

            if (SimpleAudio.Instance != null)
            {
                SimpleAudio.Instance.PlaySlash();
            }

            // Visual slash sweep
            StartCoroutine(AnimateSlash(step));

            yield return new WaitForSeconds(0.18f);

            _isAttacking = false;
        }

        private IEnumerator AnimateSlash(int step)
        {
            if (_slashEffect == null) yield break;

            _slashEffect.enabled = true;
            float angleStart = step == 1 ? -45f : (step == 2 ? 60f : -70f);
            float angleEnd = step == 1 ? 45f : (step == 2 ? -40f : 80f);
            float radius = step == 3 ? 1.4f : 1.1f;

            // Color variation per combo step
            if (step == 1) _slashEffect.startColor = new Color(1f, 1f, 1f, 0.9f);
            else if (step == 2) _slashEffect.startColor = new Color(1f, 0.85f, 0.3f, 0.9f);
            else _slashEffect.startColor = new Color(1f, 0.35f, 0.1f, 1f); // heavy finisher glow

            float duration = 0.14f;
            float elapsed = 0f;

            while (elapsed < duration)
            {
                elapsed += Time.deltaTime;
                float t = elapsed / duration;
                float currAngle = Mathf.Lerp(angleStart, angleEnd, t);

                for (int i = 0; i < _slashEffect.positionCount; i++)
                {
                    float trailT = (float)i / (_slashEffect.positionCount - 1);
                    float a = Mathf.Lerp(currAngle, currAngle - (angleEnd - angleStart) * 0.4f, trailT) * Mathf.Deg2Rad;
                    Vector3 pos = new Vector3(Mathf.Cos(a) * radius, Mathf.Sin(a) * radius + 0.3f, 0f);
                    _slashEffect.SetPosition(i, pos);
                }
                yield return null;
            }

            _slashEffect.enabled = false;
        }
    }
}
