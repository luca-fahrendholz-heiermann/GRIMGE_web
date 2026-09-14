using UnityEngine;

namespace GRIMGE.Prototype.Presentation
{
    public class CameraFollow2D : MonoBehaviour
    {
        [SerializeField] private Transform _target;
        [SerializeField] private float _smoothSpeed = 6f;
        [SerializeField] private Vector2 _offset = new Vector2(0f, 1.5f);
        [SerializeField] private float _lookAheadDist = 1.8f;
        [SerializeField] private Vector2 _clampX = new Vector2(-18f, 18f);

        private void Start()
        {
            if (_target == null)
            {
                var player = GameObject.FindGameObjectWithTag("Player");
                if (player != null) _target = player.transform;
            }
        }

        private void LateUpdate()
        {
            if (_target == null) return;

            float facing = Mathf.Sign(_target.localScale.x);
            Vector3 desiredPosition = new Vector3(_target.position.x + facing * _lookAheadDist + _offset.x, _target.position.y + _offset.y, -10f);
            desiredPosition.x = Mathf.Clamp(desiredPosition.x, _clampX.x, _clampX.y);

            transform.position = Vector3.Lerp(transform.position, desiredPosition, _smoothSpeed * Time.deltaTime);
        }
    }
}
