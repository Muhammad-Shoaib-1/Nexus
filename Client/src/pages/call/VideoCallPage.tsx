import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Loader } from 'lucide-react';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { getSocket, disconnectSocket } from '../../lib/socket';

const ICE_SERVERS = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

type CallStatus = 'connecting' | 'ringing' | 'connected' | 'ended';

export const VideoCallPage: React.FC = () => {
  const { userId: otherUserId } = useParams<{ userId: string }>();
  const { user: currentUser, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  const [otherUser, setOtherUser] = useState<any>(null);
  const [status, setStatus] = useState<CallStatus>('connecting');
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [error, setError] = useState('');

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteSocketIdRef = useRef<string | null>(null);
  const roomIdRef = useRef<string>('');

  useEffect(() => {
    if (!currentUser || !otherUserId) return;

    let cancelled = false;

    api.getUser(otherUserId).then(({ user }) => {
      if (!cancelled) setOtherUser(user);
    });

    // Deterministic room ID: same for both participants regardless of who
    // navigates to /call first, since it's just the sorted pair of IDs.
    const roomId = ['call', ...[currentUser.id, otherUserId].sort()].join('_');
    roomIdRef.current = roomId;

    const socket = getSocket();
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    const sendOffer = async () => {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('signal', {
        targetSocketId: remoteSocketIdRef.current,
        data: { type: 'offer', sdp: offer }
      });
    };

    const handlePeerFound = (socketId: string, peerUserId: string) => {
      remoteSocketIdRef.current = socketId;
      setStatus('ringing');
      // Only the participant with the lexicographically smaller ID initiates
      // the offer, so both sides don't send competing offers.
      if (currentUser.id < peerUserId) {
        sendOffer();
      }
    };

    const init = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        pc.ontrack = (event) => {
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
          setStatus('connected');
        };

        pc.onicecandidate = (event) => {
          if (event.candidate && remoteSocketIdRef.current) {
            socket.emit('signal', {
              targetSocketId: remoteSocketIdRef.current,
              data: { type: 'ice-candidate', candidate: event.candidate }
            });
          }
        };

        socket.on('existing-peers', ({ peers }: { peers: { socketId: string; userId: string }[] }) => {
          if (peers.length > 0) handlePeerFound(peers[0].socketId, peers[0].userId);
        });

        socket.on('peer-joined', ({ socketId, userId }: { socketId: string; userId: string }) => {
          handlePeerFound(socketId, userId);
        });

        socket.on('signal', async ({ fromSocketId, data }: { fromSocketId: string; data: any }) => {
          if (!remoteSocketIdRef.current) remoteSocketIdRef.current = fromSocketId;

          if (data.type === 'offer') {
            await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('signal', { targetSocketId: fromSocketId, data: { type: 'answer', sdp: answer } });
          } else if (data.type === 'answer') {
            await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
          } else if (data.type === 'ice-candidate') {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
            } catch {
              // Benign — can happen if candidates arrive before remote description is set
            }
          }
        });

        socket.on('peer-left', () => {
          setStatus('ended');
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
        });

        socket.on('connect_error', (err: Error) => {
          setError(err.message || 'Failed to connect to call server');
        });

        socket.emit('join-call', { roomId });
      } catch (err) {
        setError('Could not access camera/microphone. Please grant permission and try again.');
      }
    };

    init();

    return () => {
      cancelled = true;
      socket.emit('leave-call', { roomId });
      socket.off('existing-peers');
      socket.off('peer-joined');
      socket.off('signal');
      socket.off('peer-left');
      socket.off('connect_error');
      pc.close();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [currentUser, otherUserId]);

  const toggleMute = () => {
    localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = muted));
    setMuted(!muted);
  };

  const toggleVideo = () => {
    localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = videoOff));
    setVideoOff(!videoOff);
  };

  const endCall = () => {
    disconnectSocket();
    navigate(otherUserId ? `/chat/${otherUserId}` : '/messages');
  };

  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!currentUser) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 flex flex-col z-50">
      {/* Remote video (main) */}
      <div className="flex-1 relative flex items-center justify-center">
        {status === 'connected' ? (
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
        ) : (
          <div className="text-center">
            <Avatar src={otherUser?.avatarUrl} alt={otherUser?.name || ''} size="xl" className="mx-auto mb-4" />
            <h2 className="text-white text-xl font-medium">{otherUser?.name || 'Connecting...'}</h2>
            <p className="text-gray-400 mt-2 flex items-center justify-center gap-2">
              {status === 'connecting' && (
                <>
                  <Loader size={16} className="animate-spin" /> Setting up call...
                </>
              )}
              {status === 'ringing' && 'Waiting for the other person to join...'}
              {status === 'ended' && 'Call ended — the other person left'}
            </p>
            {error && <p className="text-error-400 mt-2 text-sm">{error}</p>}
          </div>
        )}

        {/* Local video (picture-in-picture) */}
        <div className="absolute bottom-4 right-4 w-40 h-28 sm:w-48 sm:h-36 bg-gray-800 rounded-lg overflow-hidden border-2 border-gray-700 shadow-lg">
          <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          {videoOff && (
            <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
              <VideoOff size={20} className="text-gray-400" />
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gray-800 py-4 flex justify-center gap-4">
        <button
          onClick={toggleMute}
          className={`p-4 rounded-full transition-colors ${muted ? 'bg-error-600' : 'bg-gray-700 hover:bg-gray-600'}`}
          aria-label={muted ? 'Unmute' : 'Mute'}
        >
          {muted ? <MicOff size={20} className="text-white" /> : <Mic size={20} className="text-white" />}
        </button>

        <button
          onClick={toggleVideo}
          className={`p-4 rounded-full transition-colors ${videoOff ? 'bg-error-600' : 'bg-gray-700 hover:bg-gray-600'}`}
          aria-label={videoOff ? 'Turn camera on' : 'Turn camera off'}
        >
          {videoOff ? <VideoOff size={20} className="text-white" /> : <Video size={20} className="text-white" />}
        </button>

        <button
          onClick={endCall}
          className="p-4 rounded-full bg-error-600 hover:bg-error-700 transition-colors"
          aria-label="End call"
        >
          <PhoneOff size={20} className="text-white" />
        </button>
      </div>
    </div>
  );
};
