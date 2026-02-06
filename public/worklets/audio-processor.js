// ============================================================
// AudioWorklet Processor — runs on audio thread
// Computes RMS and ZCR per frame and forwards to main thread
// ============================================================

class AudioBiometricProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._bufferSize = 2048;
    this._buffer = new Float32Array(this._bufferSize);
    this._bufferIndex = 0;
    this._isCapturing = true;

    this.port.onmessage = (event) => {
      if (event.data.type === "stop") {
        this._isCapturing = false;
      } else if (event.data.type === "start") {
        this._isCapturing = true;
      }
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  process(inputs, _outputs, _parameters) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const channelData = input[0];

    if (this._isCapturing) {
      // Forward raw PCM samples for WAV encoding
      this.port.postMessage({
        type: "pcm",
        samples: new Float32Array(channelData),
      });
    }

    // Accumulate into analysis buffer
    for (let i = 0; i < channelData.length; i++) {
      this._buffer[this._bufferIndex] = channelData[i];
      this._bufferIndex++;

      if (this._bufferIndex >= this._bufferSize) {
        this._analyzeBuffer();
        this._bufferIndex = 0;
      }
    }

    return true;
  }

  _analyzeBuffer() {
    const buffer = this._buffer;
    const len = this._bufferSize;

    // RMS (Root Mean Square) — measures volume
    let sumSquares = 0;
    for (let i = 0; i < len; i++) {
      sumSquares += buffer[i] * buffer[i];
    }
    const rms = Math.sqrt(sumSquares / len);

    // ZCR (Zero Crossing Rate) — measures frequency content
    let zeroCrossings = 0;
    for (let i = 1; i < len; i++) {
      if (
        (buffer[i] >= 0 && buffer[i - 1] < 0) ||
        (buffer[i] < 0 && buffer[i - 1] >= 0)
      ) {
        zeroCrossings++;
      }
    }
    const zcr = zeroCrossings / len;

    this.port.postMessage({
      type: "analysis",
      rms,
      zcr,
      timestamp: currentTime * 1000,
    });
  }
}

registerProcessor("audio-biometric-processor", AudioBiometricProcessor);
