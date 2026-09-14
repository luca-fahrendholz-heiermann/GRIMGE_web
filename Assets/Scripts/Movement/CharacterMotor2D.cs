using System.Collections;
using UnityEngine;
using GRIMGE.Prototype.Combat;
using GRIMGE.Prototype.Core;

namespace GRIMGE.Prototype.Movement
{
    [RequireComponent(typeof(Rigidbody2D), typeof(Collider2D))]
    public class CharacterMotor2D : MonoBehaviour, IDamageable
    {
        [Header("Movement")]
        [SerializeField] private float _moveSpeed = 9.5f;
        [SerializeField] private float _acceleration = 65f;
        [SerializeField] private float _deceleration = 50f;
        [SerializeField] private float _airAcceleration = 40f;
        [SerializeField] private float _airDeceleration = 20f;

        [Header("Jumping")]
        [SerializeField] private float _jumpForce = 16f;
        [SerializeField] private float _jumpCutMultiplier = 0.45f;
        [SerializeField] private float _fallGravityMultiplier = 1.6f;
        [SerializeField] private float _fastFallMultiplier = 2.4f;
        [SerializeField] private float _coyoteTime = 0.12f;
        [SerializeField] private float _jumpBufferTime = 0.12f;

        [Header("Dodge / Dash")]
        [SerializeField] private float _dashSpeed = 22f;
        [SerializeField] private float _dashDuration = 0.22f;
        [SerializeField] private float _dashCooldown = 0.6f;

        [Header("Combat Stats")]
        [SerializeField] private TeamId _team = TeamId.Player;
        [SerializeField] private float _maxHealth = 100f;
        private float _currentHealth;

        private Rigidbody2D _rb;
        private Collider2D _col;
        private Hurtbox2D _hurtbox;
        private SpriteRenderer _spriteRenderer;

        private float _coyoteTimer = 0f;
        private float _jumpBufferTimer = 0f;
        private float _dashCooldownTimer = 0f;
        private bool _isDashing = false;
        private bool _isGrounded = false;
        private bool _fastFalling = false;
        private float _facingDirection = 1f;

        // Knockback / Stun
        private bool _isStunned = false;
        private float _stunTimer = 0f;

        public TeamId Team => _team;
        public float CurrentHealth => _currentHealth;
        public float MaxHealth => _maxHealth;
        public bool IsGrounded => _isGrounded;
        public bool IsDashing => _isDashing;
        public float FacingDirection => _facingDirection;
        public Vector2 Velocity => _rb.linearVelocity;

        public event System.Action<float, float> OnHealthChanged;
        public event System.Action OnDied;

        private void Awake()
        {
            _rb = GetComponent<Rigidbody2D>();
            _col = GetComponent<Collider2D>();
            _hurtbox = GetComponentInChildren<Hurtbox2D>();
            _spriteRenderer = GetComponentInChildren<SpriteRenderer>();

            _currentHealth = _maxHealth;
            _rb.gravityScale = 3.5f;
            _rb.collisionDetectionMode = CollisionDetectionMode2D.Continuous;
            _rb.freezeRotation = true;
        }

        private void Update()
        {
            // Update timers
            if (_coyoteTimer > 0f) _coyoteTimer -= Time.deltaTime;
            if (_jumpBufferTimer > 0f) _jumpBufferTimer -= Time.deltaTime;
            if (_dashCooldownTimer > 0f) _dashCooldownTimer -= Time.deltaTime;

            if (_isStunned)
            {
                _stunTimer -= Time.deltaTime;
                if (_stunTimer <= 0f)
                {
                    _isStunned = false;
                }
            }
        }

        public void Move(float moveInput)
        {
            if (_isDashing || _isStunned) return;

            // Flip facing
            if (moveInput > 0.05f)
            {
                _facingDirection = 1f;
                transform.localScale = new Vector3(Mathf.Abs(transform.localScale.x), transform.localScale.y, transform.localScale.z);
            }
            else if (moveInput < -0.05f)
            {
                _facingDirection = -1f;
                transform.localScale = new Vector3(-Mathf.Abs(transform.localScale.x), transform.localScale.y, transform.localScale.z);
            }

            float targetSpeed = moveInput * _moveSpeed;
            float accel = _isGrounded 
                ? (Mathf.Abs(moveInput) > 0.01f ? _acceleration : _deceleration)
                : (Mathf.Abs(moveInput) > 0.01f ? _airAcceleration : _airDeceleration);

            float newVelX = Mathf.MoveTowards(_rb.linearVelocity.x, targetSpeed, accel * Time.deltaTime);
            _rb.linearVelocity = new Vector2(newVelX, _rb.linearVelocity.y);
        }

        public void BufferJump()
        {
            if (_isStunned || _isDashing) return;
            _jumpBufferTimer = _jumpBufferTime;
            CheckExecuteJump();
        }

