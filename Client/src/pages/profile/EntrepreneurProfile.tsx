import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MessageCircle, Users, Calendar, Building2, MapPin, UserCircle, DollarSign, Send } from 'lucide-react';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { Entrepreneur } from '../../types';

export const EntrepreneurProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  const [entrepreneur, setEntrepreneur] = useState<Entrepreneur | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasRequestedCollaboration, setHasRequestedCollaboration] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.getUser(id)
      .then(({ user }) => setEntrepreneur(user))
      .catch(() => setEntrepreneur(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (currentUser?.role !== 'investor') return;
    api.getRequestsForInvestor().then(({ requests }) => {
      setHasRequestedCollaboration(requests.some((r: any) => r.entrepreneurId.id === id));
    });
  }, [currentUser, id]);

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  if (!entrepreneur || entrepreneur.role !== 'entrepreneur') {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">Entrepreneur not found</h2>
        <p className="text-gray-600 mt-2">The entrepreneur profile you're looking for doesn't exist or has been removed.</p>
        <Link to="/dashboard/investor">
          <Button variant="outline" className="mt-4">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const isCurrentUser = currentUser?.id === entrepreneur.id;
  const isInvestor = currentUser?.role === 'investor';

  const handleSendRequest = async () => {
    if (!isInvestor || !id || sending) return;
    setSending(true);
    try {
      await api.sendCollaborationRequest(
        id,
        `I'm interested in learning more about ${entrepreneur.startupName} and would like to explore potential investment opportunities.`
      );
      setHasRequestedCollaboration(true);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Profile header */}
      <Card>
        <CardBody className="sm:flex sm:items-start sm:justify-between p-6">
          <div className="sm:flex sm:space-x-6">
            <Avatar
              src={entrepreneur.avatarUrl}
              alt={entrepreneur.name}
              size="xl"
              status={entrepreneur.isOnline ? 'online' : 'offline'}
              className="mx-auto sm:mx-0"
            />

            <div className="mt-4 sm:mt-0 text-center sm:text-left">
              <h1 className="text-2xl font-bold text-gray-900">{entrepreneur.name}</h1>
              <p className="text-gray-600 flex items-center justify-center sm:justify-start mt-1">
                <Building2 size={16} className="mr-1" />
                Founder at {entrepreneur.startupName}
              </p>

              <div className="flex flex-wrap gap-2 justify-center sm:justify-start mt-3">
                {entrepreneur.industry && <Badge variant="primary">{entrepreneur.industry}</Badge>}
                {entrepreneur.location && (
                  <Badge variant="gray">
                    <MapPin size={14} className="mr-1" />
                    {entrepreneur.location}
                  </Badge>
                )}
                {entrepreneur.foundedYear && (
                  <Badge variant="accent">
                    <Calendar size={14} className="mr-1" />
                    Founded {entrepreneur.foundedYear}
                  </Badge>
                )}
                <Badge variant="secondary">
                  <Users size={14} className="mr-1" />
                  {entrepreneur.teamSize} team members
                </Badge>
              </div>
            </div>
          </div>

          <div className="mt-6 sm:mt-0 flex flex-col sm:flex-row gap-2 justify-center sm:justify-end">
            {!isCurrentUser && (
              <>
                <Link to={`/chat/${entrepreneur.id}`}>
                  <Button variant="outline" leftIcon={<MessageCircle size={18} />}>
                    Message
                  </Button>
                </Link>

                {isInvestor && (
                  <Button
                    leftIcon={<Send size={18} />}
                    disabled={hasRequestedCollaboration || sending}
                    onClick={handleSendRequest}
                  >
                    {hasRequestedCollaboration ? 'Request Sent' : 'Request Collaboration'}
                  </Button>
                )}
              </>
            )}

            {isCurrentUser && (
              <Button variant="outline" leftIcon={<UserCircle size={18} />}>
                Edit Profile
              </Button>
            )}
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content - left side */}
        <div className="lg:col-span-2 space-y-6">
          {/* About */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900">About</h2>
            </CardHeader>
            <CardBody>
              <p className="text-gray-700">{entrepreneur.bio || 'No bio provided yet.'}</p>
            </CardBody>
          </Card>

          {/* Startup Description */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900">Startup Overview</h2>
            </CardHeader>
            <CardBody>
              <div>
                <h3 className="text-md font-medium text-gray-900">Pitch Summary</h3>
                <p className="text-gray-700 mt-1">
                  {entrepreneur.pitchSummary || 'No pitch summary provided yet.'}
                </p>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Sidebar - right side */}
        <div className="space-y-6">
          {/* Funding Details */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900">Funding</h2>
            </CardHeader>
            <CardBody>
              <div>
                <span className="text-sm text-gray-500">Funding Needed</span>
                <div className="flex items-center mt-1">
                  <DollarSign size={18} className="text-accent-600 mr-1" />
                  <p className="text-lg font-semibold text-gray-900">{entrepreneur.fundingNeeded}</p>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Documents — placeholder until Document Chamber (Week 2) is built */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900">Documents</h2>
            </CardHeader>
            <CardBody>
              <p className="text-sm text-gray-500">Document sharing isn't built yet — coming in a later update.</p>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};
