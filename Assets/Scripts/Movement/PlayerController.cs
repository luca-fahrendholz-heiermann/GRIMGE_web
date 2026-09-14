using UnityEngine;
using UnityEngine.InputSystem;
using GRIMGE.Prototype.Combat;
using GRIMGE.Prototype.Presentation;

namespace GRIMGE.Prototype.Movement
{
    [RequireComponent(typeof(CharacterMotor2D))]
    public class PlayerController : MonoBehaviour
    {
        private CharacterMotor2D _motor;
        private MeleeComboSystem _melee;
        private CharacterSkinManager _skinManager;

        private void Awake()
        {
            _motor = GetComponent<CharacterMotor2D>();
            _melee = GetComponent<MeleeComboSystem>();
            _skinManager = GetComponent<CharacterSkinManager>();
        }

        private void Update()
        {
            float horizontalInput = 0f;
            bool jumpPressed = false;
            bool jumpReleased = false;
            bool downHeld = false;
            bool attackPressed = false;
            bool dashPressed = false;

            // 1. Keyboard & Mouse Input
            if (Keyboard.current != null)
            {
                if (Keyboard.current.aKey.isPressed || Keyboard.current.leftArrowKey.isPressed) horizontalInput -= 1f;
                if (Keyboard.current.dKey.isPressed || Keyboard.current.rightArrowKey.isPressed) horizontalInput += 1f;

                if (Keyboard.current.wKey.wasPressedThisFrame || Keyboard.current.upArrowKey.wasPressedThisFrame || Keyboard.current.spaceKey.wasPressedThisFrame)
                {
                    jumpPressed = true;
                }
                if (Keyboard.current.wKey.wasReleasedThisFrame || Keyboard.current.upArrowKey.wasReleasedThisFrame || Keyboard.current.spaceKey.wasReleasedThisFrame)
                {
                    jumpReleased = true;
                }

                downHeld = Keyboard.current.sKey.isPressed || Keyboard.current.downArrowKey.isPressed;

                if (Keyboard.current.leftShiftKey.wasPressedThisFrame || Keyboard.current.cKey.wasPressedThisFrame)
                {
                    dashPressed = true;
                }

                // Skin switching (1-5)
                if (Keyboard.current.digit1Key.wasPressedThisFrame) _skinManager?.SetSkin(0);
                if (Keyboard.current.digit2Key.wasPressedThisFrame) _skinManager?.SetSkin(1);
                if (Keyboard.current.digit3Key.wasPressedThisFrame) _skinManager?.SetSkin(2);
                if (Keyboard.current.digit4Key.wasPressedThisFrame) _skinManager?.SetSkin(3);
                if (Keyboard.current.digit5Key.wasPressedThisFrame) _skinManager?.SetSkin(4);
            }

            if (Mouse.current != null)
            {
                if (Mouse.current.leftButton.wasPressedThisFrame && (Keyboard.current == null || !Keyboard.current.leftShiftKey.isPressed))
                {
                    attackPressed = true;
                }
            }

            // 2. Gamepad Input
            if (Gamepad.current != null)
            {
                Vector2 stick = Gamepad.current.leftStick.ReadValue();
                if (Mathf.Abs(stick.x) > 0.15f) horizontalInput = stick.x;

                if (Gamepad.current.buttonSouth.wasPressedThisFrame) jumpPressed = true;
                if (Gamepad.current.buttonSouth.wasReleasedThisFrame) jumpReleased = true;

                if (stick.y < -0.5f || Gamepad.current.dpad.down.isPressed) downHeld = true;

                if (Gamepad.current.buttonEast.wasPressedThisFrame || Gamepad.current.leftShoulder.wasPressedThisFrame) dashPressed = true;
                if (Gamepad.current.buttonWest.wasPressedThisFrame) attackPressed = true;
            }

            // Apply to motor
            _motor.Move(horizontalInput);

            if (jumpPressed) _motor.BufferJump();
            if (jumpReleased) _motor.CutJump();

            _motor.SetFastFall(downHeld);

            if (dashPressed)
            {
                Vector2 dashDir = new Vector2(horizontalInput != 0 ? Mathf.Sign(horizontalInput) : _motor.FacingDirection, 0f);
                _motor.TryDash(dashDir);
            }

            if (attackPressed && _melee != null)
            {
                _melee.TryAttack();
            }
        }
    }
}
