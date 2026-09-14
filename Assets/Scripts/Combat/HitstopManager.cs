using System.Collections;
using UnityEngine;

namespace GRIMGE.Prototype.Combat
{
    public class HitstopManager : MonoBehaviour
    {
        public static HitstopManager Instance { get; private set; }

        private bool _inHitstop = false;

        private void Awake()
        {
            if (Instance == null)
            {
                Instance = this;
            }
            else
            {
                Destroy(gameObject);
            }
        }

        public void TriggerHitstop(float duration)
        {
            if (duration <= 0f || _inHitstop) return;
            StartCoroutine(HitstopCoroutine(duration));
        }

        private IEnumerator HitstopCoroutine(float duration)
        {
            _inHitstop = true;
            float originalScale = Time.timeScale;
            Time.timeScale = 0.05f; // Slight slow-mo freeze rather than complete freeze so physics doesn't glitch

            yield return new WaitForSecondsRealtime(duration);

            Time.timeScale = originalScale;
            _inHitstop = false;
        }
    }
}
