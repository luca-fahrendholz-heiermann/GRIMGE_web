using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.InputSystem;
using GRIMGE.Prototype.Core;

namespace GRIMGE.Prototype.Magic
{
    public class RuneDrawingManager : MonoBehaviour
    {
        public static RuneDrawingManager Instance { get; private set; }

        [Header("Drawing Configuration")]
        [SerializeField] private float _drawingWindowDuration = 2.5f;
        [SerializeField] private float _pointMinDistance = 0.15f;

        [Header("Visuals")]
        [SerializeField] private Material _trailMaterial;
        [SerializeField] private Color _activeTrailColor = new Color(0.3f, 0.8f, 1f, 0.9f);

        private readonly List<RuneStroke> _strokes = new List<RuneStroke>();
        private RuneStroke _currentStroke;
        private readonly List<LineRenderer> _activeLines = new List<LineRenderer>();

        private bool _isDrawingSessionActive = false;
        private bool _isCurrentStrokeActive = false;
        private float _sessionTimer = 0f;

        // Controller drawing position accumulator
        private Vector2 _stickVirtualCursor;

        public bool IsDrawingSessionActive => _isDrawingSessionActive;
        public float SessionTimerRemaining => Mathf.Max(0f, _drawingWindowDuration - _sessionTimer);
        public float SessionTimerRatio => Mathf.Clamp01(_sessionTimer / _drawingWindowDuration);

        public event Action<RuneType, float> OnRuneRecognized;
        public event Action OnDrawingStarted;
        public event Action OnDrawingFailed;

        private void Awake()
        {
            if (Instance == null) Instance = this;
            else Destroy(gameObject);

            if (_trailMaterial == null)
            {
                _trailMaterial = new Material(Shader.Find("Sprites/Default"));
            }
        }

        private void Update()
        {
            HandleInput();

            if (_isDrawingSessionActive)
            {
                _sessionTimer += Time.deltaTime;
                if (_sessionTimer >= _drawingWindowDuration)
                {
                    EndDrawingSession();
                }
            }
        }

        private void HandleInput()
        {
            bool wantsDraw = false;
            Vector2 inputPos = Vector2.zero;

            // 1. Mouse Check (Right-click drag or Left-click with Shift / Draw key)
            if (Mouse.current != null)
            {
                bool rightClick = Mouse.current.rightButton.isPressed;
                bool leftClickWithMod = Mouse.current.leftButton.isPressed && (Keyboard.current != null && (Keyboard.current.leftShiftKey.isPressed || Keyboard.current.spaceKey.isPressed));

                if (rightClick || leftClickWithMod)
                {
                    wantsDraw = true;
                    Vector2 screenPos = Mouse.current.position.ReadValue();
                    Camera cam = Camera.main;
                    if (cam != null)
                    {
                        inputPos = cam.ScreenToWorldPoint(new Vector3(screenPos.x, screenPos.y, 10f));
                    }
                }
            }

            // 2. Touch Check (Mobile)
            if (Touchscreen.current != null && Touchscreen.current.primaryTouch.press.isPressed)
            {
                wantsDraw = true;
                Vector2 screenPos = Touchscreen.current.primaryTouch.position.ReadValue();
                Camera cam = Camera.main;
                if (cam != null)
                {
                    inputPos = cam.ScreenToWorldPoint(new Vector3(screenPos.x, screenPos.y, 10f));
                }
            }

            // 3. Controller Check (Right Stick while holding Left or Right Trigger)
            if (Gamepad.current != null)
            {
                bool triggerPressed = Gamepad.current.leftTrigger.isPressed || Gamepad.current.rightTrigger.isPressed || Gamepad.current.rightShoulder.isPressed;
                Vector2 stick = Gamepad.current.rightStick.ReadValue();

                if (triggerPressed && stick.sqrMagnitude > 0.05f)
                {
                    wantsDraw = true;
                    if (!_isDrawingSessionActive)
                    {
                        Camera cam = Camera.main;
                        _stickVirtualCursor = cam != null ? (Vector2)cam.transform.position : Vector2.zero;
                    }
                    _stickVirtualCursor += stick * (12f * Time.deltaTime);
                    inputPos = _stickVirtualCursor;
                }
            }

            // Manage Stroke state
            if (wantsDraw)
            {
                if (!_isDrawingSessionActive)
                {
                    StartDrawingSession();
                }

                if (!_isCurrentStrokeActive)
                {
                    StartNewStroke(inputPos);
                }
                else
                {
                    ContinueCurrentStroke(inputPos);
                }
            }
            else
            {
                if (_isCurrentStrokeActive)
                {
                    FinishCurrentStroke();
                }
            }
        }

        public void StartDrawingSession()
        {
            _isDrawingSessionActive = true;
            _sessionTimer = 0f;
            _strokes.Clear();
            ClearVisualLines();
            OnDrawingStarted?.Invoke();
        }

        private void StartNewStroke(Vector2 worldPos)
        {
            _isCurrentStrokeActive = true;
            _currentStroke = new RuneStroke();
            _currentStroke.AddPoint(worldPos);
            _strokes.Add(_currentStroke);

            // Create visual LineRenderer
            GameObject lineObj = new GameObject("RuneStrokeLine_" + _strokes.Count);
            lineObj.transform.SetParent(transform);
            LineRenderer lr = lineObj.AddComponent<LineRenderer>();
            lr.material = _trailMaterial;
            lr.startColor = _activeTrailColor;
            lr.endColor = new Color(_activeTrailColor.r, _activeTrailColor.g, _activeTrailColor.b, 0.4f);
            lr.startWidth = 0.18f;
            lr.endWidth = 0.12f;
            lr.positionCount = 1;
            lr.SetPosition(0, worldPos);
            lr.sortingOrder = 50;

            _activeLines.Add(lr);
        }

        private void ContinueCurrentStroke(Vector2 worldPos)
        {
            if (_currentStroke == null || _activeLines.Count == 0) return;

            LineRenderer lr = _activeLines[_activeLines.Count - 1];
            Vector2 lastPt = _currentStroke.Points[_currentStroke.Points.Count - 1];

            if (Vector2.Distance(lastPt, worldPos) >= _pointMinDistance)
            {
                _currentStroke.AddPoint(worldPos);
                lr.positionCount = _currentStroke.Points.Count;
                lr.SetPosition(_currentStroke.Points.Count - 1, worldPos);
            }
        }

        private void FinishCurrentStroke()
        {
            _isCurrentStrokeActive = false;
            _currentStroke = null;
        }

        public void EndDrawingSession()
        {
            if (!_isDrawingSessionActive) return;

            if (_isCurrentStrokeActive)
            {
                FinishCurrentStroke();
            }

            _isDrawingSessionActive = false;

            // Recognize shape
            var (rune, confidence) = RuneRecognizer.Recognize(_strokes);

            if (rune != RuneType.None)
            {
                if (SimpleAudio.Instance != null) SimpleAudio.Instance.PlayRuneSuccess();
                OnRuneRecognized?.Invoke(rune, confidence);
            }
            else
            {
                OnDrawingFailed?.Invoke();
            }

            // Clean up lines after brief delay
            Invoke(nameof(ClearVisualLines), 0.35f);
        }

        private void ClearVisualLines()
        {
            foreach (var lr in _activeLines)
            {
                if (lr != null) Destroy(lr.gameObject);
            }
            _activeLines.Clear();
        }
    }
}
