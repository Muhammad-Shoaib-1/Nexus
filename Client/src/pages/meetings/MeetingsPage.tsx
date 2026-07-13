import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Plus, X, Check, XCircle, Video } from 'lucide-react';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';

interface Meeting {
  id: string;
  organizer: any;
  participant: any;
  title: string;
  description: string;
  scheduledAt: string;
  durationMinutes: number;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
}

export const MeetingsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    participantId: '',
    title: '',
    description: '',
    date: '',
    time: '',
    durationMinutes: 30
  });

  const loadMeetings = () => {
    api.getMeetings().then(({ meetings }) => setMeetings(meetings)).finally(() => setLoading(false));
  };

  useEffect(() => { loadMeetings(); }, []);

  useEffect(() => {
    if (!user) return;
    const otherRole = user.role === 'investor' ? 'entrepreneur' : 'investor';
    api.listUsers(otherRole).then(({ users }) => setConnections(users));
  }, [user]);

  if (!user) return null;

  const now = new Date();
  const upcoming = meetings.filter(m => new Date(m.scheduledAt) >= now && m.status !== 'declined' && m.status !== 'cancelled');
  const past = meetings.filter(m => new Date(m.scheduledAt) < now || m.status === 'declined' || m.status === 'cancelled');

  const getOtherParty = (meeting: Meeting) =>
    meeting.organizer.id === user.id ? meeting.participant : meeting.organizer;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'accepted': return 'success';
      case 'declined': return 'error';
      case 'cancelled': return 'gray';
      default: return 'gray';
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.participantId || !form.title || !form.date || !form.time) return;

    setSubmitting(true);
    try {
      const scheduledAt = new Date(`${form.date}T${form.time}`).toISOString();
      const { meeting } = await api.createMeeting(
        form.participantId,
        form.title,
        form.description,
        scheduledAt,
        form.durationMinutes
      );
      setMeetings(prev => [...prev, meeting]);
      setShowForm(false);
      setForm({ participantId: '', title: '', description: '', date: '', time: '', durationMinutes: 30 });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const respondToMeeting = async (id: string, status: 'accepted' | 'declined') => {
    const { meeting } = await api.updateMeeting(id, { status });
    setMeetings(prev => prev.map(m => (m.id === id ? meeting : m)));
  };

  const cancelMeeting = async (id: string) => {
    const { meeting } = await api.updateMeeting(id, { status: 'cancelled' });
    setMeetings(prev => prev.map(m => (m.id === id ? meeting : m)));
  };

  const renderMeetingCard = (meeting: Meeting) => {
    const otherParty = getOtherParty(meeting);
    const isParticipant = meeting.participant.id === user.id;
    const scheduledDate = new Date(meeting.scheduledAt);

    return (
      <div key={meeting.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-3">
            <Avatar src={otherParty.avatarUrl} alt={otherParty.name} size="md" />
            <div>
              <h3 className="text-sm font-semibold text-gray-900">{meeting.title}</h3>
              <p className="text-sm text-gray-600">with {otherParty.name}</p>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Calendar size={14} /> {scheduledDate.toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={14} /> {scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({meeting.durationMinutes} min)
                </span>
              </div>
              {meeting.description && <p className="text-sm text-gray-600 mt-2">{meeting.description}</p>}
            </div>
          </div>

          <Badge variant={getStatusColor(meeting.status)}>{meeting.status}</Badge>
        </div>

        {meeting.status === 'pending' && isParticipant && (
          <div className="flex gap-2 mt-3 ml-14">
            <Button size="sm" variant="success" leftIcon={<Check size={14} />} onClick={() => respondToMeeting(meeting.id, 'accepted')}>
              Accept
            </Button>
            <Button size="sm" variant="outline" leftIcon={<XCircle size={14} />} onClick={() => respondToMeeting(meeting.id, 'declined')}>
              Decline
            </Button>
          </div>
        )}

        {(meeting.status === 'pending' || meeting.status === 'accepted') && !isParticipant && (
          <div className="flex gap-2 mt-3 ml-14">
            {meeting.status === 'accepted' && (
              <Button size="sm" leftIcon={<Video size={14} />} onClick={() => navigate(`/call/${otherParty.id}`)}>
                Join Video Call
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => cancelMeeting(meeting.id)}>
              Cancel Meeting
            </Button>
          </div>
        )}

        {meeting.status === 'accepted' && isParticipant && (
          <div className="flex gap-2 mt-3 ml-14">
            <Button size="sm" leftIcon={<Video size={14} />} onClick={() => navigate(`/call/${otherParty.id}`)}>
              Join Video Call
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meetings</h1>
          <p className="text-gray-600">Schedule and manage meetings with your connections</p>
        </div>
        <Button leftIcon={<Plus size={18} />} onClick={() => setShowForm(true)}>
          Schedule Meeting
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader className="flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">New Meeting</h2>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </CardHeader>
          <CardBody>
            {error && <div className="bg-error-50 text-error-700 text-sm px-4 py-3 rounded-md mb-4">{error}</div>}

            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {user.role === 'investor' ? 'Entrepreneur' : 'Investor'}
                </label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  value={form.participantId}
                  onChange={(e) => setForm({ ...form, participantId: e.target.value })}
                  required
                >
                  <option value="">Select...</option>
                  {connections.map(c => (
                    <option key={c.id} value={c.id}>{c.name}{c.startupName ? ` (${c.startupName})` : ''}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <Input
                  label="Meeting Title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Initial pitch discussion"
                  required
                  fullWidth
                />
              </div>

              <Input
                label="Date"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                required
              />

              <Input
                label="Time"
                type="time"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                required
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  value={form.durationMinutes}
                  onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>1 hour</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <textarea
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>

              <div className="md:col-span-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Scheduling...' : 'Send Meeting Request'}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <h2 className="text-lg font-medium text-gray-900">Upcoming</h2>
        </CardHeader>
        <CardBody>
          {loading ? (
            <p className="text-center py-8 text-gray-500">Loading...</p>
          ) : upcoming.length === 0 ? (
            <p className="text-center py-8 text-gray-500">No upcoming meetings.</p>
          ) : (
            <div className="space-y-3">{upcoming.map(renderMeetingCard)}</div>
          )}
        </CardBody>
      </Card>

      {past.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-medium text-gray-900">Past / Inactive</h2>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">{past.map(renderMeetingCard)}</div>
          </CardBody>
        </Card>
      )}
    </div>
  );
};
