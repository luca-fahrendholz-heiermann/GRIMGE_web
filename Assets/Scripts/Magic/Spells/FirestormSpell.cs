using System.Collections;
using UnityEngine;
using GRIMGE.Prototype.Combat;
using GRIMGE.Prototype.Core;

namespace GRIMGE.Prototype.Magic.Spells
{
    public class FirestormSpell : MonoBehaviour
    {
        [SerializeField] private float _duration = 3.5f;
        [SerializeField] private float _radius = 4.5f;
        [SerializeField] private float _pullStrength = 14f;
        [SerializeField] private float _tickDamage = 12f;
        [SerializeField] private float _tickInterval = 0.3f;
        [SerializeField] private TeamId _team = TeamId.Player;

        private float _elapsed = 0f;
        private float _nextTick = 0f;
        private Transform _visualVortex;

        public void Initialize(TeamId team, float totalDuration = 3.5f)
        {
            _team = team;
            _duration = totalDuration;

            if (SimpleAudio.Instance != null)
            {
                SimpleAudio.Instance.PlaySpellFire();
            }

            // Create procedural vortex visual
            GameObject v = new GameObject("VortexVisual");
            v.transform.SetParent(transform, false);
            _visualVortex = v.transform;

            for (int i = 0; i < 6; i++)
            {
                GameObject arm = new GameObject("Arm_" + i);
                arm.transform.SetParent(_visualVortex, false);
                LineRenderer lr = arm.AddComponent<LineRenderer>();
                lr.material = new Material(Shader.Find("Sprites/Default"));
                lr.startColor = new Color(1f, 0.4f, 0.05f, 0.85f);
                lr.endColor = new Color(0.2f, 0.9f, 0.8f, 0.1f);
                lr.startWidth = 0.25f;
                lr.endWidth = 0.05f;
                lr.positionCount = 12;
                lr.useWorldSpace = false;

                float armOffset = i * (Mathf.PI * 2f / 6f);
                for (int j = 0; j < 12; j++)
                {
                    float t = (float)j / 11f;
                    float r = t * _radius;
                    float angle = armOffset + t * 4f;
                    lr.SetPosition(j, new Vector3(Mathf.Cos(angle) * r, Mathf.Sin(angle) * r, 0f));
                }
            }

            Destroy(gameObject, _duration);
        }

        private void Update()
        {
            _elapsed += Time.deltaTime;

            // Rotate vortex visual
            if (_visualVortex != null)
            {
                _visualVortex.Rotate(0f, 0f, 400f * Time.deltaTime);
            }

            // Pull nearby physics objects
            Collider2D[] colliders = Physics2D.OverlapCircleAll(transform.position, _radius);
            foreach (var col in colliders)
            {
                if (col.isTrigger) continue;

                IDamageable dmg = col.GetComponentInParent<IDamageable>();
                if (dmg != null && dmg.Team != _team)
                {
                    Rigidbody2D rb = col.attachedRigidbody;
                    if (rb != null)
                    {
                        Vector2 toCenter = ((Vector2)transform.position - rb.position);
                        float dist = toCenter.magnitude;
                        if (dist > 0.1f)
                        {
                            Vector2 pullForce = toCenter.normalized * (_pullStrength * (1f - dist / _radius));
                            rb.linearVelocity += pullForce * Time.deltaTime;
                        }
                    }
                }
            }

            // Tick damage
            if (Time.time >= _nextTick)
            {
                _nextTick = Time.time + _tickInterval;
                DealAoEDamage();
            }
        }

        private void DealAoEDamage()
        {
            Collider2D[] colliders = Physics2D.OverlapCircleAll(transform.position, _radius);
            foreach (var col in colliders)
            {
                Hurtbox2D hb = col.GetComponent<Hurtbox2D>();
                if (hb != null && hb.Damageable != null && hb.Damageable.Team != _team)
                {
                    Vector2 pullDir = ((Vector2)transform.position - (Vector2)col.transform.position).normalized;
                    DamageData dmg = new DamageData(_tickDamage, pullDir * 1.5f, _team, ElementType.Fusion, 0.02f, gameObject);
                    hb.Damageable.TakeDamage(dmg);
                }
            }
        }
    }
}