        public void CutJump()
        {
            if (_rb.linearVelocity.y > 0f)
            {
                _rb.linearVelocity = new Vector2(_rb.linearVelocity.x, _rb.linearVelocity.y * _jumpCutMultiplier);
            }
        }

        public void SetFastFall(bool active)
        {
            _fastFalling = active && !_isGrounded && _rb.linearVelocity.y < 0f;
        }

        public bool TryDash(Vector2 direction)
        {
            if (_dashCooldownTimer > 0f || _isDashing || _isStunned) return false;

            if (direction.sqrMagnitude < 0.01f)
            {
                direction = new Vector2(_facingDirection, 0f);
            }
            direction.Normalize();

            StartCoroutine(DashCoroutine(direction));
            return true;
        }

        private IEnumerator DashCoroutine(Vector2 direction)
        {
            _isDashing = true;
            _dashCooldownTimer = _dashCooldown;

            if (_hurtbox != null) _hurtbox.SetInvincible(true);
            if (SimpleAudio.Instance != null) SimpleAudio.Instance.PlayDodge();

            float originalGravity = _rb.gravityScale;
            _rb.gravityScale = 0f;
            _rb.linearVelocity = direction * _dashSpeed;

            // Flash effect / ghost trail
            if (_spriteRenderer != null)
            {
                _spriteRenderer.color = new Color(1f, 1f, 1f, 0.5f);
            }

            float elapsed = 0f;
            while (elapsed < _dashDuration)
            {
                elapsed += Time.deltaTime;
                // Friction during dash
                _rb.linearVelocity = Vector2.Lerp(_rb.linearVelocity, direction * (_dashSpeed * 0.4f), elapsed / _dashDuration);
                yield return null;
            }

            _rb.gravityScale = originalGravity;
            if (_hurtbox != null) _hurtbox.SetInvincible(false);
            if (_spriteRenderer != null) _spriteRenderer.color = Color.white;

            _isDashing = false;
        }

        private void FixedUpdate()
        {
            CheckGrounded();

            if (_jumpBufferTimer > 0f)
            {
                CheckExecuteJump();
            }

            // Gravity adjustments
            if (!_isDashing && !_isGrounded)
            {
                if (_fastFalling)
                {
                    _rb.linearVelocity += Vector2.down * (9.81f * _fastFallMultiplier * Time.fixedDeltaTime);
                }
                else if (_rb.linearVelocity.y < 0f)
                {
                    _rb.linearVelocity += Vector2.down * (9.81f * (_fallGravityMultiplier - 1f) * Time.fixedDeltaTime);
                }
            }
        }

        private void CheckGrounded()
        {
            Vector2 origin = (Vector2)transform.position + Vector2.up * 0.1f;
            RaycastHit2D hit = Physics2D.BoxCast(origin, new Vector2(0.8f, 0.15f), 0f, Vector2.down, 0.25f);

            bool wasGrounded = _isGrounded;
            _isGrounded = hit.collider != null && hit.collider != _col && !hit.collider.isTrigger;

            if (_isGrounded)
            {
                _coyoteTimer = _coyoteTime;
                _fastFalling = false;
            }
        }

        private void CheckExecuteJump()
        {
            if (_coyoteTimer > 0f && !_isDashing)
            {
                _rb.linearVelocity = new Vector2(_rb.linearVelocity.x, _jumpForce);
                _coyoteTimer = 0f;
                _jumpBufferTimer = 0f;
                if (SimpleAudio.Instance != null) SimpleAudio.Instance.PlayJump();
            }
        }

        public bool TakeDamage(DamageData damage)
        {
            if (_isDashing || _currentHealth <= 0f) return false;

            _currentHealth -= damage.Amount;
            _currentHealth = Mathf.Max(0f, _currentHealth);
            OnHealthChanged?.Invoke(_currentHealth, _maxHealth);

            // Floating damage number
            UI.FloatingDamageNumber.Spawn(transform.position, damage.Amount, damage.Element);

            // Knockback & Stun
            _rb.linearVelocity = damage.Knockback;
            _isStunned = true;
            _stunTimer = Mathf.Clamp(damage.Amount * 0.015f, 0.1f, 0.35f);

            // Flash red
            StartCoroutine(FlashColor(Color.red, 0.12f));

            if (_currentHealth <= 0f)
            {
                Die();
            }

            return true;
        }

        private IEnumerator FlashColor(Color c, float duration)
        {
            if (_spriteRenderer != null)
            {
                Color orig = _spriteRenderer.color;
                _spriteRenderer.color = c;
                yield return new WaitForSeconds(duration);
                if (_spriteRenderer != null) _spriteRenderer.color = orig;
            }
        }

        public void Heal(float amount)
        {
            _currentHealth = Mathf.Min(_maxHealth, _currentHealth + amount);
            OnHealthChanged?.Invoke(_currentHealth, _maxHealth);
        }

        private void Die()
        {
            OnDied?.Invoke();
        }
    }
}
