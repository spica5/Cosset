import type { ChatCallMediaType, ChatCallSignalPayload } from 'src/types/chat-call';

import { fetchChatCallIceServers, signalChatCall } from 'src/actions/chat-call';

// ----------------------------------------------------------------------

type PeerCallbacks = {
  onRemoteStream?: (stream: MediaStream | null) => void;
  onLocalStream?: (stream: MediaStream | null) => void;
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  onError?: (error: Error) => void;
};

export class ChatWebRtcSession {
  private pc: RTCPeerConnection | null = null;

  private localStream: MediaStream | null = null;

  private remoteStream: MediaStream | null = null;

  private callId: string;

  private mediaType: ChatCallMediaType;

  private makingOffer = false;

  private ignoreOffer = false;

  private isPolite: boolean;

  private disposed = false;

  private callbacks: PeerCallbacks;

  constructor(input: {
    callId: string;
    mediaType: ChatCallMediaType;
    isPolite: boolean;
    callbacks?: PeerCallbacks;
  }) {
    this.callId = input.callId;
    this.mediaType = input.mediaType;
    this.isPolite = input.isPolite;
    this.callbacks = input.callbacks || {};
  }

  getLocalStream() {
    return this.localStream;
  }

  getRemoteStream() {
    return this.remoteStream;
  }

  async startLocalMedia() {
    if (this.localStream) {
      return this.localStream;
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: this.mediaType === 'video',
    });

    this.localStream = stream;
    this.callbacks.onLocalStream?.(stream);
    return stream;
  }

  async ensurePeerConnection() {
    if (this.pc) {
      return this.pc;
    }

    const iceServers = await fetchChatCallIceServers();
    const pc = new RTCPeerConnection({ iceServers });
    this.pc = pc;

    pc.onicecandidate = (event) => {
      if (!event.candidate || this.disposed) return;
      signalChatCall(this.callId, {
        type: 'ice',
        candidate: event.candidate.toJSON(),
      }).catch((error) => {
        this.callbacks.onError?.(error instanceof Error ? error : new Error(String(error)));
      });
    };

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      this.remoteStream = stream || null;
      this.callbacks.onRemoteStream?.(this.remoteStream);
    };

    pc.onconnectionstatechange = () => {
      this.callbacks.onConnectionStateChange?.(pc.connectionState);
    };

    const local = await this.startLocalMedia();
    local.getTracks().forEach((track) => {
      pc.addTrack(track, local);
    });

    return pc;
  }

  async createAndSendOffer() {
    const pc = await this.ensurePeerConnection();
    this.makingOffer = true;
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await signalChatCall(this.callId, {
        type: 'offer',
        sdp: pc.localDescription?.toJSON() || offer,
      });
    } finally {
      this.makingOffer = false;
    }
  }

  async handleSignal(payload: ChatCallSignalPayload) {
    if (this.disposed) return;
    const pc = await this.ensurePeerConnection();

    if (payload.type === 'offer' && payload.sdp) {
      const offerCollision = this.makingOffer || pc.signalingState !== 'stable';
      this.ignoreOffer = !this.isPolite && offerCollision;
      if (this.ignoreOffer) {
        return;
      }

      await pc.setRemoteDescription(payload.sdp);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await signalChatCall(this.callId, {
        type: 'answer',
        sdp: pc.localDescription?.toJSON() || answer,
      });
      return;
    }

    if (payload.type === 'answer' && payload.sdp) {
      await pc.setRemoteDescription(payload.sdp);
      return;
    }

    if (payload.type === 'ice' && payload.candidate) {
      try {
        await pc.addIceCandidate(payload.candidate);
      } catch (error) {
        if (!this.ignoreOffer) {
          throw error;
        }
      }
    }
  }

  setMuted(muted: boolean) {
    this.localStream?.getAudioTracks().forEach((track) => {
      track.enabled = !muted;
    });
  }

  setCameraEnabled(enabled: boolean) {
    this.localStream?.getVideoTracks().forEach((track) => {
      track.enabled = enabled;
    });
  }

  async dispose() {
    this.disposed = true;
    this.pc?.getSenders().forEach((sender) => {
      try {
        sender.track?.stop();
      } catch {
        // ignore
      }
    });
    this.localStream?.getTracks().forEach((track) => track.stop());
    this.remoteStream?.getTracks().forEach((track) => track.stop());
    this.localStream = null;
    this.remoteStream = null;
    this.callbacks.onLocalStream?.(null);
    this.callbacks.onRemoteStream?.(null);
    try {
      this.pc?.close();
    } catch {
      // ignore
    }
    this.pc = null;
  }
}
