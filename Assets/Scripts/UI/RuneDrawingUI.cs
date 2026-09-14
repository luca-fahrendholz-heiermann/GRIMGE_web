using UnityEngine;
using UnityEngine.UI;
using GRIMGE.Prototype.Magic;

namespace GRIMGE.Prototype.UI
{
    public class RuneDrawingUI : MonoBehaviour
    {
        [Header("UI Elements")]
        [SerializeField] private CanvasGroup _canvasGroup;
        [SerializeField] private Slider _timerSlider;
        [SerializeField] private Text _statusText;
        [SerializeField] private Text _guideText;

        private RuneDrawingManager _manager;

        private void Start()
        {
            _manager = RuneDrawingManager.Instance;
            if (_manager != null)
            {
                _manager.OnDrawingStarted += HandleDrawingStarted;
                _manager.OnRuneRecognized += HandleRuneRecognized;
                _manager.OnDrawingFailed += HandleDrawingFailed;
            }

            if (_canvasGroup != null) _canvasGroup.alpha = 0.8f;
            if (_guideText != null)
            {
                _guideText.text = "<b>RUNEN ZEICHNEN:</b> [Rechtsklick halten oder Shift+Linksklick]\n" +
                                  "▲ <b>Feuer</b> (Dreieck)  |  ~ <b>Wind</b> (Welle)  |  ■ <b>Erde</b> (Kasten)  |  ⚡ <b>Blitz</b> (Zickzack)";
            }
        }

        private void Update()
        {
            if (_manager != null && _manager.IsDrawingSessionActive)
            {
                if (_timerSlider != null)
                {
                    _timerSlider.gameObject.SetActive(true);
                    _timerSlider.value = 1f - _manager.SessionTimerRatio;
                }
                if (_statusText != null)
                {
                    _statusText.text = $"Zeichne Rune... ({_manager.SessionTimerRemaining:F1}s)";
                    _statusText.color = Color.yellow;
                }
            }
            else
            {
                if (_timerSlider != null) _timerSlider.gameObject.SetActive(false);
            }
        }

        private void HandleDrawingStarted()
        {
            if (_statusText != null)
            {
                _statusText.text = "Zeichne Rune...";
                _statusText.color = Color.cyan;
            }
        }

        private void HandleRuneRecognized(RuneType rune, float confidence)
        {
            if (_statusText != null)
            {
                _statusText.text = $"<b>RUNE ERKANNT: {rune.ToString().ToUpper()}!</b> ({Mathf.RoundToInt(confidence * 100)}%)";
                _statusText.color = Color.green;
            }
        }

        private void HandleDrawingFailed()
        {
            if (_statusText != null)
            {
                _statusText.text = "Rune nicht erkannt! Versuche es erneut.";
                _statusText.color = new Color(1f, 0.4f, 0.4f);
            }
        }
    }
}
