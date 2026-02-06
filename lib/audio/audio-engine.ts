// ============================================================
// Audio Engine — manages AudioContext, mic, worklet, analyser
// ============================================================

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private pcmBuffers: Float32Array[] = [];
  private onAnalysis:
    | ((data: { rms: number; zcr: number; timestamp: number }) => void)
    | null = null;
  private isInitialized = false;

  /** Initialize the audio context, request mic, load worklet */
  async init(): Promise<void> {
    if (this.isInitialized) return;

    this.audioContext = new AudioContext();

    // Request microphone access
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: false, // We handle noise ourselves
        autoGainControl: false, // We need raw levels for biometrics
      },
    });

    // Load AudioWorklet
    await this.audioContext.audioWorklet.addModule(
      "/worklets/audio-processor.js",
    );

    // Create source from mic
    this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);

    // Create analyser for waveform visualization
    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = 256;
    this.analyserNode.smoothingTimeConstant = 0.8;

    // Create worklet node
    this.workletNode = new AudioWorkletNode(
      this.audioContext,
      "audio-biometric-processor",
    );

    // Route: mic → analyser → worklet
    this.sourceNode.connect(this.analyserNode);
    this.analyserNode.connect(this.workletNode);

    // Listen for messages from worklet
    this.workletNode.port.onmessage = (event) => {
      const { data } = event;
      if (data.type === "pcm") {
        this.pcmBuffers.push(new Float32Array(data.samples));
      } else if (data.type === "analysis") {
        this.onAnalysis?.(data);
      }
    };

    this.isInitialized = true;
  }

  /** Set callback for real-time biometric analysis frames */
  setAnalysisCallback(
    cb: (data: { rms: number; zcr: number; timestamp: number }) => void,
  ): void {
    this.onAnalysis = cb;
  }

  /** Get the AnalyserNode for waveform visualization */
  getAnalyser(): AnalyserNode | null {
    return this.analyserNode;
  }

  /** Start capturing PCM data */
  startCapture(): void {
    this.pcmBuffers = [];
    this.workletNode?.port.postMessage({ type: "start" });
  }

  /** Stop capturing and return accumulated PCM buffers */
  stopCapture(): Float32Array[] {
    this.workletNode?.port.postMessage({ type: "stop" });
    const buffers = this.pcmBuffers;
    this.pcmBuffers = [];
    return buffers;
  }

  /** Get the sample rate */
  getSampleRate(): number {
    return this.audioContext?.sampleRate ?? 16000;
  }

  /** Resume audio context (needed after user gesture) */
  async resume(): Promise<void> {
    if (this.audioContext?.state === "suspended") {
      await this.audioContext.resume();
    }
  }

  /** Cleanup */
  destroy(): void {
    this.workletNode?.disconnect();
    this.analyserNode?.disconnect();
    this.sourceNode?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.audioContext?.close();
    this.isInitialized = false;
  }
}
