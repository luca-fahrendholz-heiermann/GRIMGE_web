using UnityEngine;

namespace GRIMGE.Prototype.Core
{
    /// <summary>
    /// Procedural sound synthesizer providing instant responsive audio without requiring external audio assets.
    /// </summary>
    public class SimpleAudio : MonoBehaviour
    {
        public static SimpleAudio Instance { get; private set; }

        private AudioSource _sfxSource;

        private void Awake()
        {
            if (Instance == null)
            {
                Instance = this;
                _sfxSource = gameObject.AddComponent<AudioSource>();
                _sfxSource.playOnAwake = false;
            }
            else
            {
                Destroy(gameObject);
            }
        }

        public void PlaySlash()
        {
            PlayProceduralSound(GenerateNoiseClip(0.08f, 1200, 300), 0.6f);
        }

        public void PlayHitImpact()
        {
            PlayProceduralSound(GenerateToneClip(0.12f, 180, 50, true), 0.8f);
        }

        public void PlayRuneSuccess()
        {
            PlayProceduralSound(GenerateHarmonicClip(0.25f, new float[] { 523.25f, 659.25f, 783.99f }), 0.7f); // C-E-G major
        }

        public void PlaySpellFire()
        {
            PlayProceduralSound(GenerateNoiseClip(0.2f, 800, 150), 0.75f);
        }

        public void PlaySpellExplosion()
        {
            PlayProceduralSound(GenerateNoiseClip(0.45f, 400, 40), 0.9f);
        }

        public void PlayDodge()
        {
            PlayProceduralSound(GenerateToneClip(0.15f, 300, 600, false), 0.5f);
        }

        public void PlayJump()
        {
            PlayProceduralSound(GenerateToneClip(0.1f, 220, 440, false), 0.4f);
        }

        private void PlayProceduralSound(AudioClip clip, float volume)
        {
            if (_sfxSource != null && clip != null)
            {
                _sfxSource.PlayOneShot(clip, volume);
            }
        }

        private AudioClip GenerateToneClip(float duration, float startFreq, float endFreq, bool addPunch)
        {
            int sampleRate = 44100;
            int samples = Mathf.CeilToInt(sampleRate * duration);
            float[] data = new float[samples];

            for (int i = 0; i < samples; i++)
            {
                float t = (float)i / samples;
                float currentFreq = Mathf.Lerp(startFreq, endFreq, t);
                float sample = Mathf.Sin(2 * Mathf.PI * currentFreq * ((float)i / sampleRate));

                // Decay envelope
                float envelope = 1f - t;
                if (addPunch && t < 0.1f)
                {
                    sample += (Random.value * 2f - 1f) * (1f - t / 0.1f) * 0.5f;
                }

                data[i] = Mathf.Clamp(sample * envelope, -1f, 1f);
            }

            AudioClip clip = AudioClip.Create("Tone_" + startFreq, samples, 1, sampleRate, false);
            clip.SetData(data, 0);
            return clip;
        }

        private AudioClip GenerateNoiseClip(float duration, float startFilter, float endFilter)
        {
            int sampleRate = 44100;
            int samples = Mathf.CeilToInt(sampleRate * duration);
            float[] data = new float[samples];
            float prev = 0f;

            for (int i = 0; i < samples; i++)
            {
                float t = (float)i / samples;
                float white = Random.value * 2f - 1f;
                float filter = Mathf.Lerp(0.8f, 0.2f, t);
                prev = Mathf.Lerp(prev, white, filter);

                float envelope = Mathf.Sin(t * Mathf.PI * 0.5f);
                if (t > 0.2f) envelope = 1f - ((t - 0.2f) / 0.8f);

                data[i] = Mathf.Clamp(prev * envelope, -1f, 1f);
            }

            AudioClip clip = AudioClip.Create("Noise_" + duration, samples, 1, sampleRate, false);
            clip.SetData(data, 0);
            return clip;
        }

        private AudioClip GenerateHarmonicClip(float duration, float[] freqs)
        {
            int sampleRate = 44100;
            int samples = Mathf.CeilToInt(sampleRate * duration);
            float[] data = new float[samples];

            for (int i = 0; i < samples; i++)
            {
                float t = (float)i / samples;
                float sample = 0f;
                for (int f = 0; f < freqs.Length; f++)
                {
                    sample += Mathf.Sin(2 * Mathf.PI * freqs[f] * ((float)i / sampleRate)) / freqs.Length;
                }

                float envelope = (1f - t) * Mathf.Min(1f, t * 20f);
                data[i] = sample * envelope;
            }

            AudioClip clip = AudioClip.Create("Harmonic_" + duration, samples, 1, sampleRate, false);
            clip.SetData(data, 0);
            return clip;
        }
    }
}
